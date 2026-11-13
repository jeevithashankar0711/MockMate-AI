package main

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/ledongthuc/pdf"
)

type ATSResult struct {
	Score           int      `json:"score"`
	MatchedKeywords []string `json:"matchedKeywords"`
	MissingKeywords []string `json:"missingKeywords"`
	Suggestions     []string `json:"suggestions"`
	ResumeWordCount int      `json:"resumeWordCount"`
}

const maxResumeSize = 5 << 20

var (
	atsWhitespacePattern = regexp.MustCompile(`\s+`)
	atsWordPattern       = regexp.MustCompile(`[a-zA-Z0-9]+(?:[+#.][a-zA-Z0-9+#.]*)*`)
	atsJoinedCasePattern = regexp.MustCompile(`([a-z])([A-Z])`)
	atsPunctuation       = regexp.MustCompile(`[^a-z0-9+#.]+`)
)

// Keep this list focused on common terms. Add domain-specific terms
// as needed, but do not use dictionary splitting as a substitute for
// proper tokenization of the original resume and job description.
var atsDictionary = makeWordSet(`
ability able about above access achieve action active adapt advanced
agile algorithm algorithms analysis analytics android angular api
application applications architecture artificial assessment automation
available backend basic build building business career clean code cloud
collaboration collaborate communication company computer configuration
configure connect continuous contribute core create created creating
customer customers data database databases debug debugging developer
developers developing development design designed designing documentation
document digital effective efficient efficiently engineer engineering
enhance ensure experience experienced expertise feature features finance
framework frameworks frontend function git github go growth html implement
implementation improve improving include industry infrastructure innovation
integrate integration interface internship java javascript job knowledge
language languages leadership learn learning linux maintain maintaining
maintenance manage management marketing measure mobile model monitoring
mysql network nextjs node nodejs optimize optimization organize outcome
ownership performance perform planning platform platforms postgresql
presentation process processing product production professional programming
project projects python quality react reliable reliability report research
resolve responsive responsibility responsible result results review reviews
role roles scalable science scrum security service services skill skills
software solution solutions solve solving sql standard strategy support
system systems team teamwork technical technology test testing tests tools
training troubleshoot typescript understanding user users value version
web website websites workflow workflows working worked writing written
years fixing fixes issues issue requirements requirement participate
participated participating members member updated trends friendly based
latest deployment maintainability achievement achievements
`)

var atsStopWords = makeWordSet(`
a an and are as at be been being but by can could did do does
for from had has have he her hers him his i if in into is it its
may might must of on or our ours she should so such than that the
their them then there these they this those to was we were what
when where which while who will with would you your yours also
all any each more most other per use used using
responsible role roles involves ensure ensuring including various
within across latest stay new
`)

// Phrases are matched as phrases when present in the job description.
// They remain human-readable in the response.
var atsKnownPhrases = []string{
	"clean code",
	"code review",
	"code reviews",
	"continuous integration",
	"continuous deployment",
	"problem solving",
	"version control",
	"software development",
	"web development",
	"application development",
	"database management",
	"team work",
	"teamwork",
	"javascript",
	"java script",
	"machine learning",
	"artificial intelligence",
	"sql database",
	"front end",
	"back end",
	"full stack",
}

func makeWordSet(text string) map[string]bool {
	result := make(map[string]bool)
	for _, word := range strings.Fields(strings.ToLower(text)) {
		result[word] = true
	}
	return result
}

func atsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("X-Content-Type-Options", "nosniff")

	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		writeATSError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxResumeSize+(1<<20))

	if err := r.ParseMultipartForm(maxResumeSize); err != nil {
		writeATSError(w, http.StatusBadRequest, "Invalid form or file too large")
		return
	}
	if r.MultipartForm != nil {
		defer r.MultipartForm.RemoveAll()
	}

	file, header, err := r.FormFile("resume")
	if err != nil {
		writeATSError(w, http.StatusBadRequest, "Please upload a resume")
		return
	}
	defer file.Close()

	if header.Size <= 0 || header.Size > maxResumeSize {
		writeATSError(w, http.StatusBadRequest, "Resume must be non-empty and 5 MB or smaller")
		return
	}

	jobDescription := strings.TrimSpace(r.FormValue("jobDescription"))
	if utf8.RuneCountInString(jobDescription) < 30 {
		writeATSError(w, http.StatusBadRequest, "Please enter a job description with at least 30 characters")
		return
	}

	content, err := io.ReadAll(io.LimitReader(file, maxResumeSize+1))
	if err != nil {
		writeATSError(w, http.StatusBadRequest, "Could not read resume")
		return
	}
	if len(content) == 0 || len(content) > maxResumeSize {
		writeATSError(w, http.StatusBadRequest, "Resume must be non-empty and 5 MB or smaller")
		return
	}

	var resumeText string
	switch strings.ToLower(filepath.Ext(header.Filename)) {
	case ".txt":
		resumeText = string(content)
	case ".pdf":
		resumeText, err = extractPDFText(content)
	case ".docx":
		resumeText, err = extractDOCXText(content)
	default:
		writeATSError(w, http.StatusBadRequest, "Unsupported file type. Upload PDF, DOCX, or TXT.")
		return
	}
	if err != nil {
		writeATSError(w, http.StatusBadRequest, "Could not extract resume text. Scanned PDFs may require OCR.")
		return
	}

	resumeText = normalizeATSWhitespace(resumeText)
	jobDescription = normalizeATSWhitespace(jobDescription)

	resumeWords := tokenizeATS(resumeText)
	if len(resumeWords) == 0 {
		writeATSError(w, http.StatusBadRequest, "No readable resume text found.")
		return
	}

	resumeSet := makeWordSet(strings.Join(resumeWords, " "))
	jobKeywords := extractATSKeywords(jobDescription)
	if len(jobKeywords) == 0 {
		writeATSError(w, http.StatusBadRequest, "No usable job-description keywords found.")
		return
	}

	matched := make([]string, 0)
	missing := make([]string, 0)

	for _, keyword := range jobKeywords {
		if atsKeywordMatchesResume(keyword, resumeSet, resumeWords) {
			matched = append(matched, keyword)
		} else {
			missing = append(missing, keyword)
		}
	}

	score := 0
	if len(jobKeywords) > 0 {
		score = len(matched) * 100 / len(jobKeywords)
	}

	suggestions := buildATSSuggestions(missing, len(resumeWords), score)

	// This log prints counts only, not resume contents or personal data.
	fmt.Printf(
		"ATS analysis completed: resumeWords=%d jobKeywords=%d matched=%d missing=%d score=%d\n",
		len(resumeWords), len(jobKeywords), len(matched), len(missing), score,
	)

	_ = json.NewEncoder(w).Encode(ATSResult{
		Score:           score,
		MatchedKeywords: matched,
		MissingKeywords: missing,
		Suggestions:     suggestions,
		ResumeWordCount: len(resumeWords),
	})
}

func extractPDFText(content []byte) (string, error) {
	reader, err := pdf.NewReader(bytes.NewReader(content), int64(len(content)))
	if err != nil {
		return "", err
	}

	textReader, err := reader.GetPlainText()
	if err != nil {
		return "", err
	}

	text, err := io.ReadAll(textReader)
	if err != nil {
		return "", err
	}

	return normalizeATSWhitespace(string(text)), nil
}

func extractDOCXText(content []byte) (string, error) {
	archive, err := zip.NewReader(bytes.NewReader(content), int64(len(content)))
	if err != nil {
		return "", err
	}

	var result strings.Builder
	found := false

	for _, f := range archive.File {
		if f.Name != "word/document.xml" {
			continue
		}
		found = true

		file, err := f.Open()
		if err != nil {
			return "", err
		}

		decoder := xml.NewDecoder(file)
		for {
			token, tokenErr := decoder.Token()
			if tokenErr == io.EOF {
				break
			}
			if tokenErr != nil {
				_ = file.Close()
				return "", tokenErr
			}

			switch value := token.(type) {
			case xml.StartElement:
				switch value.Name.Local {
				case "t":
					var text string
					if err := decoder.DecodeElement(&text, &value); err != nil {
						_ = file.Close()
						return "", err
					}
					result.WriteString(text)
					result.WriteByte(' ')
				case "tab", "br", "p":
					result.WriteByte(' ')
				}
			}
		}

		if err := file.Close(); err != nil {
			return "", err
		}
		break
	}

	if !found {
		return "", fmt.Errorf("DOCX document.xml not found")
	}

	return normalizeATSWhitespace(result.String()), nil
}

