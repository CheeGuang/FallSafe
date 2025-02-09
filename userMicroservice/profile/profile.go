package profile

import (
	"bytes"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"net/smtp"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
)

var db *sql.DB

func init() {
	// Load environment variables
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	// Initialize database connection
	dbConnection := os.Getenv("USER_DB_CONNECTION")
	if dbConnection == "" {
		log.Fatalf("USER_DB_CONNECTION environment variable is not set")
	}

	log.Println("Initializing database connection...")
	db, err = sql.Open("mysql", dbConnection)
	if err != nil {
		log.Fatalf("Error connecting to database: %v", err)
	}

	// Test the database connection
	err = db.Ping()
	if err != nil {
		log.Fatalf("Database connection test failed: %v", err)
	}
	log.Println("Database connection successful.")
}

// CreateUserRequest represents the structure of the request to create a new user
type CreateUserRequest struct {
	Name        string `json:"name"`
	Email       string `json:"email"`
	PhoneNumber string `json:"phone_number"`
	Address     string `json:"address"`
	Age         string `json:"age"`
}

// CreateUser handles the creation of a new user record in the microservice database
func CreateUser(w http.ResponseWriter, r *http.Request) {
	var req CreateUserRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	// Insert the new user record into the microservice database
	_, err = db.Exec(`
		INSERT INTO User (name, email, phone_number, address, age)
		VALUES (?, ?, ?, ?, ?)`,
		req.Name, req.Email, req.PhoneNumber, req.Address, req.Age,
	)
	if err != nil {
		log.Printf("Error inserting user record: %v", err)
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("User created successfully"))
}

// User represents the structure of a user record
type User struct {
	UserID      int    `json:"user_id"`
	Name        string `json:"name"`
	Email       string `json:"email"`
	PhoneNumber string `json:"phone_number"`
	Address     string `json:"address"`
	Age         string `json:"age"`
}

