package main

import (
	"archive/zip"
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/joho/godotenv"
	pdfreader "github.com/ledongthuc/pdf"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

var db *sql.DB

func main() {
	_ = godotenv.Load(".env")

	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is missing from backend/.env")
	}

	var err error
	db, err = sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatal("Unable to open database:", err)
	}
	defer db.Close()

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(30 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		log.Fatal("Unable to connect to PostgreSQL:", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/register", registerHandler)
	mux.HandleFunc("/login", loginHandler)
	mux.HandleFunc("/interviews", interviewsHandler)
	mux.HandleFunc("/evaluate", evaluateHandler)
	mux.HandleFunc("/ats-check", atsHandler)
	mux.HandleFunc("/resume-extract", resumeExtractHandler)

	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		port = "8080"
	}

	origin := strings.TrimSpace(os.Getenv("FRONTEND_ORIGIN"))
	if origin == "" {
		origin = "http://localhost:3000"
	}

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           corsMiddleware(origin, mux),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       20 * time.Second,
		WriteTimeout:      240 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	log.Printf("MockMate AI backend listening on http://localhost:%s", port)
	log.Fatal(server.ListenAndServe())
}

// ------------------------------------------------------------
// CORS
// ------------------------------------------------------------

func corsMiddleware(origin string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestOrigin := r.Header.Get("Origin")

		if requestOrigin == origin {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Add("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// ------------------------------------------------------------
// JSON HELPERS
// ------------------------------------------------------------

func writeJSON(w http.ResponseWriter, status int, value interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)

	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("Unable to encode JSON response: %v", err)
	}
}

func decodeJSON(w http.ResponseWriter, r *http.Request, value interface{}) error {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	defer r.Body.Close()

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(value); err != nil {
		return err
	}

	var extra interface{}
	if err := decoder.Decode(&extra); err != io.EOF {
		return errors.New("request must contain exactly one JSON object")
	}

	return nil
}

func methodNotAllowed(w http.ResponseWriter, allowed string) {
	w.Header().Set("Allow", allowed)
	writeJSON(w, http.StatusMethodNotAllowed, map[string]string{
		"error": "Method not allowed.",
	})
}

// ------------------------------------------------------------
// REGISTER
// ------------------------------------------------------------

func registerHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w, "POST")
		return
	}

	var req struct {
		FullName string `json:"fullName"`
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := decodeJSON(w, r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Invalid registration request.",
		})
		return
	}

	fullName := strings.TrimSpace(req.FullName)
	if fullName == "" {
		fullName = strings.TrimSpace(req.Name)
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))

	if fullName == "" || len(fullName) > 150 {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Enter a valid full name.",
		})
		return
	}

	if !strings.Contains(email, "@") || len(email) > 254 {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Enter a valid email address.",
		})
		return
	}

	if len(req.Password) < 8 || len(req.Password) > 72 {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Password must contain 8 to 72 bytes.",
		})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "Unable to create account.",
		})
		return
	}

	var userID int
	err = db.QueryRowContext(
		r.Context(),
		`INSERT INTO users (full_name, email, password)
		 VALUES ($1, $2, $3) RETURNING id`,
		fullName, email, string(hash),
	).Scan(&userID)

	if err != nil {
		var pgErr *pq.Error
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			writeJSON(w, http.StatusConflict, map[string]string{
				"error": "An account with this email already exists.",
			})
			return
		}

		log.Printf("Registration database error: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "Unable to create account.",
		})
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"message": "Registration successful.",
		"user": map[string]interface{}{
			"id":       userID,
			"userId":   userID,
			"fullName": fullName,
			"name":     fullName,
			"email":    email,
		},
	})
}

// ------------------------------------------------------------
// LOGIN
// ------------------------------------------------------------

func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w, "POST")
		return
	}

	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := decodeJSON(w, r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Invalid login request.",
		})
		return
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" || req.Password == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Email and password are required.",
		})
		return
	}

	var userID int
	var fullName, storedHash string

	err := db.QueryRowContext(
		r.Context(),
		`SELECT id, full_name, password
		 FROM users WHERE LOWER(email) = $1`,
		email,
	).Scan(&userID, &fullName, &storedHash)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeJSON(w, http.StatusUnauthorized, map[string]string{
				"error": "Invalid email or password.",
			})
			return
		}

		log.Printf("Login database error: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "Unable to log in.",
		})
		return
	}

	if bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(req.Password)) != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{
			"error": "Invalid email or password.",
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Login successful.",
		"user": map[string]interface{}{
			"id":       userID,
			"userId":   userID,
			"fullName": fullName,
			"name":     fullName,
			"email":    email,
		},
	})
}

