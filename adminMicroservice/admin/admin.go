package admin

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
	"net/smtp"
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
	dbConnection := os.Getenv("DB_CONNECTION")
	if dbConnection == "" {
		log.Fatalf("DB_CONNECTION environment variable is not set")
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

// Admin represents the structure of a admin record
type Admin struct {
	UserID int    `json:"user_id"`
	Name   string `json:"name" `
	Email  string `json:"email"`
	Role   string `json:"role"`
}

// GetAdminByID handles retrieving a admin record from the database by adminID
func GetAdminByID(w http.ResponseWriter, r *http.Request) {
	// Extract userID from query parameters
	adminID := r.URL.Query().Get("adminID")
	if adminID == "" {
		http.Error(w, "adminID is required", http.StatusBadRequest)
		return
	}

	// Prepare the query to fetch admin details by adminID
	var admin Admin
	err := db.QueryRow(`
		SELECT user_id, name, email, role
		FROM User
		WHERE user_id = ?`, adminID).Scan(
		&admin.UserID, &admin.Name, &admin.Email, &admin.Role,
	)
	if err == sql.ErrNoRows {
		http.Error(w, "Admin not found", http.StatusNotFound)
		return
	} else if err != nil {
		log.Printf("Error querying admin record: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Respond with the admin data as JSON
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(admin)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}

// Struct representing basic user information, for Dashboard
type UserNameAge struct {
	UserID int    `json:"user_id"`
	Name   string `json:"name"`
	Email  string `json:"email"`
	Age    string `json:"age"`
}

func CallUserMicroservice(w http.ResponseWriter, r *http.Request) {
	apiURL := "http://localhost:5100/api/v1/user/getAllUser"

	//Extract the Authorization header from the incoming request
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, "Authorization header missing", http.StatusUnauthorized)
		return
	}

	// Create an HTTP GET request
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		log.Printf("Error creating request: %v", err)
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	// Set the Authorization header
	req.Header.Set("Authorization", authHeader)

	// Perform the request to the downstream microservice
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error making request: %v", err)
		http.Error(w, "Failed to contact user microservice", http.StatusInternalServerError)
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
	var users []UserNameAge
	err = json.NewDecoder(resp.Body).Decode(&users)
	if err != nil {
		log.Printf("Error decoding response: %v", err)
		http.Error(w, "Failed to parse response from microservice", http.StatusInternalServerError)
		return
	}

	//Respond to the original client with the data
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	err = json.NewEncoder(w).Encode(users)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Failed to send response to client", http.StatusInternalServerError)
	}
}

// Struct representing the User Response attributes
type UserResponse struct {
	ResponseID   uint16    `json:"response_id"`                      // Unique ID for the response
	UserID       uint16    `json:"user_id"`                          // Associated user ID
	TotalScore   uint16    `json:"total_score"`                      // Total score across all questions
	ResponseDate time.Time `json:"response_date" db:"response_date"` // Date of response submission
}

func CallFESForUserResponse(w http.ResponseWriter, r *http.Request) {
	apiURL := "http://localhost:5300/api/v1/fes/getAllResponses"

	// Extract the Authorization header from the incoming request
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, "Authorization header missing", http.StatusUnauthorized)
		return
	}

	// Create an HTTP GET request
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		log.Printf("Error creating request: %v", err)
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	// Set the Authorization header
	req.Header.Set("Authorization", authHeader)

	// Perform the request to the downstream microservice
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error making request: %v", err)
		http.Error(w, "Failed to contact response microservice", http.StatusInternalServerError)
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
	var responses []UserResponse
	err = json.NewDecoder(resp.Body).Decode(&responses)
	if err != nil {
		log.Printf("Error decoding response: %v", err)
		http.Error(w, "Failed to parse response from microservice", http.StatusInternalServerError)
		return
	}

	// Respond to the original client with the data
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	err = json.NewEncoder(w).Encode(responses)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Failed to send response to client", http.StatusInternalServerError)
	}
}

// Struct for Individual Question Information
type UserResponseDetails struct {
	ResponseID    int `json:"response_id"`    // Unique ID of the response
	QuestionID    int `json:"question_id"`    // Associated question ID
	ResponseScore int `json:"response_score"` // User's response score
}

func CallFESForUserResponseDetails(w http.ResponseWriter, r *http.Request) {
	apiURL := "http://localhost:5300/api/v1/fes/getAllIndividualRes" // URL to call `getAllFESIndividualRes` endpoint

	// Extract the Authorization header from the incoming request
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, "Authorization header missing", http.StatusUnauthorized)
		return
	}

	// Create an HTTP GET request
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		log.Printf("Error creating request: %v", err)
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	// Set the Authorization header
	req.Header.Set("Authorization", authHeader)

	// Perform the request to the downstream microservice
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error making request: %v", err)
		http.Error(w, "Failed to contact response microservice", http.StatusInternalServerError)
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
	var responseDetails []UserResponseDetails
	err = json.NewDecoder(resp.Body).Decode(&responseDetails)
	if err != nil {
		log.Printf("Error decoding response: %v", err)
		http.Error(w, "Failed to parse response from microservice", http.StatusInternalServerError)
		return
	}

	// Respond to the original client with the data
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	err = json.NewEncoder(w).Encode(responseDetails)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Failed to send response to client", http.StatusInternalServerError)
	}
}