// tokenizeATS extracts words from readable text. It does not blindly
// split every long word, because legitimate technical terms can be long.
func tokenizeATS(text string) []string {
	text = strings.ToLower(normalizeATSWhitespace(text))
	fields := atsWordPattern.FindAllString(text, -1)

	words := make([]string, 0, len(fields))
	for _, field := range fields {
		word := strings.Trim(field, ".+#")
		if word == "" || !containsLetterOrDigit(word) {
			continue
		}

		if utf8.RuneCountInString(word) < 2 || atsStopWords[word] {
			continue
		}

		words = append(words, word)
	}
	return words
}

// extractATSKeywords extracts unique meaningful words from the job description.
// Common stop words are removed. Multi-word phrases are included only when
// the job description contains them as contiguous phrases.
func extractATSKeywords(jobDescription string) []string {
	lower := strings.ToLower(jobDescription)
	words := tokenizeATS(lower)

	seen := make(map[string]bool)
	keywords := make([]string, 0, len(words))

	for _, word := range words {
		if !seen[word] {
			seen[word] = true
			keywords = append(keywords, word)
		}
	}

	normalizedJob := " " + normalizePhraseText(lower) + " "
	for _, phrase := range atsKnownPhrases {
		normalizedPhrase := " " + normalizePhraseText(phrase) + " "
		if strings.Contains(normalizedJob, normalizedPhrase) && !seen[phrase] {
			seen[phrase] = true
			keywords = append(keywords, phrase)
		}
	}

	sort.Strings(keywords)
	return keywords
}

func normalizePhraseText(text string) string {
	text = strings.ToLower(text)
	var result strings.Builder
	for _, r := range text {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == '+' || r == '#' {
			result.WriteRune(r)
		} else {
			result.WriteByte(' ')
		}
	}
	return strings.Join(strings.Fields(result.String()), " ")
}

func atsKeywordMatchesResume(keyword string, resumeSet map[string]bool, resumeWords []string) bool {
	if strings.Contains(keyword, " ") {
		normalizedResume := " " + normalizePhraseText(strings.Join(resumeWords, " ")) + " "
		phrase := " " + normalizePhraseText(keyword) + " "
		return strings.Contains(normalizedResume, phrase)
	}

	if resumeSet[keyword] {
		return true
	}

	// Match common inflections conservatively.
	for _, suffix := range []string{"s", "es", "ed", "ing"} {
		if strings.HasSuffix(keyword, suffix) && len(keyword) > len(suffix)+2 {
			base := strings.TrimSuffix(keyword, suffix)
			if resumeSet[base] {
				return true
			}
		}
	}
	return false
}

func buildATSSuggestions(missing []string, wordCount, score int) []string {
	var suggestions []string

	if len(missing) > 0 {
		suggestions = append(
			suggestions,
			"Review missing job-description terms and include only those that accurately reflect your skills and experience.",
		)
	}
	if wordCount < 100 {
		suggestions = append(
			suggestions,
			"Consider adding relevant projects, technical skills, responsibilities, and measurable achievements.",
		)
	}
	if score < 70 {
		suggestions = append(
			suggestions,
			"Tailor project and experience bullets to the job requirements. Avoid keyword stuffing.",
		)
	}
	if len(suggestions) == 0 {
		suggestions = append(
			suggestions,
			"Keep your resume readable and highlight relevant accomplishments.",
		)
	}
	return suggestions
}

func containsLetterOrDigit(s string) bool {
	for _, r := range s {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			return true
		}
	}
	return false
}

func normalizeATSWhitespace(text string) string {
	return atsWhitespacePattern.ReplaceAllString(strings.TrimSpace(text), " ")
}

func writeATSError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(status)

	_ = json.NewEncoder(w).Encode(map[string]string{
		"error": message,
	})
}