// GetUserByID handles retrieving a user record from the database by userID
func GetUserByID(w http.ResponseWriter, r *http.Request) {
	// Extract userID from query parameters
	userID := r.URL.Query().Get("userID")
	if userID == "" {
		http.Error(w, "userID is required", http.StatusBadRequest)
		return
	}

	// Prepare the query to fetch user details by userID
	var user User
	err := db.QueryRow(`
		SELECT user_id, name, email, phone_number, address, age
		FROM User
		WHERE user_id = ?`, userID).Scan(
		&user.UserID, &user.Name, &user.Email, &user.PhoneNumber, &user.Address, &user.Age,
	)
	if err == sql.ErrNoRows {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	} else if err != nil {
		log.Printf("Error querying user record: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Respond with the user data as JSON
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(user)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}

// Struct for retriving only name and age with ID
type UserNameAge struct {
	UserID int    `json:"user_id"`
	Name   string `json:"name"`
	Email  string `json:"email"`
	Age    string `json:"age"`
}

// This function is used by admin in getting the whole list of elderly available
func GetAllUser(w http.ResponseWriter, r *http.Request) {
	var userList []UserNameAge
	//Query to fetch all users (id, name, email and age)
	rows, err := db.Query(`
		SELECT user_id, name, email, age
		FROM User`)
	if err != nil {
		log.Printf("Error querying users: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	//Iterate over the rows and scan the values into the users slice
	for rows.Next() {
		var user UserNameAge
		if err := rows.Scan(&user.UserID, &user.Name, &user.Email, &user.Age); err != nil {
			log.Printf("Error scanning user row: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		userList = append(userList, user)
	}

	// Check if there was an error while iterating the rows
	if err := rows.Err(); err != nil {
		log.Printf("Error iterating over rows: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Respond with the list of users as JSON
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(userList)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}

// Struct representing the User Response attributes
type UserResponse struct {
	ResponseID      uint16               `json:"response_id"`                      // Unique ID for the response
	UserID         uint16               `json:"user_id"`                          // Associated user ID
	TotalScore     uint16               `json:"total_score"`                      // Total score across all questions
	ResponseDate   time.Time            `json:"response_date" db:"response_date"` // Date of response submission
	ResponseDetails []UserResponseDetail `json:"response_details"`                // List of question responses
}

type UserResponseDetail struct {
	QuestionID    uint16 `json:"question_id"`    // ID of the question
	ResponseScore uint8  `json:"response_score"` // Score given by the user
}

func CallFESForActionableInsights(w http.ResponseWriter, r *http.Request) {
	// Extract userID from the request query parameters
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		log.Println("Error: user_id is missing in the request")
		http.Error(w, "user_id is required", http.StatusBadRequest)
		return
	}

	// Construct the API URL to fetch FES results
	apiURL := fmt.Sprintf("http://fallsefficacy-service.fallsafe-namespace.svc.cluster.local:5300/api/v1/fes/getFESResults?user_id=%s", userID)

	// Extract the Authorization header from the incoming request
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, "Authorization header missing", http.StatusUnauthorized)
		return
	}

	// Create an HTTP GET request to fetch FES results
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		log.Printf("Error creating request: %v", err)
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	// Set the Authorization header
	req.Header.Set("Authorization", authHeader)

	// Perform the request to the FES microservice
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error making request: %v", err)
		http.Error(w, "Failed to contact FES microservice", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// Check the status code of the response
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		http.Error(w, fmt.Sprintf("Microservice error: %s", string(body)), resp.StatusCode)
		return
	}

	// Parse the response body
	var fesResponses []UserResponse
	err = json.NewDecoder(resp.Body).Decode(&fesResponses)
	if err != nil {
		log.Printf("Error decoding response: %v", err)
		http.Error(w, "Failed to parse response from FES microservice", http.StatusInternalServerError)
		return
	}

	// Process FES results and generate a summary prompt
	latestFES := fesResponses[len(fesResponses)-1] // Get the most recent response
	summaryPrompt := fmt.Sprintf("Provide 5 actionable insights to reduce or maintain a good fall risk based on a total score of %d. Format the response exactly as: 1) ... <br> 2) ... <br> 3) ... <br> 4) ... <br> 5) ... Do not say 'certainly'. Use replace all ** with <strong> to bold key words and \\n with <br> for new lines. Be Concise", latestFES.TotalScore)
	// Construct the AI request body
	aiRequestBody, err := json.Marshal(map[string]string{
		"prompt": summaryPrompt,
	})
	if err != nil {
		log.Printf("Error encoding AI request: %v", err)
		http.Error(w, "Failed to create AI request payload", http.StatusInternalServerError)
		return
	}

	// Call the AI microservice for insights
	aiAPIURL := "http://openai-service.fallsafe-namespace.svc.cluster.local:5150/api/v1/generateResponse"
	aiReq, err := http.NewRequest("POST", aiAPIURL, bytes.NewBuffer(aiRequestBody))
	if err != nil {
		log.Printf("Error creating AI request: %v", err)
		http.Error(w, "Failed to create AI request", http.StatusInternalServerError)
		return
	}
	aiReq.Header.Set("Authorization", authHeader)
	aiReq.Header.Set("Content-Type", "application/json")

	// Execute the request to the AI service
	aiResp, err := client.Do(aiReq)
	if err != nil {
		log.Printf("Error contacting AI service: %v", err)
		http.Error(w, "Failed to contact AI service", http.StatusInternalServerError)
		return
	}
	defer aiResp.Body.Close()

	// Check AI response status
	if aiResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(aiResp.Body)
		http.Error(w, fmt.Sprintf("AI service error: %s", string(body)), aiResp.StatusCode)
		return
	}

	// Parse AI response
	var aiResponse map[string]interface{}
	err = json.NewDecoder(aiResp.Body).Decode(&aiResponse)
	if err != nil {
		log.Printf("Error decoding AI response: %v", err)
		http.Error(w, "Failed to parse AI response", http.StatusInternalServerError)
		return
	}

	// Prepare the combined response
	responseData := map[string]interface{}{
		"fes_results": fesResponses,
		"actionable_insights": aiResponse,
	}

	// Respond to the original client with both FES results and AI-generated insights
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(responseData)
}


// UserTestResult represents the test results of a user
type UserTestResult struct {
	ResultID         int       `json:"result_id"`
	TestID           int       `json:"test_id"`
	TestName         string    `json:"test_name"`
	TimeTaken        float64   `json:"time_taken"`
	AbruptPercentage int       `json:"abrupt_percentage"`
	RiskLevel        string    `json:"risk_level"`
	TestDate         time.Time `json:"test_date"`
}


func CallSelfAssessmentForInsights(w http.ResponseWriter, r *http.Request) {
	// Extract userID from the request query parameters
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		log.Println("Error: user_id is missing in the request")
		http.Error(w, "user_id is required", http.StatusBadRequest)
		return
	}

	// Construct the API URL to fetch Self-Assessment results
	apiURL := fmt.Sprintf("http://selfassessment-service.fallsafe-namespace.svc.cluster.local:5250/api/v1/selfAssessment/getUserResults?user_id=%s", userID)

	// Extract the Authorization header from the incoming request
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, "Authorization header missing", http.StatusUnauthorized)
		return
	}

	// Create an HTTP GET request to fetch Self-Assessment results
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		log.Printf("Error creating request: %v", err)
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	// Set the Authorization header
	req.Header.Set("Authorization", authHeader)

	// Perform the request to the Self-Assessment microservice
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error making request: %v", err)
		http.Error(w, "Failed to contact Self-Assessment microservice", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// Check the status code of the response
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		http.Error(w, fmt.Sprintf("Microservice error: %s", string(body)), resp.StatusCode)
		return
	}

	// Parse the response body
	var sessions []struct {
		SessionID    int       `json:"session_id"`
		UserID      int       `json:"user_id"`
		SessionDate time.Time `json:"session_date"`
		TotalScore  struct {
			Int64 int  `json:"Int64"`
			Valid bool `json:"Valid"`
		} `json:"total_score"`
		TestResults []UserTestResult `json:"test_results"`
	}

	err = json.NewDecoder(resp.Body).Decode(&sessions)
	if err != nil {
		log.Printf("Error decoding response: %v", err)
		http.Error(w, "Failed to parse response from Self-Assessment microservice", http.StatusInternalServerError)
		return
	}

	// Convert full response into JSON string
	fullResponse, err := json.Marshal(sessions)
	if err != nil {
		log.Printf("Error encoding full response: %v", err)
		http.Error(w, "Failed to encode full response", http.StatusInternalServerError)
		return
	}

	// Prepare AI summary prompt
	summaryPrompt := fmt.Sprintf(
		"Provide 5 actionable insights to reduce or maintain a good fall risk based on the self-assessment test '%s'. Format the response exactly as: 1) ... <br> 2) ... <br> 3) ... <br> 4) ... <br> 5) ... Do not say 'certainly'. Use replace all ** with <strong> to bold key words and \n with <br> for new lines. Be Very Concise",
		string(fullResponse),
	)

	// Construct the AI request body
	aiRequestBody, err := json.Marshal(map[string]string{
		"prompt": summaryPrompt,
	})
	if err != nil {
		log.Printf("Error encoding AI request: %v", err)
		http.Error(w, "Failed to create AI request payload", http.StatusInternalServerError)
		return
	}

	// Call the AI microservice for insights
	aiAPIURL := "http://openai-service.fallsafe-namespace.svc.cluster.local:5150/api/v1/generateResponse"
	aiReq, err := http.NewRequest("POST", aiAPIURL, bytes.NewBuffer(aiRequestBody))
	if err != nil {
		log.Printf("Error creating AI request: %v", err)
		http.Error(w, "Failed to create AI request", http.StatusInternalServerError)
		return
	}
	aiReq.Header.Set("Authorization", authHeader)
	aiReq.Header.Set("Content-Type", "application/json")

	// Execute the request to the AI service
	aiResp, err := client.Do(aiReq)
	if err != nil {
		log.Printf("Error contacting AI service: %v", err)
		http.Error(w, "Failed to contact AI service", http.StatusInternalServerError)
		return
	}
	defer aiResp.Body.Close()

	// Check AI response status
	if aiResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(aiResp.Body)
		http.Error(w, fmt.Sprintf("AI service error: %s", string(body)), aiResp.StatusCode)
		return
	}

	// Parse AI response
	var aiResponse map[string]interface{}
	err = json.NewDecoder(aiResp.Body).Decode(&aiResponse)
	if err != nil {
		log.Printf("Error decoding AI response: %v", err)
		http.Error(w, "Failed to parse AI response", http.StatusInternalServerError)
		return
	}

	// Prepare the combined response
	responseData := map[string]interface{}{
		"self_assessment_results": sessions,
		"actionable_insights":    aiResponse,
	}

	// Respond to the original client with both Self-Assessment results and AI-generated insights
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(responseData)
}


