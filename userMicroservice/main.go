package main

import (
	"log"
	"net/http"
	"os"
	"strings"
	"userMicroservice/profile"

	"github.com/golang-jwt/jwt/v4"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
)

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

	// Profile management endpoints
	router.HandleFunc("/api/v1/user/create", profile.CreateUser).Methods("POST") // No auth needed
	router.HandleFunc("/api/v1/user/getUser", profile.GetUserByID).Methods("GET")

	// JWT Authentication Logic
	authenticated := router.NewRoute().Subrouter()
	authenticated.HandleFunc("/api/v1/user/getAllUser", profile.GetAllUser).Methods("GET").Handler(authenticateMiddleware([]string{"Admin"})(http.HandlerFunc(profile.GetAllUser)))
	authenticated.HandleFunc("/api/v1/user/getAUserFESResults", profile.CallFESForActionableInsights).Methods("GET").Handler(authenticateMiddleware([]string{"User"})(http.HandlerFunc(profile.CallFESForActionableInsights)))
	authenticated.HandleFunc("/api/v1/user/getAUserTestResults", profile.CallSelfAssessmentForInsights).Methods("GET").Handler(authenticateMiddleware([]string{"User"})(http.HandlerFunc(profile.CallSelfAssessmentForInsights)))
	authenticated.HandleFunc("/api/v1/user/sendVoucherEmail", profile.ProcessVoucherEmail).Methods("POST").Handler(authenticateMiddleware([]string{"User"})(http.HandlerFunc(profile.ProcessVoucherEmail)))

	//

	// Add CORS support
	corsHandler := handlers.CORS(
		handlers.AllowedOrigins([]string{"http://18.143.164.81:5100"}),         // Update for allowed origins
		handlers.AllowedMethods([]string{"GET", "POST", "PUT", "OPTIONS"}), // Update for allowed HTTP methods
		handlers.AllowedHeaders([]string{"Content-Type", "Authorization"}), // Include Authorization header
	)(router)

	// Start the server
	log.Println("User Microservice is running on port 5100...")
	log.Fatal(http.ListenAndServe(":5100", corsHandler))
}
