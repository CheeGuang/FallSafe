package profile

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
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
	ResponseID   uint16    `json:"response_id"`                      // Unique ID for the response
	UserID       uint16    `json:"user_id"`                          // Associated user ID
	TotalScore   uint16    `json:"total_score"`                      // Total score across all questions
	ResponseDate time.Time `json:"response_date" db:"response_date"` // Date of response submission
}

func CallFESForGetUserFESResults(w http.ResponseWriter, r *http.Request) {
	// Extract userID from the request query parameters
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		log.Println("Error: user_id is missing in the request")
		http.Error(w, "user_id is required", http.StatusBadRequest)
		return
	}

	// Construct the API URL with user_id
	apiURL := fmt.Sprintf("http://localhost:5300/api/v1/fes/getFESResults?user_id=%s", userID)

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

// UserTestResult represents the test results of a user
type UserTestResult struct {
	ResultID         int       `json:"result_id"`
	UserID           int       `json:"user_id"`
	SessionID        int       `json:"session_id"`
	TestID           int       `json:"test_id"`
	TestName         string    `json:"test_name"`
	TimeTaken        float64   `json:"time_taken"`
	AbruptPercentage int       `json:"abrupt_percentage"`
	RiskLevel        string    `json:"risk_level"`
	TestDate         time.Time `json:"test_date"`
}

func CallSelfAssessmentForGetUserTestResults(w http.ResponseWriter, r *http.Request) {
	// Extract userID from the request query parameters
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		log.Println("Error: user_id is missing in the request")
		http.Error(w, "user_id is required", http.StatusBadRequest)
		return
	}

	// Construct the API URL with user_id
	apiURL := fmt.Sprintf("http://localhost:5250/api/v1/selfAssessment/getUserResults?user_id=%s", userID)

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
	var responses []UserTestResult
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
