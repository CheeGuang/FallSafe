package selfAssessment

import (
	"crypto/tls"
	"crypto/x509"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	_ "github.com/go-sql-driver/mysql" // MySQL driver
	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
)

var db *sql.DB

func init() {
	// Load environment variables
	log.Println("Loading environment variables...")
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}
	log.Println("Environment variables loaded successfully.")

	// Initialize database connection
	log.Println("Initializing database connection...")
	db, err = sql.Open("mysql", os.Getenv("DB_CONNECTION"))
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

// StartMQTTConnection initializes the MQTT connection and subscribes to a topic
func StartMQTTConnection() {
	log.Println("Starting MQTT connection...")

	// Load AWS IoT credentials from environment variables
	endpoint := os.Getenv("AWS_IOT_ENDPOINT")
	clientID := os.Getenv("AWS_IOT_CLIENT_ID")
	certFile := os.Getenv("AWS_IOT_CERT_FILE")
	keyFile := os.Getenv("AWS_IOT_KEY_FILE")
	caFile := os.Getenv("AWS_IOT_CA_FILE")

	log.Printf("AWS IoT Endpoint: %s", endpoint)
	log.Printf("AWS IoT Client ID: %s", clientID)

	if endpoint == "" || clientID == "" || certFile == "" || keyFile == "" || caFile == "" {
		log.Fatalf("AWS IoT credentials are not properly configured in the environment variables")
	}

	// Configure MQTT options
	opts := mqtt.NewClientOptions()
	opts.AddBroker(fmt.Sprintf("ssl://%s:8883", endpoint))
	opts.SetClientID(clientID)
	opts.SetTLSConfig(createTLSConfig(certFile, keyFile, caFile))
	opts.SetDefaultPublishHandler(messageHandler)

	// Create an MQTT client
	log.Println("Creating MQTT client...")
	client := mqtt.NewClient(opts)

	// Connect to AWS IoT Core
	log.Println("Connecting to AWS IoT Core...")
	if token := client.Connect(); token.Wait() && token.Error() != nil {
		log.Fatalf("Failed to connect to AWS IoT Core: %v", token.Error())
	}
	log.Println("Connected to AWS IoT Core.")

	// Subscribe to the topic
	topic := "esp32s3/pub"
	log.Printf("Subscribing to topic: %s", topic)
	if token := client.Subscribe(topic, 1, nil); token.Wait() && token.Error() != nil {
		log.Fatalf("Failed to subscribe to topic %s: %v", topic, token.Error())
	}
	log.Printf("Successfully subscribed to topic: %s", topic)

	// Keep the MQTT client running
	select {}
}

// createTLSConfig creates a TLS configuration for the MQTT connection
func createTLSConfig(certFile, keyFile, caFile string) *tls.Config {
	log.Println("Loading TLS configuration...")

	cert, err := tls.LoadX509KeyPair(certFile, keyFile)
	if err != nil {
		log.Fatalf("Failed to load client certificate and key: %v", err)
	}
	log.Println("Client certificate and key loaded successfully.")

	caCert, err := os.ReadFile(caFile)
	if err != nil {
		log.Fatalf("Failed to read CA certificate: %v", err)
	}
	log.Println("CA certificate loaded successfully.")

	caCertPool := x509.NewCertPool()
	if !caCertPool.AppendCertsFromPEM(caCert) {
		log.Fatalf("Failed to append CA certificate")
	}

	log.Println("TLS configuration successfully created.")
	return &tls.Config{
		Certificates: []tls.Certificate{cert},
		RootCAs:      caCertPool,
	}
}

// messageHandler handles incoming MQTT messages and logs them
func messageHandler(client mqtt.Client, msg mqtt.Message) {
	log.Printf("Message received. Topic: %s, Payload: %s", msg.Topic(), string(msg.Payload()))

	// Check if the payload is JSON
	var payload map[string]interface{}
	if err := json.Unmarshal(msg.Payload(), &payload); err != nil {
		// If the payload is not JSON, just log it as a plain string
		log.Printf("Payload is not JSON. Raw Payload: %s", string(msg.Payload()))
		return
	}

	// If the payload is JSON, log the parsed content
	log.Printf("Parsed JSON Payload: %+v", payload)
}

