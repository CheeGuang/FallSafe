package selfAssessment

import (
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/joho/godotenv"
)

func init() {
	// Load environment variables
	log.Println("Loading environment variables...")
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}
	log.Println("Environment variables loaded successfully.")
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



