package selfAssessment

import (
	"crypto/tls"
	"crypto/x509"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
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
			mutex.Lock()
			movementData = append(movementData, movement)
			totalCount++
			if movement.AngleDifference > 10 { // Example threshold for abrupt movement
				abruptCount++
			}
			log.Printf("Captured movement data: %+v", movement)
			log.Printf("Abrupt Count: %d, Total Count: %d", abruptCount, totalCount)
			mutex.Unlock()
		}
	}); token.Wait() && token.Error() != nil {
		log.Fatalf("Failed to subscribe to topic %s: %v", topic, token.Error())
	}
	log.Printf("Subscribed to MQTT topic: %s", topic)

	// Handle WebSocket Commands
	for {
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
				log.Printf("Abrupt movement percentage: %f", abruptPercentage)
				riskLevel := determineRiskLevel(abruptPercentage)
				riskAssessment := RiskAssessment{
					AbruptPercentage: abruptPercentage,
					RiskLevel:        riskLevel,
				}
				log.Printf("Risk assessment: %+v", riskAssessment)
				if err := conn.WriteJSON(riskAssessment); err != nil {
					log.Printf("WebSocket write error: %v", err)
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
	if abruptPercentage > 70 {
		return "high"
	} else if abruptPercentage > 40 {
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
            "test_id":      testID,
            "test_name":    testName,
            "description":  description,
            "risk_metric":  riskMetric,
            "video_url":    videoURL,
            "step_1":       step1,
            "step_2":       nullStringToString(step2),
            "step_3":       nullStringToString(step3),
            "step_4":       nullStringToString(step4),
            "step_5":       nullStringToString(step5),
            "enabled":      enabled,
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