// TestReceiveMessages tests if the MQTT client can subscribe and receive three messages
func TestReceiveMessages() bool {
	log.Println("Starting TestReceiveMessages...")

	// Load AWS IoT credentials from environment variables
	endpoint := os.Getenv("AWS_IOT_ENDPOINT")
	clientID := os.Getenv("AWS_IOT_CLIENT_ID")
	certFile := os.Getenv("AWS_IOT_CERT_FILE")
	keyFile := os.Getenv("AWS_IOT_KEY_FILE")
	caFile := os.Getenv("AWS_IOT_CA_FILE")

	if endpoint == "" || clientID == "" || certFile == "" || keyFile == "" || caFile == "" {
		log.Fatalf("AWS IoT credentials are not properly configured in the environment variables")
	}

	// Configure MQTT options
	opts := mqtt.NewClientOptions()
	opts.AddBroker(fmt.Sprintf("ssl://%s:8883", endpoint))
	opts.SetClientID(clientID)
	opts.SetTLSConfig(createTLSConfig(certFile, keyFile, caFile))

	// Create an MQTT client
	log.Println("Creating MQTT client for test...")
	client := mqtt.NewClient(opts)

	// Connect to AWS IoT Core
	log.Println("Connecting to AWS IoT Core for test...")
	if token := client.Connect(); token.Wait() && token.Error() != nil {
		log.Fatalf("Failed to connect to AWS IoT Core: %v", token.Error())
	}
	log.Println("Connected to AWS IoT Core for test.")

	// Test topic and message count
	topic := "esp32s3/pub"
	messageCount := 0
	var wg sync.WaitGroup
	wg.Add(1)

	// Define a message handler
	log.Printf("Subscribing to topic: %s", topic)
	if token := client.Subscribe(topic, 1, func(client mqtt.Client, msg mqtt.Message) {
		log.Printf("Test message received. Topic: %s, Payload: %s", msg.Topic(), string(msg.Payload()))
		messageCount++
		if messageCount == 3 {
			wg.Done()
		}
	}); token.Wait() && token.Error() != nil {
		log.Fatalf("Failed to subscribe to topic %s: %v", topic, token.Error())
	}
	log.Printf("Successfully subscribed to topic: %s", topic)

	// Wait for messages to be received
	done := make(chan bool, 1)
	go func() {
		wg.Wait()
		done <- true
	}()

	select {
	case <-done:
		log.Println("TestReceiveMessages: Successfully received 3 messages.")
		client.Disconnect(250) // Disconnect the MQTT client immediately
		return true
	case <-time.After(5 * time.Second): // Timeout after 10 seconds
		log.Println("TestReceiveMessages: Timed out waiting for messages.")
		client.Disconnect(250)
		return false
	}
}

// MovementData represents a movement record from MQTT messages
type MovementData struct {
	Timestamp       int64   `json:"timestamp"`
	AccelX          float64 `json:"accelX"`
	AccelY          float64 `json:"accelY"`
	AccelZ          float64 `json:"accelZ"`
	GyroX           float64 `json:"gyroX"`
	GyroY           float64 `json:"gyroY"`
	GyroZ           float64 `json:"gyroZ"`
	AngleDifference float64 `json:"angleDifference"`
}

// WebSocketMessage represents a command sent via WebSocket
type WebSocketMessage struct {
	Command string `json:"command"`
}