// ------------------------------------------------------------
// INTERVIEWS
// ------------------------------------------------------------

func interviewsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		getInterviewsHandler(w, r)
	case http.MethodPost:
		saveInterviewHandler(w, r)
	default:
		methodNotAllowed(w, "GET, POST")
	}
}

type InterviewRecord struct {
	ID            int             `json:"id"`
	JobRole       string          `json:"jobRole"`
	InterviewType string          `json:"interviewType"`
	Difficulty    string          `json:"difficulty"`
	Questions     json.RawMessage `json:"questions"`
	Answers       json.RawMessage `json:"answers"`
	Score         int             `json:"score"`
	CreatedAt     time.Time       `json:"createdAt"`
	Evaluation    json.RawMessage `json:"evaluation"`
}

func getInterviewsHandler(w http.ResponseWriter, r *http.Request) {
	userID, err := strconv.Atoi(r.URL.Query().Get("userId"))
	if err != nil || userID < 1 {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "A valid userId query parameter is required.",
		})
		return
	}

	rows, err := db.QueryContext(
		r.Context(),
		`SELECT id, job_role, interview_type, difficulty,
		        questions, answers, score, created_at, evaluation
		 FROM interviews WHERE user_id = $1
		 ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		log.Printf("Interview query error: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "Unable to load interviews.",
		})
		return
	}
	defer rows.Close()

	result := make([]InterviewRecord, 0)

	for rows.Next() {
		var item InterviewRecord
		var questions, answers, evaluation []byte
		var score sql.NullInt64

		if err := rows.Scan(
			&item.ID,
			&item.JobRole,
			&item.InterviewType,
			&item.Difficulty,
			&questions,
			&answers,
			&score,
			&item.CreatedAt,
			&evaluation,
		); err != nil {
			log.Printf("Interview scan error: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{
				"error": "Unable to read interview records.",
			})
			return
		}

		item.Questions = validJSONOrEmptyArray(questions)
		item.Answers = validJSONOrEmptyArray(answers)
		item.Evaluation = validJSONOrNull(evaluation)

		if score.Valid {
			item.Score = int(score.Int64)
		}

		result = append(result, item)
	}

	if err := rows.Err(); err != nil {
		log.Printf("Interview rows error: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "Unable to read interview records.",
		})
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func saveInterviewHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ID            int             `json:"id"`
		UserID        int             `json:"userId"`
		JobRole       string          `json:"jobRole"`
		InterviewType string          `json:"interviewType"`
		Difficulty    string          `json:"difficulty"`
		Questions     json.RawMessage `json:"questions"`
		Answers       json.RawMessage `json:"answers"`
		Score         int             `json:"score"`
		Evaluation    json.RawMessage `json:"evaluation"`
	}

	if err := decodeJSON(w, r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Invalid interview data.",
		})
		return
	}

	if req.UserID < 1 ||
		strings.TrimSpace(req.JobRole) == "" ||
		strings.TrimSpace(req.InterviewType) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "userId, jobRole and interviewType are required.",
		})
		return
	}

	if req.Score < 0 || req.Score > 100 {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Score must be between 0 and 100.",
		})
		return
	}

	if len(req.Questions) == 0 || !json.Valid(req.Questions) ||
		len(req.Answers) == 0 || !json.Valid(req.Answers) {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Questions and answers must be valid JSON.",
		})
		return
	}

	if len(req.Evaluation) == 0 {
		req.Evaluation = json.RawMessage("null")
	} else if !json.Valid(req.Evaluation) {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Evaluation must be valid JSON.",
		})
		return
	}

	jobRole := strings.TrimSpace(req.JobRole)
	interviewType := strings.TrimSpace(req.InterviewType)
	difficulty := strings.TrimSpace(req.Difficulty)

	if req.ID > 0 {
		var id int

		err := db.QueryRowContext(
			r.Context(),
			`UPDATE interviews
			 SET job_role=$1, interview_type=$2, difficulty=$3,
			     questions=$4::jsonb, answers=$5::jsonb,
			     score=$6, evaluation=$7::jsonb
			 WHERE id=$8 AND user_id=$9 RETURNING id`,
			jobRole,
			interviewType,
			difficulty,
			string(req.Questions),
			string(req.Answers),
			req.Score,
			string(req.Evaluation),
			req.ID,
			req.UserID,
		).Scan(&id)

		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeJSON(w, http.StatusNotFound, map[string]string{
					"error": "Interview not found for this user.",
				})
				return
			}

			log.Printf("Interview update error: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{
				"error": "Unable to update interview.",
			})
			return
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"message": "Interview updated successfully.",
			"id":      id,
		})
		return
	}

	var id int

	err := db.QueryRowContext(
		r.Context(),
		`INSERT INTO interviews
		 (user_id, job_role, interview_type, difficulty,
		  questions, answers, score, evaluation)
		 VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::jsonb)
		 RETURNING id`,
		req.UserID,
		jobRole,
		interviewType,
		difficulty,
		string(req.Questions),
		string(req.Answers),
		req.Score,
		string(req.Evaluation),
	).Scan(&id)

	if err != nil {
		log.Printf("Interview save error: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "Unable to save interview.",
		})
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"message": "Interview saved successfully.",
		"id":      id,
	})
}

func validJSONOrEmptyArray(value []byte) json.RawMessage {
	if len(value) == 0 || !json.Valid(value) ||
		strings.TrimSpace(string(value)) == "null" {
		return json.RawMessage("[]")
	}
	return json.RawMessage(value)
}

func validJSONOrNull(value []byte) json.RawMessage {
	if len(value) == 0 || !json.Valid(value) ||
		strings.TrimSpace(string(value)) == "null" {
		return json.RawMessage("null")
	}
	return json.RawMessage(value)
}

// ------------------------------------------------------------
// RESUME EXTRACTION
// maxResumeSize must be declared in ats.go or another Go file.
// ------------------------------------------------------------

type ResumeDetails struct {
	FileName   string   `json:"fileName"`
	WordCount  int      `json:"wordCount"`
	Skills     []string `json:"skills"`
	Education  []string `json:"education"`
	Experience []string `json:"experience"`
	Projects   []string `json:"projects"`
	Text       string   `json:"text"`
}

func resumeExtractHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w, "POST")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxResumeSize)

	if err := r.ParseMultipartForm(maxResumeSize); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Upload a valid resume smaller than 5 MB.",
		})
		return
	}

	if r.MultipartForm != nil {
		defer r.MultipartForm.RemoveAll()
	}

	file, header, err := r.FormFile("resume")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Please select a resume file.",
		})
		return
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, int64(maxResumeSize)+1))
	if err != nil || len(data) == 0 || len(data) > maxResumeSize {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Unable to read file, or file exceeds 5 MB.",
		})
		return
	}

	text, err := extractFileText(filepath.Ext(header.Filename), data)
	if err != nil {
		log.Printf("Resume extraction error: %v", err)
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Could not read resume. Try another PDF, DOCX or TXT file.",
		})
		return
	}

	text = cleanResumeText(text)
	if text == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "No readable text found. Scanned PDFs may need OCR.",
		})
		return
	}

	// Truncate at a valid UTF-8 boundary without splitting a character.
	const maxExtractedTextSize = 200000

	if len(text) > maxExtractedTextSize {
		text = text[:maxExtractedTextSize]

		for len(text) > 0 && !utf8.ValidString(text) {
			text = text[:len(text)-1]
		}
	}

	writeJSON(w, http.StatusOK, analyzeResumeText(header.Filename, text))
}

func extractFileText(extension string, data []byte) (string, error) {
	switch strings.ToLower(extension) {
	case ".txt":
		return strings.ToValidUTF8(string(data), " "), nil
	case ".docx":
		return extractDOCX(data)
	case ".pdf":
		return extractPDF(data)
	default:
		return "", fmt.Errorf("unsupported file type")
	}
}

func extractPDF(data []byte) (string, error) {
	reader, err := pdfreader.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "", err
	}

	var output strings.Builder

	pages := reader.NumPage()
	if pages > 100 {
		pages = 100
	}

	for i := 1; i <= pages; i++ {
		page := reader.Page(i)
		if page.V.IsNull() {
			continue
		}

		pageText, err := page.GetPlainText(nil)
		if err != nil {
			continue
		}

		output.WriteString(pageText)
		output.WriteString("\n")
	}

	return output.String(), nil
}

func extractDOCX(data []byte) (string, error) {
	archive, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "", err
	}

	for _, file := range archive.File {
		if file.Name != "word/document.xml" {
			continue
		}

		if file.UncompressedSize64 > uint64(maxResumeSize) {
			return "", fmt.Errorf("DOCX document is too large")
		}

		rc, err := file.Open()
		if err != nil {
			return "", err
		}

		content, readErr := io.ReadAll(rc)
		closeErr := rc.Close()

		if readErr != nil {
			return "", readErr
		}
		if closeErr != nil {
			return "", closeErr
		}
		if len(content) > maxResumeSize {
			return "", fmt.Errorf("DOCX document is too large")
		}

		decoder := xml.NewDecoder(bytes.NewReader(content))
		var output strings.Builder

		for {
			token, tokenErr := decoder.Token()
			if tokenErr == io.EOF {
				break
			}
			if tokenErr != nil {
				return "", tokenErr
			}

			switch value := token.(type) {
			case xml.CharData:
				output.Write([]byte(value))
			case xml.EndElement:
				switch value.Name.Local {
				case "p":
					output.WriteString("\n")
				case "tab":
					output.WriteString(" ")
				}
			}
		}

		return output.String(), nil
	}

	return "", fmt.Errorf("DOCX document.xml not found")
}

// ------------------------------------------------------------
// RESUME TEXT CLEANING
// ------------------------------------------------------------

var (
	spacePattern = regexp.MustCompile(`[ \t]+`)
	datePattern  = regexp.MustCompile(`(?i)^(present|current|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})[\s,./-]*$`)
)

func cleanResumeText(text string) string {
	text = strings.ToValidUTF8(text, " ")
	text = strings.ReplaceAll(text, "\r\n", "\n")
	text = strings.ReplaceAll(text, "\r", "\n")
	text = strings.ReplaceAll(text, "\u00a0", " ")
	text = strings.ReplaceAll(text, "\u200b", "")
	text = strings.ReplaceAll(text, "\ufeff", "")
	text = strings.ReplaceAll(text, "\u00ad", "")

	lines := strings.Split(text, "\n")
	cleaned := make([]string, 0, len(lines))

	for _, line := range lines {
		line = strings.TrimSpace(line)
		line = spacePattern.ReplaceAllString(line, " ")

		if line == "" {
			continue
		}

		// Ignore decorative-only lines but preserve actual content.
		if isOnlyDecoration(line) {
			continue
		}

		cleaned = append(cleaned, line)
	}

	return strings.Join(cleaned, "\n")
}

func isOnlyDecoration(line string) bool {
	for _, r := range strings.TrimSpace(line) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			return false
		}
	}
	return true
}

// ------------------------------------------------------------
// RESUME ANALYSIS
// ------------------------------------------------------------

func analyzeResumeText(fileName, text string) ResumeDetails {
	knownSkills := []string{
		"JavaScript", "TypeScript", "Python", "Java", "Golang",
		"Go", "C++", "C#", "React", "Next.js", "Node.js",
		"HTML", "CSS", "SQL", "PostgreSQL", "MySQL", "MongoDB",
		"Git", "GitHub", "Docker", "AWS", "Azure", "REST API",
		"Machine Learning", "Excel", "Communication", "Leadership",
		"Problem Solving", "C", "Figma", "Kubernetes",
		"Tailwind CSS", "Express.js", "FastAPI", "Django",
		"Flask", "Firebase", "Supabase", "Power BI", "Tableau",
		"Data Analysis", "Artificial Intelligence", "Deep Learning",
		"Bootstrap", "PHP", "Laravel", "Spring Boot",
		"Microsoft Office", "Agile", "Scrum",
	}

	lower := strings.ToLower(text)
	skills := make([]string, 0)

	for _, skill := range knownSkills {
		if containsSkill(lower, strings.ToLower(skill)) {
			// Avoid detecting single-letter skills from arbitrary prose.
			if skill == "C" &&
				!containsSkill(lower, "c programming") &&
				!containsSkill(lower, "language c") &&
				!containsSkill(lower, "c language") &&
				!containsSkill(lower, "c/c++") {
				continue
			}

			skills = append(skills, skill)
		}
	}

	sort.Strings(skills)

	educationHeadings := []string{
		"education", "educational background", "academic background",
		"academic qualifications", "educational qualifications",
		"qualification", "qualifications", "academics",
	}

	experienceHeadings := []string{
		"experience", "work experience", "professional experience",
		"work history", "employment history", "employment",
		"internship", "internships", "internship experience",
		"professional background", "career history",
	}

	projectHeadings := []string{
		"projects", "project", "personal projects", "academic projects",
		"key projects", "project experience", "projects undertaken",
	}

	return ResumeDetails{
		FileName:   filepath.Base(fileName),
		WordCount:  len(strings.Fields(text)),
		Skills:     skills,
		Education:  findSection(text, educationHeadings),
		Experience: findSection(text, experienceHeadings),
		Projects:   findSection(text, projectHeadings),
		Text:       text,
	}
}

func containsSkill(text, skill string) bool {
	pattern := `(^|[^a-z0-9+#.])` + regexp.QuoteMeta(skill) + `($|[^a-z0-9+#.])`
	matched, _ := regexp.MatchString(pattern, text)
	return matched
}

// ------------------------------------------------------------
// RESUME SECTION PARSER
// ------------------------------------------------------------

var sectionHeadings = []string{
	"education", "educational background", "academic background",
	"academic qualifications", "educational qualifications",
	"qualification", "qualifications", "academics",
	"experience", "work experience", "professional experience",
	"work history", "employment history", "employment",
	"internship", "internships", "internship experience",
	"professional background", "career history",
	"projects", "project", "personal projects", "academic projects",
	"key projects", "project experience", "projects undertaken",
	"skills", "technical skills", "key skills", "core skills",
	"areas of expertise", "certifications", "certificates",
	"summary", "professional summary", "profile", "profile summary",
	"objective", "career objective", "achievements", "accomplishments",
	"awards", "languages", "interests", "publications",
	"volunteer experience", "extracurricular activities",
	"contact", "contact information", "references",
}

func normalizeHeading(line string) string {
	line = strings.ToLower(strings.TrimSpace(line))
	line = strings.TrimLeft(line, "•·▪◦●*-–—| \t")
	line = regexp.MustCompile(`^\d+[\.)]\s*`).ReplaceAllString(line, "")
	line = strings.Trim(line, " \t:-–—|•·")
	line = spacePattern.ReplaceAllString(line, " ")
	return strings.TrimSpace(line)
}

func headingMatches(line string, headings []string) bool {
	normalized := normalizeHeading(line)

	for _, heading := range headings {
		if normalized == normalizeHeading(heading) {
			return true
		}
	}

	return false
}

// detectHeading recognizes headings followed by content on the same line.
// Example: "Projects: MockMate AI" becomes heading "Projects"
// and content "MockMate AI".
func detectHeading(line string) (string, string, bool) {
	trimmed := strings.TrimSpace(line)
	lower := strings.ToLower(trimmed)

	for _, heading := range sectionHeadings {
		h := strings.ToLower(heading)

		if lower == h {
			return heading, "", true
		}

		if !strings.HasPrefix(lower, h) || len(trimmed) <= len(h) {
			continue
		}

		// All supported heading names are ASCII, so len(h) is a valid
		// byte boundary for slicing the matching heading from trimmed.
		rest := trimmed[len(h):]

		if strings.HasPrefix(rest, ":") ||
			strings.HasPrefix(rest, "-") ||
			strings.HasPrefix(rest, "–") ||
			strings.HasPrefix(rest, "—") ||
			strings.HasPrefix(rest, "|") {

			content := strings.TrimSpace(rest)
			content = strings.TrimLeft(content, " :-–—|")

			return heading, content, true
		}
	}

	return "", "", false
}

func cleanSectionLine(line string) string {
	line = strings.TrimSpace(line)
	line = strings.TrimLeft(line, "•·▪◦●*-–— \t")
	line = strings.TrimSpace(line)
	line = spacePattern.ReplaceAllString(line, " ")
	return line
}

func isBulletOnly(line string) bool {
	line = strings.TrimSpace(line)
	return line == "" ||
		line == "•" ||
		line == "-" ||
		line == "–" ||
		line == "—" ||
		line == "*" ||
		line == "▪"
}

func isDateOnly(line string) bool {
	line = strings.TrimSpace(line)
	if line == "" {
		return false
	}

	if regexp.MustCompile(`^\d{4}\s*[-–—]\s*\d{4}$`).MatchString(line) {
		return true
	}

	if regexp.MustCompile(`^\d{4}$`).MatchString(line) {
		return true
	}

	return datePattern.MatchString(strings.ToLower(line))
}

func normalizeContentKey(line string) string {
	line = strings.ToLower(strings.TrimSpace(line))
	line = regexp.MustCompile(`[^\p{L}\p{N}]+`).ReplaceAllString(line, " ")
	return strings.TrimSpace(line)
}

func findSection(text string, headings []string) []string {
	lines := strings.Split(cleanResumeText(text), "\n")
	result := make([]string, 0)
	seen := make(map[string]bool)

	active := false

	for _, raw := range lines {
		raw = strings.TrimSpace(raw)
		if raw == "" || isBulletOnly(raw) {
			continue
		}

		foundHeading, inlineContent, isHeading := detectHeading(raw)
		if isHeading {
			if headingMatches(foundHeading, headings) {
				active = true

				if inlineContent != "" {
					addSectionLine(&result, seen, inlineContent)
				}
			} else if active {
				// A new section starts, so stop collecting this section.
				break
			}

			continue
		}

		if !active {
			continue
		}

		line := cleanSectionLine(raw)
		if line == "" || isOnlyDecoration(line) {
			continue
		}

		// Do not return standalone bullet markers or PDF separator fragments.
		if isBulletOnly(line) {
			continue
		}

		addSectionLine(&result, seen, line)

		if len(result) >= 30 {
			break
		}
	}

	return mergeSectionFragments(result)
}

func addSectionLine(result *[]string, seen map[string]bool, line string) {
	line = cleanSectionLine(line)
	if line == "" || isBulletOnly(line) || isOnlyDecoration(line) {
		return
	}

	key := normalizeContentKey(line)
	if key == "" || seen[key] {
		return
	}

	seen[key] = true
	*result = append(*result, line)
}

// mergeSectionFragments joins common PDF extraction fragments without
// deleting the original information. It is intentionally conservative.
func mergeSectionFragments(lines []string) []string {
	if len(lines) == 0 {
		return []string{}
	}

	result := make([]string, 0, len(lines))

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || isBulletOnly(line) {
			continue
		}

		if len(result) == 0 {
			result = append(result, line)
			continue
		}

		previous := result[len(result)-1]

		// A single dash, bullet or separator extracted by itself is discarded.
		if line == "-" || line == "–" || line == "—" || line == "•" {
			continue
		}

		// Join a split hyphenated phrase, e.g. "AI -" + "Based System".
		if strings.HasSuffix(previous, "-") ||
			strings.HasSuffix(previous, "–") ||
			strings.HasSuffix(previous, "—") {
			result[len(result)-1] = strings.TrimRight(previous, " –—") + "-" + line
			continue
		}

		// Join a continuation that starts with a lowercase letter.
		// Keep separate bullets and likely new records as separate lines.
		first := []rune(line)
		if len(first) > 0 &&
			unicode.IsLower(first[0]) &&
			!startsWithBullet(line) &&
			len(previous) < 180 {
			result[len(result)-1] = strings.TrimSpace(previous + " " + line)
			continue
		}

		result = append(result, line)
	}

	return result
}

func startsWithBullet(line string) bool {
	line = strings.TrimSpace(line)
	return strings.HasPrefix(line, "•") ||
		strings.HasPrefix(line, "▪") ||
		strings.HasPrefix(line, "◦") ||
		strings.HasPrefix(line, "*") ||
		strings.HasPrefix(line, "-")
}
