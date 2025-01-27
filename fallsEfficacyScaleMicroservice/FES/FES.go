package FES

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

type Question struct {
	ID   int `json:"id"`
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
			Score      int  `json:"score"`
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

