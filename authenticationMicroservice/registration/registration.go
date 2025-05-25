package registration

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"net/smtp"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

// User represents the structure of the data in the User table.
type User struct {
	ID               int    `json:"id"`
	Email            string `json:"email"`
	VerificationCode string `json:"verification_code"`
	CreatedAt        string `json:"created_at"`
}

// DB connection details
var db *sql.DB

func init() {
	// Load environment variables
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	// Initialize database connection
	log.Println("Initializing database connection...")
	db, err = sql.Open("mysql", os.Getenv("AUTH_DB_CONNECTION"))
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

// SendVerificationCode handles sending the verification code and storing it in the database.
func SendVerificationCode(w http.ResponseWriter, r *http.Request) {
	log.Println("Handling /send-verification request...")
	var user User

	// Parse the incoming request
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		log.Printf("Error parsing request body: %v", err)
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}
	log.Printf("Parsed request: %+v", user)

	// Generate a random 6-digit verification code
	rand.Seed(time.Now().UnixNano())
	verificationCode := fmt.Sprintf("%06d", rand.Intn(1000000))
	log.Printf("Generated verification code: %s", verificationCode)

	// Insert or update email and verification code in the database
	log.Println("Inserting or updating verification code in the database...")
	_, err = db.Exec(`
		INSERT INTO User (email, verification_code, created_at)
		VALUES (?, ?, ?)
		ON DUPLICATE KEY UPDATE
		verification_code = VALUES(verification_code), created_at = VALUES(created_at)
	`, user.Email, verificationCode, time.Now().Format("2006-01-02 15:04:05"))
	if err != nil {
		log.Printf("Error inserting or updating database: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	log.Println("Verification code inserted or updated in the database.")

	// Send the verification code via email
	log.Printf("Sending verification code to %s...", user.Email)
	err = sendEmail(user.Email, verificationCode)
	if err != nil {
		log.Printf("Error sending email: %v", err)
		http.Error(w, "Failed to send email", http.StatusInternalServerError)
		return
	}
	log.Println("Verification code sent successfully.")

	// Respond with success
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "Verification code sent successfully"}`))
}

// sendEmail sends an email containing the verification code.
func sendEmail(to, code string) error {
	// SMTP configuration from .env
	smtpHost := "smtp.gmail.com"
	smtpPort := "587"
	smtpUser := os.Getenv("SMTP_USER")
	smtpPassword := os.Getenv("SMTP_PASSWORD")

	// Email content (HTML)
	from := "FallSafe <" + smtpUser + ">"
	subject := "Your Verification Code"
	body := fmt.Sprintf(`

	<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Verification Code</title>
		<style>
			:root {
				--dark-blue: rgb(0, 51, 153);
				--dark-blue-hover: rgb(0, 41, 123);
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
			.code {
				font-size: 20px;
				font-weight: bold;
				color: var(--dark-blue);
				margin: 20px 0;
			}
			.footer {
				margin-top: 20px;
				font-size: 12px;
				color: var(--dark-blue-hover);
			}
		</style>
	</head>
	<body>
		<div class="container">
			<h1>FallSafe Verification Code</h1>
			<p>Dear User,</p>
			<p>Thank you for signing up with FallSafe! Please use the following verification code to complete your registration:</p>
			<div class="code">%s</div>
			<p>If you did not request this email, please ignore it.</p>
			<p>Best regards,</p>
			<p>The FallSafe Team</p>
			<div class="footer">
				<p>FallSafe &copy; 2024. All Rights Reserved.</p>
			</div>
		</div>
	</body>
	</html>
	`, code)

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
	log.Println("Email sent successfully.")
	return nil
}

// RegisterUser registers a new user.
func RegisterUser(w http.ResponseWriter, r *http.Request) {
	log.Println("Handling /register-user request...")

	var user struct {
		Email           string `json:"email"`
		VerificationCode string `json:"verification_code"`
		Name            string `json:"name"`
		Password        string `json:"password"`
		PhoneNumber     string `json:"phone_number"`
		Address         string `json:"address"`
		Age             uint8   `json:"age"`
	}

	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		log.Printf("Error parsing request body: %v", err)
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	log.Printf("Parsed request: %+v", user)

	// Verify the provided verification code and timestamp
	log.Printf("Checking verification code for email: %s", user.Email)
	var dbVerificationCode, dbCreatedAt string
	err := db.QueryRow("SELECT verification_code, created_at FROM User WHERE email = ?", user.Email).Scan(&dbVerificationCode, &dbCreatedAt)
	if err == sql.ErrNoRows {
		log.Printf("No verification code found for email: %s", user.Email)
		http.Error(w, "Invalid verification code or email", http.StatusUnauthorized)
		return
	} else if err != nil {
		log.Printf("Database error while fetching verification code for email %s: %v", user.Email, err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	
	log.Printf("Fetched verification code: %s, created at: %s for email: %s", dbVerificationCode, dbCreatedAt, user.Email)
	
	createdAt, err := time.Parse("2006-01-02 15:04:05", dbCreatedAt)
	if err != nil {
		log.Printf("Error parsing timestamp %s for email %s: %v", dbCreatedAt, user.Email, err)
		http.Error(w, "Verification code expired", http.StatusUnauthorized)
		return
	}
	
	if time.Since(createdAt) > 10*time.Minute {
		log.Printf("Verification code for email %s expired. Created at: %s", user.Email, dbCreatedAt)
		http.Error(w, "Verification code expired", http.StatusUnauthorized)
		return
	}
	
	if dbVerificationCode != user.VerificationCode {
		log.Printf("Verification code mismatch for email %s. Expected: %s, Provided: %s", user.Email, dbVerificationCode, user.VerificationCode)
		http.Error(w, "Invalid verification code", http.StatusUnauthorized)
		return
	}
	
	// Hash the password
	log.Printf("Hashing password for user: %s", user.Email)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Error hashing password for email %s: %v", user.Email, err)
		http.Error(w, "Password hashing failed", http.StatusInternalServerError)
		return
	}
	
	// Update user data in the database
	log.Printf("Updating user data for email: %s", user.Email)
	_, err = db.Exec(`UPDATE User SET password = ? WHERE email = ?`,
		string(hashedPassword), user.Email)
	if err != nil {
		log.Printf("Error updating user data for email %s: %v", user.Email, err)
		http.Error(w, "Failed to update user data", http.StatusInternalServerError)
		return
	}
	
	log.Printf("User data updated successfully for email: %s", user.Email)
	
	// Call the user microservice
	log.Printf("Calling user microservice for email: %s", user.Email)
	err = callUserMicroservice(user)
	if err != nil {
		log.Printf("Error calling user microservice for email %s: %v", user.Email, err)
		http.Error(w, "Microservice error", http.StatusInternalServerError)
		return
	}
	
	log.Printf("User registered successfully for email: %s", user.Email)
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "User registered successfully"}`))
}

// callUserMicroservice sends a request to userMicroservice to create a new user record
func callUserMicroservice(user struct {
	Email           string `json:"email"`
	VerificationCode string `json:"verification_code"`
	Name            string `json:"name"`
	Password        string `json:"password"`
	PhoneNumber     string `json:"phone_number"`
	Address         string `json:"address"`
	Age             uint8   `json:"age"`
}) error {
	userMicroserviceURL := "http://18.143.103.158:5100/api/v1/user/create"
	payload := map[string]interface{}{
		"email":            user.Email,
		"verification_code": user.VerificationCode,
		"name":             user.Name,
		"password":         user.Password,
		"phone_number":     user.PhoneNumber,
		"address":          user.Address,
		"age":              fmt.Sprintf("%d", user.Age), // Convert age to string
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("Failed to marshal payload: %v", err)
	}

	resp, err := http.Post(userMicroserviceURL, "application/json", bytes.NewBuffer(payloadBytes))
	if err != nil {
		return fmt.Errorf("Failed to send request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("Unexpected status code: %d", resp.StatusCode)
	}

	return nil
}