// ProcessVoucherEmail handles sending a voucher email when called.
func ProcessVoucherEmail(w http.ResponseWriter, r *http.Request) {
	log.Println("[DEBUG] Handling /process-voucher-email request...")

	// Parse the incoming request
	var request struct {
		Email        string `json:"email"`
		VoucherCount int    `json:"voucher_count"`
	}

	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		log.Printf("[ERROR] Error parsing request body: %v", err)
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}
	log.Printf("[DEBUG] Parsed request - Email: %s, VoucherCount: %d", request.Email, request.VoucherCount)

	// Validate input
	if request.Email == "" || request.VoucherCount <= 0 {
		log.Println("[ERROR] Invalid email or voucher count")
		http.Error(w, "Invalid email or voucher count", http.StatusBadRequest)
		return
	}

	// Send the voucher email
	log.Printf("[DEBUG] Sending voucher email to %s...", request.Email)
	err = deliverVoucherEmail(request.Email, request.VoucherCount)
	if err != nil {
		log.Printf("[ERROR] Failed to send voucher email: %v", err)
		http.Error(w, "Failed to send voucher email", http.StatusInternalServerError)
		return
	}
	log.Println("[DEBUG] Voucher email sent successfully.")

	// Respond with success
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "Voucher email sent successfully"}`))
}

// deliverVoucherEmail sends an email with a voucher image attachment.
func deliverVoucherEmail(to string, voucherCount int) error {
	// Hardcoded SMTP Configuration
	smtpHost := "smtp.gmail.com"
	smtpPort := "587"
	smtpUser := os.Getenv("SMTP_USER")
	smtpPassword := os.Getenv("SMTP_PASSWORD")

	// Validate SMTP configuration
	if smtpUser == "" || smtpPassword == "" {
		log.Println("[ERROR] SMTP credentials are missing")
		return fmt.Errorf("SMTP credentials are missing")
	}

	// Fetch and encode image
	imageURL := "https://fallsafe.s3.ap-southeast-1.amazonaws.com/misc/voucher.jpg"
	imageData, err := fetchImage(imageURL)
	if err != nil {
		log.Printf("[ERROR] Failed to fetch voucher image: %v", err)
		return err
	}
	log.Println("[DEBUG] Voucher image fetched successfully.")

	// Sender Name
	senderName := "FallSafe"
	fromEmail := fmt.Sprintf("%s <%s>", senderName, smtpUser)

	// Create email headers
	var emailBuffer bytes.Buffer
	writer := multipart.NewWriter(&emailBuffer)

	headers := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: Your NTUC Voucher\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=%s\r\n\r\n",
		fromEmail, to, writer.Boundary(),
	)
	emailBuffer.WriteString(headers)

	// HTML Email Body
	body := fmt.Sprintf(`--%s
