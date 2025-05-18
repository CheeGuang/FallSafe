package main

import (
	"log"
	"net/http"
	"openAIMicroservice/openAI"

	"os"
	"strings"

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

	// JWT Authentication Logic
	authenticated := router.NewRoute().Subrouter()

	// Speech generation endpoint
	authenticated.HandleFunc("/api/v1/generateSpeech", openAI.GenerateSpeech).Handler(authenticateMiddleware([]string{"User"})(http.HandlerFunc(openAI.GenerateSpeech))).Methods("POST")
	authenticated.HandleFunc("/api/v1/generateResponse", openAI.GenerateResponse).Handler(authenticateMiddleware([]string{"User"})(http.HandlerFunc(openAI.GenerateResponse))).Methods("POST")
	authenticated.HandleFunc("/api/v1/generateTranslation", openAI.GenerateTranslation).Handler(authenticateMiddleware([]string{"User"})(http.HandlerFunc(openAI.GenerateTranslation))).Methods("POST")


	// Add CORS support
	corsHandler := handlers.CORS(
		handlers.AllowedOrigins([]string{"http://47.129.56.155:5150"}), // Update for allowed origins
		handlers.AllowedMethods([]string{"GET", "POST", "PUT", "OPTIONS"}), // Update for allowed HTTP methods
		handlers.AllowedHeaders([]string{"Content-Type", "Authorization"}), // Include Authorization header
	)(router)

	// Start the server
	log.Println("OpenAI Microservice is running on port 5150...")
	log.Fatal(http.ListenAndServe(":5150", corsHandler))
}