// Struct to hold user_id, avg score and session_date
type TestSessionUser struct {
	SessionID   int       `json:"session_id"`   // Unique ID for the session
	UserID      int       `json:"user_id"`      // Associated user ID
	SessionDate time.Time `json:"session_date"` // Date and time of the session
	TotalScore    int16     `json:"total_score"`    // Average score for the session
}

// Function to call selfAssessMicro, get all user with their dates and score
func CallFAForAllUserAvgScore(w http.ResponseWriter, r *http.Request) {
	apiURL := "http://localhost:5250/api/v1/selfAssessment/getAllAvgScore"

	// Extract the Authorization header from the incoming request
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, "Authorization header missing", http.StatusUnauthorized)
		return
	}

	// Create an HTTP GET request
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		log.Printf("Error creating request: %v", err)
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	// Set the Authorization header
	req.Header.Set("Authorization", authHeader)

	// Perform the request to the downstream microservice
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error making request: %v", err)
		http.Error(w, "Failed to contact Test Session microservice", http.StatusInternalServerError)
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
	var sessionResults []TestSessionUser
	err = json.NewDecoder(resp.Body).Decode(&sessionResults)
	if err != nil {
		log.Printf("Error decoding response: %v", err)
		http.Error(w, "Failed to parse response from microservice", http.StatusInternalServerError)
		return
	}

	// Respond to the original client with the data
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	err = json.NewEncoder(w).Encode(sessionResults)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Failed to send response to client", http.StatusInternalServerError)
	}
}

// Struct to represent avg_time with test name Result
type FATestWithAvgTime struct {
	ResultID    uint      `json:"result_id"`
	TestName    string    `json:"test_name"`
	UserID      uint      `json:"user_id"`
	TimeTaken   float64   `json:"time_taken"`
	SessionDate time.Time `json:"session_date"`
}

// Function to fetch the test name, as well as the userID and time taken FROM SELF ASSESS Microservice
func CallFAForAllUserTime(w http.ResponseWriter, r *http.Request) {
	apiURL := "http://localhost:5250/api/v1/selfAssessment/getAllAvgTime"

	// Extract the Authorization header from the incoming request
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, "Authorization header missing", http.StatusUnauthorized)
		return
	}

	// Create an HTTP GET request
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		log.Printf("Error creating request: %v", err)
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	// Set the Authorization header
	req.Header.Set("Authorization", authHeader)

	// Perform the request to the downstream microservice
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error making request: %v", err)
		http.Error(w, "Failed to contact Test Result microservice", http.StatusInternalServerError)
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
	var testResults []FATestWithAvgTime
	err = json.NewDecoder(resp.Body).Decode(&testResults)
	if err != nil {
		log.Printf("Error decoding response: %v", err)
		http.Error(w, "Failed to parse response from microservice", http.StatusInternalServerError)
		return
	}

	// Respond to the original client with the data
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	err = json.NewEncoder(w).Encode(testResults)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Failed to send response to client", http.StatusInternalServerError)
	}
}

// Struct to hold user_id and overall_risk_level
type UserRisk struct {
	UserID           int    `json:"user_id"`
	OverallRiskLevel string `json:"overall_risk_level"`
}

// Function to call selfAssessmentMicroservice and get all user risks
func CallFAForAllUserRisk(w http.ResponseWriter, r *http.Request) {
	apiURL := "http://localhost:5250/api/v1/selfAssessment/getAllUserRisk"

	// Extract the Authorization header from the incoming request
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, "Authorization header missing", http.StatusUnauthorized)
		return
	}

	// Create an HTTP GET request
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		log.Printf("Error creating request: %v", err)
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	// Set the Authorization header
	req.Header.Set("Authorization", authHeader)

	// Perform the request to the downstream microservice
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error making request: %v", err)
		http.Error(w, "Failed to contact risk assessment microservice", http.StatusInternalServerError)
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
	var riskResults []UserRisk
	err = json.NewDecoder(resp.Body).Decode(&riskResults)
	if err != nil {
		log.Printf("Error decoding response: %v", err)
		http.Error(w, "Failed to parse response from microservice", http.StatusInternalServerError)
		return
	}

	// Respond to the original client with the data
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	err = json.NewEncoder(w).Encode(riskResults)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Failed to send response to client", http.StatusInternalServerError)
	}
}

// Define a struct to hold the response data for last res day
type UserLastResDetails struct {
	UserID            int `json:"user_id"`
	DaysSinceResponse int `json:"days_since_last_fesres"`
}

