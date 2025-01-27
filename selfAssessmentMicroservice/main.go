package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"selfAssessmentMicroservice/selfAssessment"

	"github.com/golang-jwt/jwt/v4"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
)

// Authentication middleware to validate JWT
// JWT Authentication Middleware with Role Check for multiple roles
func authenticateMiddleware(allowedRoles []string) mux.MiddlewareFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Get the Authorization header
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

			// Extract the claims from the token
			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			// Check if the role matches any of the allowed roles
			role, ok := claims["role"].(string)
			if !ok {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			// Check if the user's role is in the allowed roles
			roleAllowed := false
			for _, allowedRole := range allowedRoles {
				if role == allowedRole {
					roleAllowed = true
					break
				}
			}

			if !roleAllowed {
				http.Error(w, "Forbidden", http.StatusForbidden)
				return
			}

			// Proceed to the next handler if role matches
			next.ServeHTTP(w, r)
		})
	}
}


func main() {
	// Initialize the router
	router := mux.NewRouter()
	
	// Authentication test endpoint
	router.HandleFunc("/api/v1/selfAssessment/ws", selfAssessment.StartWebSocketServer)
	
	// JWT Authentication Logic
	authenticated := router.NewRoute().Subrouter()
	authenticated.Use(authenticateMiddleware([]string{"Admin", "User"}))

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

	// Route to create a new test session
	authenticated.HandleFunc("/api/v1/selfAssessment/startTest", func(w http.ResponseWriter, r *http.Request) {
		fmt.Print("Hi")
		// Extract user ID from query parameters
		userIDStr := r.URL.Query().Get("userID")
		if userIDStr == "" {
			http.Error(w, "Missing userID parameter", http.StatusBadRequest)
			return
		}

		// Convert userID from string to int
		userID, err := strconv.Atoi(userIDStr)
		if err != nil {
			http.Error(w, "Invalid userID parameter, must be an integer", http.StatusBadRequest)
			return
		}

		// Call the StartTest function
		sessionID, err := selfAssessment.StartTest(userID)
		if err != nil {
			log.Printf("Failed to start test session: %v", err)
			http.Error(w, "Failed to create test session", http.StatusInternalServerError)
			return
		}

		// Respond with the session ID
		response := map[string]interface{}{
			"sessionID": sessionID,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}).Methods("POST")

	// Add the endpoint to get all tests
	authenticated.HandleFunc("/api/v1/selfAssessment/getAllTests", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Fetching all tests...")

		// Call the GetAllTests function
		tests, err := selfAssessment.GetAllTests()
		if err != nil {
			log.Printf("Failed to fetch tests: %v", err)
			http.Error(w, "Failed to fetch tests", http.StatusInternalServerError)
			return
		}

		// Respond with the list of tests
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(tests)
	}).Methods("GET")

	// Endpoint to save user test results
	authenticated.HandleFunc("/api/v1/selfAssessment/saveTestResult", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Saving test result...")

		// Parse the request body
		var requestData struct {
			TestSessionID int     `json:"testSessionID"`
			UserID        int     `json:"userID"`
			TestID        int     `json:"testID"`
			TimeTaken     float64 `json:"timeTaken"`
			WebSocketData string  `json:"websocketData"`
		}

		err := json.NewDecoder(r.Body).Decode(&requestData)
		if err != nil {
			log.Printf("Failed to parse request body: %v", err)
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Call the SaveUserTestResult function with the additional TestID parameter
		err = selfAssessment.SaveUserTestResult(
			requestData.TestSessionID,
			requestData.UserID,
			requestData.TestID,
			requestData.TimeTaken,
			requestData.WebSocketData,
		)
		if err != nil {
			log.Printf("Failed to save test result: %v", err)
			http.Error(w, "Failed to save test result", http.StatusInternalServerError)
			return
		}

		// Respond with success message
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Test result saved successfully."))
	}).Methods("POST")
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
