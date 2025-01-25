package main

import (
	"log"
	"net/http"
	//"strings"
	//"os"

	"fallsEfficacyScaleMicroservice/FES"

	"github.com/gorilla/handlers"
	//"github.com/golang-jwt/jwt/v4"
	"github.com/gorilla/mux"
)

// Authentication middleware to validate JWT
/*func authenticateMiddleware(next http.Handler) http.Handler {
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
}*/

func main() {
	// Initialize the router
	router := mux.NewRouter()

	// JWT Authentication Logic
	//authenticated := router.NewRoute().Subrouter()
	//authenticated.Use(authenticateMiddleware)

	// Public APIs
	router.HandleFunc("/api/v1/questions", FES.GetQuestions).Methods("GET")
	router.HandleFunc("/api/v1/saveResponses", FES.SaveResponse).Methods("Post")
	router.HandleFunc("/api/v1/readQuestion", FES.ReadQuestion).Methods("POST")

	

	// Speech generation endpoint
	//authenticated.HandleFunc("/api/v1/readQuestion", openAI.ReadQuestion).Methods("POST")	


	// Add CORS support
	corsHandler := handlers.CORS(
		handlers.AllowedOrigins([]string{"http://127.0.0.1:5250"}), // Update for allowed origins
		handlers.AllowedMethods([]string{"GET", "POST", "PUT", "OPTIONS"}), // Update for allowed HTTP methods
		handlers.AllowedHeaders([]string{"Content-Type", "Authorization"}), // Include Authorization header
	)(router)

	// Start the server
	log.Println("fallsEfficacyScale Microservice is running on port 5250...")
	log.Fatal(http.ListenAndServe(":5250", corsHandler))
}
