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

	avgScore := totalScore / count
	log.Printf("Calculated average score for session_id=%d: %f", testSessionID, avgScore)

	// Update the TestSession with the calculated average score
	updateQuery := `UPDATE TestSession SET avg_score = ? WHERE session_id = ?`
	_, err = db.Exec(updateQuery, avgScore, testSessionID)
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
		"Timed Up and Go Test":        {TimeTolerance: 12, AbruptTolerance: 20},
		"Five Times Sit to Stand Test": {TimeTolerance: 14, AbruptTolerance: 20},
		"Dynamic Gait Index (DGI)":    {TimeTolerance: 20, AbruptTolerance: 20},
		"4 Stage Balance Test":        {TimeTolerance: 40, AbruptTolerance: 15},
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
	UserID           int       `json:"user_id"`
	SessionID        int       `json:"session_id"`
	TestID           int       `json:"test_id"`
	TestName         string    `json:"test_name"`
	TimeTaken        float64   `json:"time_taken"`
	AbruptPercentage int       `json:"abrupt_percentage"`
	RiskLevel        string    `json:"risk_level"`
	TestDate         time.Time `json:"test_date"`
}

// GetUserTestResults retrieves test results for a given userID
func GetUserTestResults(w http.ResponseWriter, r *http.Request) {
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
	rows, err := db.Query(`
		SELECT 
			utr.result_id, 
			utr.user_id, 
			utr.session_id, 
			utr.test_id, 
			t.test_name,
			utr.time_taken, 
			utr.abrupt_percentage, 
			utr.risk_level, 
			CAST(utr.test_date AS CHAR) -- Convert test_date to string
		FROM UserTestResult utr
		JOIN Test t ON utr.test_id = t.test_id
		WHERE utr.user_id = ?`, userID)

	if err != nil {
		http.Error(w, fmt.Sprintf("Database query failed: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var results []UserTestResult
	for rows.Next() {
		var result UserTestResult
		var testDateStr string // Store date as string before parsing

		if err := rows.Scan(
			&result.ResultID, &result.UserID, &result.SessionID,
			&result.TestID, &result.TestName,
			&result.TimeTaken, &result.AbruptPercentage,
			&result.RiskLevel, &testDateStr); err != nil {
			http.Error(w, fmt.Sprintf("Error scanning row: %v", err), http.StatusInternalServerError)
			return
		}

		// Parse the string to time.Time
		parsedDate, err := time.Parse("2006-01-02 15:04:05", testDateStr) // Adjust format if needed
		if err != nil {
			http.Error(w, fmt.Sprintf("Error parsing test_date: %v", err), http.StatusInternalServerError)
			return
		}
		result.TestDate = parsedDate

		results = append(results, result)
	}

	// Encode results as JSON and send response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(results); err != nil {
		http.Error(w, "Failed to encode JSON", http.StatusInternalServerError)
	}
}
