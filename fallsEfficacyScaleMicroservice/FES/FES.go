package FES

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"

	//"fmt" -- temporary comment for testing
	//"io/ioutil"
	//"bytes"
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

type Question struct {
	ID   int    `json:"id"`
	Text string `json:"text"`
}

func GetQuestions(w http.ResponseWriter, r *http.Request) {
	//fetch qns from db
	rows, err := db.Query(`
		SELECT question_id, question_text 
		FROM FallsEfficacyScale
	`)
	if err != nil {
		log.Printf("Error fetching questions: %v", err)
		http.Error(w, "Failed to fetch questions", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var questions []Question
	for rows.Next() {
		var q Question
		if err := rows.Scan(&q.ID, &q.Text); err != nil {
			log.Printf("Error scanning question: %v", err)
			http.Error(w, "Failed to parse questions", http.StatusInternalServerError)
			return
		}
		questions = append(questions, q) // Append each question to the slice
	}
	if err := rows.Err(); err != nil {
		log.Printf("Error iterating over rows: %v", err)
		http.Error(w, "Failed to fetch questions", http.StatusInternalServerError)
		return
	}

	//respond with questions as JSON
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(questions)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}

func SaveResponse(w http.ResponseWriter, r *http.Request) {
	//decode request body
	var requestData struct {
		UserID    int `json:"user_id"`
		Responses []struct {
			QuestionID int `json:"question_id"`
			Score      int `json:"score"`
		} `json:"responses"`
	}
	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	//begin a transaction
	tx, err := db.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		http.Error(w, "Failed to save response", http.StatusInternalServerError)
		return
	}

	//calculate total score
	var totalScore int
	for _, response := range requestData.Responses {
		totalScore += int(response.Score)
	}

	//insert data into UserResponse table
	result, err := tx.Exec(`
		INSERT INTO UserResponse (user_id, total_score)
		VALUES (?, ?)`, requestData.UserID, totalScore)
	if err != nil {
		log.Printf("Error inserting into UserResponse: %v", err)
		tx.Rollback()
		http.Error(w, "Failed to save response", http.StatusInternalServerError)
		return
	}

	//insert details into UserResponseDetails table
	responseID, _ := result.LastInsertId()
	for _, response := range requestData.Responses {
		_, err := tx.Exec(`
			INSERT INTO UserResponseDetails (response_id, question_id, response_score)
			VALUES (?, ?, ?)`, responseID, response.QuestionID, response.Score)
		if err != nil {
			log.Printf("Error inserting into UserResponseDetails: %v", err)
			tx.Rollback()
			http.Error(w, "Failed to save response details", http.StatusInternalServerError)
			return
		}
	}

	//commit the transaction
	err = tx.Commit()
	if err != nil {
		log.Printf("Error committing transaction: %v", err)
		http.Error(w, "Failed to save response", http.StatusInternalServerError)
		return
	}

	//success message
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, err = w.Write([]byte(`{"message":"Response saved successfully"}`))
	if err != nil {
		log.Printf("Error writing success response: %v", err)
	}
}

// Struct representing the User Response for FES
type UserResponse struct {
	ResponseID   uint16    `json:"response_id"`                      // Unique ID for the response
	UserID       uint16    `json:"user_id"`                          // Associated user ID
	TotalScore   uint16    `json:"total_score"`                      // Total score across all questions
	ResponseDate time.Time `json:"response_date" db:"response_date"` // Date of response submission
}

// Function for retrieving the whole list of User Responses
func GetAllUserResponse(w http.ResponseWriter, r *http.Request) {
	// Define a slice to store the list of user responses
	var responseList []UserResponse

	// Query to fetch all user responses
	rows, err := db.Query(`
		SELECT response_id, user_id, total_score, response_date
		FROM UserResponse`)
	if err != nil {
		log.Printf("Error querying user responses: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Iterate over the rows and scan the values into the responseList slice
	for rows.Next() {
		var response UserResponse
		if err := rows.Scan(
			&response.ResponseID,
			&response.UserID,
			&response.TotalScore,
			&response.ResponseDate,
		); err != nil {
			log.Printf("Error scanning user response row: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		responseList = append(responseList, response)
	}

	// Check if there was an error while iterating over the rows
	if err := rows.Err(); err != nil {
		log.Printf("Error iterating over rows: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Respond with the list of user responses as JSON
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(responseList)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}

// GetUserFESResults retrieves Falls Efficacy Scale test results for a given userID
func GetUserFESResults(w http.ResponseWriter, r *http.Request) {
	// Extract userID from query parameters
	userIDStr := r.URL.Query().Get("user_id")
	if userIDStr == "" {
		http.Error(w, "user_id is required", http.StatusBadRequest)
		return
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user_id", http.StatusBadRequest)
		return
	}

	// Query the database
	rows, err := db.Query(
		`SELECT response_id, user_id, total_score, response_date 
		 FROM UserResponse  
		 WHERE user_id = ?`, userID)
	if err != nil {
		log.Printf("Database query error: %v", err)
		http.Error(w, "Failed to fetch user FES results", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var results []UserResponse
	for rows.Next() {
		var result UserResponse
		var responseDateStr string // Store date as string before parsing

		if err := rows.Scan(
			&result.ResponseID, &result.UserID,
			&result.TotalScore, &responseDateStr); err != nil {
			log.Printf("Error scanning row: %v", err)
			http.Error(w, "Failed to parse user FES results", http.StatusInternalServerError)
			return
		}

		// Parse the string to time.Time using RFC3339 format
		parsedDate, err := time.Parse(time.RFC3339, responseDateStr)
		if err != nil {
			log.Printf("Error parsing response_date: %v", err)
			http.Error(w, fmt.Sprintf("Error parsing response_date: %v", err), http.StatusInternalServerError)
			return
		}
		result.ResponseDate = parsedDate

		results = append(results, result)
	}

	// Send response as JSON
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(results)
	if err != nil {
		log.Printf("Error encoding JSON response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

// Struct for Individual Question Information
type UserResponseDetails struct {
	ResponseID    int `json:"response_id"`    // Unique ID of the response
	QuestionID    int `json:"question_id"`    // Associated question ID
	ResponseScore int `json:"response_score"` // User's response score
}

func GetAllFESIndividualRes(w http.ResponseWriter, r *http.Request) {
	// Define a slice to store the list of individual responses
	var responseDetailsList []UserResponseDetails

	// Query to fetch all individual response details
	rows, err := db.Query(`
		SELECT response_id, question_id, response_score
		FROM UserResponseDetails`)
	if err != nil {
		log.Printf("Error querying individual response details: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Iterate over the rows and scan the values into the responseDetailsList slice
	for rows.Next() {
		var detail UserResponseDetails
		if err := rows.Scan(
			&detail.ResponseID,
			&detail.QuestionID,
			&detail.ResponseScore,
		); err != nil {
			log.Printf("Error scanning individual response detail row: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		responseDetailsList = append(responseDetailsList, detail)
	}

	// Check if there was an error while iterating over the rows
	if err := rows.Err(); err != nil {
		log.Printf("Error iterating over rows: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Respond with the list of individual response details as JSON
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(responseDetailsList)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}