// RiskAssessment contains the calculated risk results
type RiskAssessment struct {
	AbruptPercentage float64 `json:"abrupt_percentage"`
	RiskLevel        string  `json:"risk_level"`
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func StartWebSocketServer(w http.ResponseWriter, r *http.Request) {
	log.Println("Upgrading connection to WebSocket...")
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade to WebSocket: %v", err)
		return
	}
	defer conn.Close()

	log.Println("WebSocket connection established")

	var movementData []MovementData
	var capturing bool
	var abruptCount int
	var totalCount int
	var mutex sync.Mutex

	// MQTT Client Configuration
	endpoint := os.Getenv("AWS_IOT_ENDPOINT")
	clientID := os.Getenv("AWS_IOT_CLIENT_ID")
	certFile := os.Getenv("AWS_IOT_CERT_FILE")
	keyFile := os.Getenv("AWS_IOT_KEY_FILE")
	caFile := os.Getenv("AWS_IOT_CA_FILE")

	log.Println("Setting up MQTT options...")
	opts := mqtt.NewClientOptions()
	opts.AddBroker(fmt.Sprintf("ssl://%s:8883", endpoint))
	opts.SetClientID(clientID)
	opts.SetTLSConfig(createTLSConfig(certFile, keyFile, caFile))

	client := mqtt.NewClient(opts)

	// Connect to AWS IoT Core
	log.Println("Connecting to AWS IoT Core for WebSocket...")
	if token := client.Connect(); token.Wait() && token.Error() != nil {
		log.Fatalf("Failed to connect to AWS IoT Core: %v", token.Error())
	}
	defer client.Disconnect(250)
	log.Println("Connected to AWS IoT Core for WebSocket")

	// Subscribe to the MQTT topic
	topic := "esp32s3/pub"
	log.Printf("Subscribing to MQTT topic: %s", topic)
	if token := client.Subscribe(topic, 1, func(client mqtt.Client, msg mqtt.Message) {
		if capturing {
			log.Printf("Received MQTT message. Topic: %s, Payload: %s", msg.Topic(), string(msg.Payload()))
			var movement MovementData
			if err := json.Unmarshal(msg.Payload(), &movement); err != nil {
				log.Printf("Failed to parse MQTT message: %v", err)
				return
			}
			log.Printf("Parsed MQTT message: %+v", movement)
			mutex.Lock()
			movementData = append(movementData, movement)
			totalCount++
			if movement.AngleDifference > 5 { // Example threshold for abrupt movement
				abruptCount++
			}
			log.Printf("Updated data. Abrupt Count: %d, Total Count: %d", abruptCount, totalCount)
			mutex.Unlock()
		}
	}); token.Wait() && token.Error() != nil {
		log.Fatalf("Failed to subscribe to topic %s: %v", topic, token.Error())
	}
	log.Printf("Subscribed to MQTT topic: %s", topic)

	// Handle WebSocket Commands
	for {
		log.Println("Waiting for WebSocket commands...")
		var msg WebSocketMessage
		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Printf("WebSocket read error: %v", err)
			break
		}

		log.Printf("Received WebSocket command: %s", msg.Command)
		switch msg.Command {
		case "start":
			log.Println("Starting data capture...")
			mutex.Lock()
			capturing = true
			movementData = []MovementData{}
			abruptCount = 0
			totalCount = 0
			mutex.Unlock()
			log.Println("Data capture started.")

		case "stop":
			log.Println("Stopping data capture...")
			mutex.Lock()
			if capturing {
				capturing = false
				abruptPercentage := float64(abruptCount) / float64(totalCount) * 100
				log.Printf("Calculated abrupt percentage: %f", abruptPercentage)
				riskLevel := determineRiskLevel(abruptPercentage)
				riskAssessment := RiskAssessment{
					AbruptPercentage: abruptPercentage,
					RiskLevel:        riskLevel,
				}
				log.Printf("Generated risk assessment: %+v", riskAssessment)

				// Convert riskAssessment to JSON manually and write it
				riskAssessmentJSON, err := json.Marshal(riskAssessment)
				if err != nil {
					log.Printf("Error marshaling risk assessment: %v", err)
				} else {
					if err := conn.WriteMessage(websocket.TextMessage, riskAssessmentJSON); err != nil {
						log.Printf("WebSocket write error: %v", err)
					}
				}
			} else {
				log.Println("Stop command received, but capturing was not active.")
			}
			mutex.Unlock()
			log.Println("Data capture stopped.")
			break

		case "restart":
			log.Println("Restarting data capture...")
			mutex.Lock()
			capturing = true
			movementData = []MovementData{}
			abruptCount = 0
			totalCount = 0
			mutex.Unlock()
			log.Println("Data capture restarted.")

		default:
			log.Printf("Unknown command received: %s", msg.Command)
		}
	}
}

