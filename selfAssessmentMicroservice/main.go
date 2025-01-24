package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	"selfAssessmentMicroservice/selfAssessment"

	"github.com/golang-jwt/jwt/v4"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
)

// Authentication middleware to validate JWT
func authenticateMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Extract token
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		// Get the JWT secret from the environment variable
		secretKey := os.Getenv("JWT_SECRET")
		if secretKey == "" {
			log.Println("JWT_SECRET is not set in the environment")
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		// Parse and validate the token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, http.ErrAbortHandler
			}
			return []byte(secretKey), nil
		})

		if err != nil || !token.Valid {
			log.Printf("Invalid JWT token: %v", err)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Proceed to the next handler
		next.ServeHTTP(w, r)
	})
}

func main() {
	// Initialize the router
	router := mux.NewRouter()

	// JWT Authentication Logic
	authenticated := router.NewRoute().Subrouter()
	authenticated.Use(authenticateMiddleware)

	// Self-Assessment management endpoints
	authenticated.HandleFunc("/api/v1/selfAssessment/startMQTT", func(w http.ResponseWriter, r *http.Request) {
		go selfAssessment.StartMQTTConnection() // Start MQTT connection in a goroutine
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("MQTT connection started and subscribed to topic."))
		}).Methods("GET")
		
	// Authentication test endpoint
	authenticated.HandleFunc("/api/v1/selfAssessment/test", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Starting self-assessment test...")

		// Call the TestReceiveMessages function
		testStatus := selfAssessment.TestReceiveMessages()

		// Respond based on the test status
		if testStatus {
			log.Println("Successfully received raw data from FallSafe Device.")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("Successfully received raw data from FallSafe Device."))
		} else {
			log.Println("Failed to receive raw data from FallSafe Device within the timeout period.")
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Failed to receive raw data from FallSafe Device within the timeout period."))
		}
	}).Methods("GET")

	// Authentication test endpoint
	authenticated.HandleFunc("/api/v1/selfAssessment/ws", selfAssessment.StartWebSocketServer)

	// Add CORS support
	corsHandler := handlers.CORS(
		handlers.AllowedOrigins([]string{"http://127.0.0.1:5250"}), // Update for allowed origins
		handlers.AllowedMethods([]string{"GET", "POST", "PUT", "OPTIONS"}), // Update for allowed HTTP methods
		handlers.AllowedHeaders([]string{"Content-Type", "Authorization"}), // Include Authorization header
	)(router)

	// Start the server
	log.Println("Self-Assessment Microservice is running on port 5250...")
	log.Fatal(http.ListenAndServe(":5250", corsHandler))
}
