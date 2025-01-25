package profile

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"

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
	UserID      int              `json:"user_id"`
	Name        string           `json:"name"`
	Email       string           `json:"email"`
	PhoneNumber string           `json:"phone_number"`
	Address     string           `json:"address"`
	Age         string           `json:"age"`
	TestResults []UserTestResult `json:"test_results,omitempty"`
}

// UserTestResult represents the test results of a user
type UserTestResult struct {
	ResultID int     `json:"result_id"`
	UserID   string  `json:"user_id"`
	TestID   string  `json:"test_id"`
	TestName string  `json:"test_name"`
	Score    float64 `json:"score"`
	TestDate string  `json:"test_date"`
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

	// Fetch test results for the user
	user.TestResults, err = GetUserTestResults(userID)
	if err != nil {
		log.Printf("Error fetching test results: %v", err)
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

// GetUserTestResults retrieves test results for a given userID
func GetUserTestResults(userID string) ([]UserTestResult, error) {
	rows, err := db.Query(`
		SELECT utr.result_id, utr.user_id, utr.test_id, t.test_name, utr.score, utr.test_date
		FROM FallSafe_SelfAssessmentDB.UserTestResult utr
		JOIN FallSafe_SelfAssessmentDB.Test t ON utr.test_id = t.test_id
		WHERE utr.user_id = ?`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []UserTestResult
	for rows.Next() {
		var result UserTestResult
		if err := rows.Scan(&result.ResultID, &result.UserID, &result.TestID, &result.TestName, &result.Score, &result.TestDate); err != nil {
			return nil, err
		}
		results = append(results, result)
	}
	return results, nil
}