func determineRiskLevel(abruptPercentage float64) string {
	if abruptPercentage > 30 {
		return "high"
	} else if abruptPercentage > 15 {
		return "moderate"
	}
	return "low"
}

// StartTest creates a new test session for a given user ID and returns the session ID
func StartTest(userID int) (int64, error) {
	// Insert new test session
	query := `
		INSERT INTO TestSession (user_id, session_date)
		VALUES (?, ?)
	`
	result, err := db.Exec(query, userID, time.Now())
	if err != nil {
		return 0, fmt.Errorf("failed to create new test session: %v", err)
	}

	// Get the session ID of the newly created session
	sessionID, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("failed to retrieve session ID: %v", err)
	}

	log.Printf("New test session created for user_id=%d with session_id=%d", userID, sessionID)
	return sessionID, nil
}

func GetAllTests() ([]map[string]interface{}, error) {
	log.Println("Retrieving all tests...")

	query := `
        SELECT 
            test_id,
            test_name,
            description,
            risk_metric,
            video_url,
            step_1,
            step_2,
            step_3,
            step_4,
            step_5,
            enabled
        FROM Test
    `

	rows, err := db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve tests: %v", err)
	}
	defer rows.Close()

	var tests []map[string]interface{}
	for rows.Next() {
		var testID int
		var testName, description, riskMetric, videoURL, step1 string
		var step2, step3, step4, step5 sql.NullString
		var enabled bool

		err := rows.Scan(
			&testID, &testName, &description, &riskMetric, &videoURL,
			&step1, &step2, &step3, &step4, &step5, &enabled,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan test row: %v", err)
		}

		test := map[string]interface{}{
			"test_id":     testID,
			"test_name":   testName,
			"description": description,
			"risk_metric": riskMetric,
			"video_url":   videoURL,
			"step_1":      step1,
			"step_2":      nullStringToString(step2),
			"step_3":      nullStringToString(step3),
			"step_4":      nullStringToString(step4),
			"step_5":      nullStringToString(step5),
			"enabled":     enabled,
		}
		tests = append(tests, test)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error occurred while iterating through rows: %v", err)
	}

	log.Println("All tests retrieved successfully.")
	return tests, nil
}

func nullStringToString(ns sql.NullString) string {
	if ns.Valid {
		return ns.String
	}
	return ""
}