Content-Type: text/html; charset=UTF-8
Content-Transfer-Encoding: 7bit

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Voucher Email</title>
    <style>
        body { font-family: Arial, sans-serif; }
        .container { padding: 20px; max-width: 600px; margin: auto; background-color: #f7f7f7; border-radius: 10px; }
        h1 { color: #003399; }
        .voucher { font-size: 18px; font-weight: bold; color: #003399; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Congratulations!</h1>
        <p>Dear User,</p>
        <p>You have received <span class="voucher">%d NTUC $10 voucher(s)</span>.</p>
        <p>Please find the attached voucher image for your reference.</p>
        <p>Best regards,</p>
        <p>The FallSafe Team</p>
    </div>
</body>
</html>

--%s
`, writer.Boundary(), voucherCount, writer.Boundary())
	emailBuffer.WriteString(body)

	// Image Attachment
	imagePartHeader := fmt.Sprintf("Content-Type: image/jpeg\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"voucher.jpg\"\r\n\r\n")
	emailBuffer.WriteString(imagePartHeader)
	emailBuffer.WriteString(base64.StdEncoding.EncodeToString(imageData))
	emailBuffer.WriteString(fmt.Sprintf("\r\n--%s--", writer.Boundary()))

	// Authentication
	auth := smtp.PlainAuth("", smtpUser, smtpPassword, smtpHost)

	// Send the email
	log.Println("[DEBUG] Sending email via SMTP...")
	err = smtp.SendMail(smtpHost+":"+smtpPort, auth, smtpUser, []string{to}, emailBuffer.Bytes())
	if err != nil {
		log.Printf("[ERROR] Failed to send email: %v", err)
		return err
	}

	log.Println("[DEBUG] Voucher email sent successfully.")
	return nil
}

// fetchImage retrieves the voucher image from the given URL and returns its byte data.
func fetchImage(imageURL string) ([]byte, error) {
	log.Printf("[DEBUG] Fetching voucher image from: %s", imageURL)
	resp, err := http.Get(imageURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch image: %v", err)
	}
	defer resp.Body.Close()

	imageData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read image data: %v", err)
	}

	log.Println("[DEBUG] Image fetched and read successfully.")
	return imageData, nil
}