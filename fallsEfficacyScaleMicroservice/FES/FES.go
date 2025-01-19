package FES

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	//"fmt" -- temporary comment for testing
	//"io/ioutil"
	//"bytes"

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

/*
type TTSRequest struct {
	Model string `json:"model"`
	Voice string `json:"voice"`
	Input string `json:"input"`
}

type TTSResponse struct {
	AudioURL string `json:"audio_url"`
}


func CallTTSModel(inputText string) ([]byte, error) {
	log.Println("Entering CallTTSModel...")

	apiKey := os.Getenv("OPENAI_APIKEY")
	if apiKey == "" {
		log.Println("OPENAI_APIKEY is not set.")
		return nil, fmt.Errorf("OPENAI_APIKEY environment variable is not set")
	}

	log.Printf("Preparing request for TTS with input: %s\n", inputText)
	ttsRequest := TTSRequest{
		Model: "tts-1",
		Voice: "alloy",
		Input: inputText,
	}

	requestBody, err := json.Marshal(ttsRequest)
	if err != nil {
		log.Printf("Error marshaling request body: %v\n", err)
		return nil, fmt.Errorf("error marshaling request body: %v", err)
	}
	log.Printf("Request body prepared: %s\n", string(requestBody))

	req, err := http.NewRequest("POST", "https://api.openai.com/v1/audio/speech", bytes.NewBuffer(requestBody))
	if err != nil {
		log.Printf("Error creating request: %v\n", err)
		return nil, fmt.Errorf("error creating request: %v", err)
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	log.Println("Request headers set successfully.")

	client := &http.Client{}
	log.Println("Sending request to OpenAI API...")
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error sending request: %v\n", err)
		return nil, fmt.Errorf("error sending request: %v", err)
	}
	defer resp.Body.Close()

	log.Printf("Response received with status code: %d\n", resp.StatusCode)
	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := ioutil.ReadAll(resp.Body)
		log.Printf("API returned error: %s\n", string(bodyBytes))
		return nil, fmt.Errorf("API returned error: %s", string(bodyBytes))
	}

	// Read the raw binary data from the response body
	audioData, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error reading audio data: %v\n", err)
		return nil, fmt.Errorf("error reading audio data: %v", err)
	}

	log.Println("Audio data received successfully.")
	return audioData, nil
}
*/

func GetQuestions(w http.ResponseWriter, r *http.Request) {
	//fetch all questions
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

/*func ReadQuestion(w http.ResponseWriter, r *http.Request) {
	//decode the request body
	var requestData struct {
		QuestionText string `json:"question_text"`
	}
	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	//call TTS model to generate audio
	audioData, err := CallTTSModel(requestData.QuestionText)
	if err != nil {
		log.Printf("Error generating audio: %v", err)
		http.Error(w, "Failed to generate speech", http.StatusInternalServerError)
		return
	}

	//respond with audio data
	w.Header().Set("Content-Type", "audio/mpeg")
	w.WriteHeader(http.StatusOK)
	_, err = w.Write(audioData)
	if err != nil {
		log.Printf("Error writing audio response: %v", err)
	}
}
*/

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

	// Insert details into UserResponseDetails table
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

	// Respond with success message
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, err = w.Write([]byte(`{"message":"Response saved successfully"}`))
	if err != nil {
		log.Printf("Error writing success response: %v", err)
	}
}