// SaveUserTestResult stores test result data into the UserTestResult table and updates the average score in TestSession
func SaveUserTestResult(testSessionID int, userID int, testID int, timeTaken float64, websocketData string) error {
	log.Println("Starting SaveUserTestResult function...")

	// Parse the WebSocket data into a structured format
	log.Println("Parsing WebSocket data...")
	var resultData map[string]interface{}
	err := json.Unmarshal([]byte(websocketData), &resultData)
	if err != nil {
		log.Printf("Error parsing WebSocket data: %v", err)
		return fmt.Errorf("failed to parse WebSocket data: %v", err)
	}
	log.Println("WebSocket data parsed successfully.")

	// Extract abrupt percentage and risk level from the WebSocket data
	log.Println("Extracting abrupt_percentage and risk_level from WebSocket data...")
	abruptPercentage, ok := resultData["abrupt_percentage"].(float64)
	if !ok {
		log.Println("Error: invalid or missing abrupt_percentage in WebSocket data")
		return fmt.Errorf("invalid or missing abrupt_percentage in WebSocket data")
	}

	riskLevel, ok := resultData["risk_level"].(string)
	if !ok {
		log.Println("Error: invalid or missing risk_level in WebSocket data")
		return fmt.Errorf("invalid or missing risk_level in WebSocket data")
	}
	log.Printf("Extracted values - abrupt_percentage: %f, risk_level: %s", abruptPercentage, riskLevel)

	// Save the test result into the UserTestResult table
	query := `
		INSERT INTO UserTestResult (
			user_id, session_id, test_id, time_taken, abrupt_percentage, risk_level
		) VALUES (?, ?, ?, ?, ?, ?)
	`
	log.Printf("Executing SQL query: %s", query)
	_, err = db.Exec(query, userID, testSessionID, testID, timeTaken, abruptPercentage, riskLevel)
	if err != nil {
		log.Printf("Error executing SQL query: %v", err)
		return fmt.Errorf("failed to save user test result: %v", err)
	}
	log.Printf("User test result saved successfully for user_id=%d, session_id=%d, test_id=%d", userID, testSessionID, testID)

	// Recalculate the average score for the session
	log.Println("Recalculating average score for the session...")
	rows, err := db.Query(`
		SELECT utr.time_taken, utr.abrupt_percentage, t.test_name 
		FROM UserTestResult utr
		JOIN Test t ON utr.test_id = t.test_id
		WHERE utr.session_id = ?`, testSessionID)
	if err != nil {
		log.Printf("Error querying test results for session: %v", err)
		return fmt.Errorf("failed to query test results: %v", err)
	}
	defer rows.Close()

	var totalScore, count float64
	for rows.Next() {
		var timeTaken float64
		var abruptPercentage float64
		var testName string

		if err := rows.Scan(&timeTaken, &abruptPercentage, &testName); err != nil {
			log.Printf("Error scanning test result row: %v", err)
			return fmt.Errorf("failed to scan test result row: %v", err)
		}

		// Calculate the score using the provided logic
		score := calculateScore(timeTaken, abruptPercentage, testName)
		totalScore += float64(score)
		count++
	}

	if count == 0 {
		log.Printf("No test results found for session_id=%d", testSessionID)
		return nil
	}

	// Update the TestSession with the calculated average score
	updateQuery := `UPDATE TestSession SET total_score = ? WHERE session_id = ?`
	_, err = db.Exec(updateQuery, totalScore, testSessionID)
	if err != nil {
		log.Printf("Error updating average score in TestSession: %v", err)
		return fmt.Errorf("failed to update average score: %v", err)
	}

	log.Printf("Average score updated successfully for session_id=%d", testSessionID)
	log.Println("SaveUserTestResult function completed.")
	return nil
}

