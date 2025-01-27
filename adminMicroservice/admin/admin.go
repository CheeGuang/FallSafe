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
func CallFESForUserResponseDetails(w http.ResponseWriter, r *http.Request){
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