func CallFESLastResDayForAllUsers(w http.ResponseWriter, r *http.Request) {
	apiURL := "http://localhost:5300/api/v1/fes/getAllFESLastResDay"

	// Extract the Authorization header from the incoming request
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, "Authorization header missing", http.StatusUnauthorized)
		return
	}

	// Create an HTTP GET request
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		log.Printf("Error creating request: %v", err)
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	// Set the Authorization header
	req.Header.Set("Authorization", authHeader)

	// Perform the request to the downstream microservice
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error making request: %v", err)
		http.Error(w, "Failed to contact FES last response microservice", http.StatusInternalServerError)
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
	var userLastResDetails []UserLastResDetails
	err = json.NewDecoder(resp.Body).Decode(&userLastResDetails)
	if err != nil {
		log.Printf("Error decoding response: %v", err)
		http.Error(w, "Failed to parse response from microservice", http.StatusInternalServerError)
		return
	}

	// Respond to the original client with the data
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	err = json.NewEncoder(w).Encode(userLastResDetails)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Failed to send response to client", http.StatusInternalServerError)
	}
}

// struct to hold the user ID and days since last response
type FallAssesLastRes struct {
	UserID            int `json:"user_id"`
	DaysSinceResponse int `json:"days_since_last_fares"`
}

// CallFallAssesLastResDayForAllUsers is the client code to fetch from the microservice
func CallFALastResDayForAllUsers(w http.ResponseWriter, r *http.Request) {
	apiURL := "http://localhost:5250/api/v1/selfAssessment/getAllLastResDay"

	// Extract the Authorization header from the incoming request
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, "Authorization header missing", http.StatusUnauthorized)
		return
	}

	// Create an HTTP GET request
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		log.Printf("Error creating request: %v", err)
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	// Set the Authorization header
	req.Header.Set("Authorization", authHeader)

	// Perform the request to the downstream microservice
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error making request: %v", err)
		http.Error(w, "Failed to contact fall assessment response microservice", http.StatusInternalServerError)
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
	var fallAssesLastResDetails []FallAssesLastRes
	err = json.NewDecoder(resp.Body).Decode(&fallAssesLastResDetails)
	if err != nil {
		log.Printf("Error decoding response: %v", err)
		http.Error(w, "Failed to parse response from microservice", http.StatusInternalServerError)
		return
	}

	// Respond to the original client with the data
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	err = json.NewEncoder(w).Encode(fallAssesLastResDetails)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Failed to send response to client", http.StatusInternalServerError)
	}
}

type EmailRequestReminder struct {
    Email string `json:"email"`
    Type  string `json:"type"`
    Days  string `json:"daysSinceLast"`
}


// SendEmail sends an email with reminder details
func SendEmail(to, emailType, days string) error {
	// SMTP configuration from .env
	smtpHost := "smtp.gmail.com"
	smtpPort := "587"
	smtpUser := os.Getenv("SMTP_USER")
	smtpPassword := os.Getenv("SMTP_PASSWORD")

	// Email content (HTML)
	from := "FallSafe <" + smtpUser + ">"
	subject := fmt.Sprintf("Reminder: %s Notification", emailType)
	body := fmt.Sprintf(`

	<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>%s Reminder</title>
		<style>
			:root {
				--dark-blue: rgb(0, 51, 153);
				--white: #ffffff;
				--shadow-colour: rgba(0, 0, 0, 0.1);
			}

			body {
				font-family: Arial, sans-serif;
				background-color: var(--dark-blue);
				color: var(--white);
				margin: 0;
				padding: 0;
			}
			.container {
				width: 100%%;
				max-width: 600px;
				margin: 0 auto;
				background: var(--white);
				padding: 20px;
				border-radius: 10px;
				box-shadow: 0 4px 6px var(--shadow-colour);
				color: var(--dark-blue);
			}
			h1 {
				color: var(--dark-blue);
			}
			.footer {
				margin-top: 20px;
				font-size: 12px;
				color: var(--dark-blue);
			}
		</style>
	</head>
	<body>
		<div class="container">
			<h1>%s Reminder</h1>
			<p>Dear User,</p>
			<p>This is a reminder for your <strong>%s</strong> self assessment.</p>
			<p>It has been <strong>%s days</strong> since your last assessment.</p>
			<p>Please login to FallSafe portal as soon as possible to maintain an active participation.</p>
			<p>Best regards,</p>
			<p>The FallSafe Team</p>
			<div class="footer">
				<p>FallSafe &copy; 2024. All Rights Reserved.</p>
			</div>
		</div>
	</body>
	</html>
	`, emailType, emailType, emailType, days)

	// Combine headers and body
	message := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n%s",
		from, to, subject, body)

	// Authentication
	auth := smtp.PlainAuth("", smtpUser, smtpPassword, smtpHost)

	// Send email
	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, smtpUser, []string{to}, []byte(message))
	if err != nil {
		log.Printf("Error sending email: %v", err)
		return err
	}
	log.Println("Email sent successfully to:", to)
	return nil
}

// SendEmailHandler processes incoming email requests
func SendEmailHandler(w http.ResponseWriter, r *http.Request) {
	var req EmailRequestReminder

	// Decode JSON request body
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Call sendEmail function
	err := SendEmail(req.Email, req.Type, req.Days)
	if err != nil {
		http.Error(w, "Failed to send email", http.StatusInternalServerError)
		return
	}

	// Send success response
	response := map[string]string{"message": "Email sent successfully"}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