// calculateScore calculates the final score based on time taken and abrupt percentage
func calculateScore(timeTaken, abruptPercentage float64, testName string) int {
	tolerances := map[string]struct {
		TimeTolerance   float64
		AbruptTolerance float64
	}{
		"Timed Up and Go Test":         {TimeTolerance: 20, AbruptTolerance: 30},
		"Five Times Sit to Stand Test": {TimeTolerance: 25, AbruptTolerance: 40},
		"Dynamic Gait Index (DGI)":     {TimeTolerance: 25, AbruptTolerance: 20},
		"4 Stage Balance Test":         {TimeTolerance: 40, AbruptTolerance: 15},
	}

	// Default tolerances
	tolerance := tolerances[testName]
	if tolerance == (struct {
		TimeTolerance   float64
		AbruptTolerance float64
	}{}) {
		tolerance = struct {
			TimeTolerance   float64
			AbruptTolerance float64
		}{TimeTolerance: 12, AbruptTolerance: 50}
	}

	// Calculate time score
	timeScore := 0
	if timeTaken <= tolerance.TimeTolerance {
		timeScore = 100
	} else {
		timeScore = int(math.Max(0, 100-((timeTaken-tolerance.TimeTolerance)/tolerance.TimeTolerance)*100))
	}

	// Calculate abrupt score
	abruptScore := 0
	if abruptPercentage <= tolerance.AbruptTolerance {
		abruptScore = 100
	} else {
		abruptScore = int(math.Max(0, 100-((abruptPercentage-tolerance.AbruptTolerance)/tolerance.AbruptTolerance)*100))
	}

	// Weighted average
	finalScore := int(math.Round(float64(timeScore)*0.7 + float64(abruptScore)*0.3))
	return finalScore
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

// TestSession represents a test session with associated test results
type TestSession struct {
	SessionID    int              `json:"session_id"`
	UserID       int              `json:"user_id"`
	SessionDate  time.Time        `json:"session_date"`
	TotalScore     sql.NullInt64    `json:"total_score,omitempty"`
	SessionNotes sql.NullString   `json:"session_notes,omitempty"`
	TestResults  []UserTestResult `json:"test_results"`
}

// GetTestSessions retrieves test sessions and results for a given userID
func GetTestSessions(w http.ResponseWriter, r *http.Request) {
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

	// Query to fetch test sessions
	sessionQuery := `
		SELECT 
			session_id, 
			user_id, 
			CAST(session_date AS CHAR), -- Convert to string
			total_score, 
			session_notes
		FROM TestSession
		WHERE user_id = ?
		ORDER BY session_date DESC;
	`

	rows, err := db.Query(sessionQuery, userID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Database query failed: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var sessions []TestSession

	// Iterate through each session
	for rows.Next() {
		var session TestSession
		var sessionDateStr string // Store as string before parsing

		if err := rows.Scan(
			&session.SessionID, &session.UserID, &sessionDateStr, &session.TotalScore, &session.SessionNotes,
		); err != nil {
			http.Error(w, fmt.Sprintf("Error scanning session row: %v", err), http.StatusInternalServerError)
			return
		}

		// Debug: Print sessionDateStr before parsing
		log.Printf("Raw session_date string: %s", sessionDateStr)

		// Parse session_date using "YYYY-MM-DD HH:MM:SS" format
		parsedSessionDate, err := time.Parse("2006-01-02 15:04:05", sessionDateStr)
		if err != nil {
			log.Printf("Error parsing session_date: %v", err)
			http.Error(w, fmt.Sprintf("Error parsing session_date: %v", err), http.StatusInternalServerError)
			return
		}
		session.SessionDate = parsedSessionDate

		// Query to fetch test results for the session
		testResultQuery := `
			SELECT 
				utr.result_id, 
				utr.test_id, 
				t.test_name,
				utr.time_taken, 
				utr.abrupt_percentage, 
				utr.risk_level, 
				CAST(utr.test_date AS CHAR) -- Convert test_date to string
			FROM UserTestResult utr
			JOIN Test t ON utr.test_id = t.test_id
			WHERE utr.session_id = ?
			ORDER BY utr.test_date DESC;
		`

		testRows, err := db.Query(testResultQuery, session.SessionID)
		if err != nil {
			http.Error(w, fmt.Sprintf("Error querying test results: %v", err), http.StatusInternalServerError)
			return
		}
		defer testRows.Close()

		var testResults []UserTestResult
		for testRows.Next() {
			var result UserTestResult
			var testDateStr string

			if err := testRows.Scan(
				&result.ResultID, &result.TestID, &result.TestName,
				&result.TimeTaken, &result.AbruptPercentage,
				&result.RiskLevel, &testDateStr,
			); err != nil {
				http.Error(w, fmt.Sprintf("Error scanning test result row: %v", err), http.StatusInternalServerError)
				return
			}

			// Debug: Print testDateStr before parsing
			log.Printf("Raw test_date string: %s", testDateStr)

			// Parse test_date using "YYYY-MM-DD HH:MM:SS" format
			parsedTestDate, err := time.Parse("2006-01-02 15:04:05", testDateStr)
			if err != nil {
				log.Printf("Error parsing test_date: %v", err)
				http.Error(w, fmt.Sprintf("Error parsing test_date: %v", err), http.StatusInternalServerError)
				return
			}
			result.TestDate = parsedTestDate

			testResults = append(testResults, result)
		}

		// **Exclude sessions if they don't have exactly 4 test results**
		if len(testResults) != 4 {
			log.Printf("Skipping session %d (only %d test results)", session.SessionID, len(testResults))
			continue
		}

		// Assign test results to the session
		session.TestResults = testResults
		sessions = append(sessions, session)
	}

	// Encode results as JSON and send response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(sessions); err != nil {
		http.Error(w, "Failed to encode JSON", http.StatusInternalServerError)
	}
}

// Struct to hold user_id, avg score and session_date
type TestSessionUser struct {
	SessionID   int       `json:"session_id"`   // Unique ID for the session
	UserID      int       `json:"user_id"`      // Associated user ID
	SessionDate time.Time `json:"session_date"` // Date and time of the session
	TotalScore    int16     `json:"total_score"`    // Average score for the session
}

// GetAllUserTotalScore fetches all test sessions with total scores
func GetAllUserTotalScore(w http.ResponseWriter, r *http.Request) {
	// Define a slice to store the list of test session user results
	var sessionResults []TestSessionUser

	// Query to fetch all test session details
	rows, err := db.Query(`
		SELECT session_id, user_id, session_date, total_score
		FROM TestSession`)
	if err != nil {
		log.Printf("Error querying test session results: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Iterate over the rows and scan the values into the sessionResults slice
	for rows.Next() {
		var session TestSessionUser
		if err := rows.Scan(
			&session.SessionID,
			&session.UserID,
			&session.SessionDate,
			&session.TotalScore,
		); err != nil {
			log.Printf("Error scanning test session row: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		sessionResults = append(sessionResults, session)
	}

	// Check if there was an error while iterating over the rows
	if err := rows.Err(); err != nil {
		log.Printf("Error iterating over rows: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Respond with the list of test session results as JSON
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(sessionResults)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
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

// Function to fetch the test name, as well as the userID and time taken.
func GetAllFATestWithAvgTime(w http.ResponseWriter, r *http.Request) {
	// Define a slice to store the list of test results
	var testResults []FATestWithAvgTime

	// Query to fetch test results with test name and session date
	rows, err := db.Query(`
		SELECT utr.result_id, t.test_name, utr.user_id, utr.time_taken, ts.session_date
		FROM UserTestResult utr
		JOIN Test t ON utr.test_id = t.test_id
		JOIN TestSession ts ON utr.session_id = ts.session_id`)
	if err != nil {
		log.Printf("Error querying user test results: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Iterate over the rows and scan the values into the testResults slice
	for rows.Next() {
		var result FATestWithAvgTime
		if err := rows.Scan(
			&result.ResultID,
			&result.TestName,
			&result.UserID,
			&result.TimeTaken,
			&result.SessionDate,
		); err != nil {
			log.Printf("Error scanning test result row: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		testResults = append(testResults, result)
	}

	// Check if there was an error while iterating over the rows
	if err := rows.Err(); err != nil {
		log.Printf("Error iterating over rows: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Respond with the list of test results as JSON
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(testResults)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}

// Struct to hold user_id and overall_risk_level
type UserRisk struct {
	UserID         int    `json:"user_id"`
	OverallRiskLevel string `json:"overall_risk_level"`
}

func GetUserOverallLatestRisk(w http.ResponseWriter, r *http.Request) {
	// Slice to hold the results
	var userRisks []UserRisk

	// Query to get the latest session for each user and determine their overall risk level. Ignored any TestSession that is NULL
	query := `
		WITH RankedSessions AS (
			SELECT 
				user_id, 
				session_id, 
				session_date, 
				total_score,
				ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY session_id DESC) AS session_rank
			FROM TestSession
			WHERE user_id IS NOT NULL 
				AND session_date IS NOT NULL 
				AND total_score IS NOT NULL
		),
		LatestSession AS (
			SELECT user_id, session_id
			FROM RankedSessions
			WHERE session_rank = 1
		),
		RiskCount AS (
			SELECT 
				ls.user_id,
				SUM(CASE WHEN utr.risk_level = 'low' THEN 1 ELSE 0 END) AS low_count,
				SUM(CASE WHEN utr.risk_level = 'moderate' THEN 1 ELSE 0 END) AS moderate_count,
				SUM(CASE WHEN utr.risk_level = 'high' THEN 1 ELSE 0 END) AS high_count
			FROM LatestSession ls
			JOIN UserTestResult utr ON ls.session_id = utr.session_id
			GROUP BY ls.user_id
		)
		SELECT 
			user_id,
			CASE 
				WHEN high_count >= 2 THEN 'high'
				WHEN moderate_count >= 2 THEN 'moderate'
				ELSE 'low'
			END AS overall_risk_level
		FROM RiskCount;

	`

	// Execute query
	rows, err := db.Query(query)
	if err != nil {
		log.Printf("Error executing query: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Scan results into the slice
	for rows.Next() {
		var risk UserRisk
		if err := rows.Scan(&risk.UserID, &risk.OverallRiskLevel); err != nil {
			log.Printf("Error scanning row: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		userRisks = append(userRisks, risk)
	}

	// Check for errors after scanning rows
	if err := rows.Err(); err != nil {
		log.Printf("Error iterating over rows: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Respond with JSON output
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(userRisks)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}

// struct to hold the user ID and days since last response
type FallAssesLastRes struct {
	UserID             int    `json:"user_id"`
	DaysSinceResponse  int    `json:"days_since_last_fares"`
}
// Gets the user_id with days since last response for fall assessment
func GetAllFallAssesLatestResDate(w http.ResponseWriter, r *http.Request) {
	// Define a slice to store the list of user responses
	var userResponseList []FallAssesLastRes

	// Query to fetch the user_id and last response date from FallAssessment table. Dont accept incomplete work
	rows, err := db.Query(`
		WITH RankedSessions AS (
			SELECT 
				user_id, 
				session_date, 
				ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY session_date DESC) AS session_rank
			FROM TestSession
			WHERE user_id IS NOT NULL
				AND session_date IS NOT NULL 
				AND total_score IS NOT NULL
		),
		LatestSession AS (
			SELECT user_id, session_date
			FROM RankedSessions
			WHERE session_rank = 1
		)
		SELECT user_id, MAX(session_date) AS last_response_date
		FROM LatestSession
		GROUP BY user_id;

	`)
	if err != nil {
		log.Printf("Error querying fall assessment responses: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Iterate over the rows and scan the values into the userResponseList slice
	for rows.Next() {
		var response FallAssesLastRes
		var lastResponseDate string
		if err := rows.Scan(&response.UserID, &lastResponseDate); err != nil {
			log.Printf("Error scanning fall assessment row: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		// Parse the last response date and calculate the number of days since that date
		parsedDate, err := time.Parse("2006-01-02T15:04:05Z", lastResponseDate)
		if err != nil {
			log.Printf("Error parsing last response date: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		// Calculate the difference in days
		daysSinceResponse := int(time.Since(parsedDate).Hours() / 24)
		response.DaysSinceResponse = daysSinceResponse

		// Add the result to the response list
		userResponseList = append(userResponseList, response)
	}

	// Check if there was an error while iterating over the rows
	if err := rows.Err(); err != nil {
		log.Printf("Error iterating over rows: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Respond with the list of user responses as JSON
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(userResponseList)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}