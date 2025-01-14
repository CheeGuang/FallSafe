package main

import (
	"authenticationMicroservice/registration"
	"authenticationMicroservice/authentication"
	"log"
	"net/http"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
)

func main() {
	// Initialize the router
	router := mux.NewRouter()

	// Registration endpoints
	router.HandleFunc("/api/v1/authentication/send-verification", registration.SendVerificationCode).Methods("POST")
	router.HandleFunc("/api/v1/authentication/register-user", registration.RegisterUser).Methods("POST")

	// Authentication endpoint
	router.HandleFunc("/api/v1/authentication/login", authentication.AuthenticateUser).Methods("POST")


	// Add CORS support
	corsHandler := handlers.CORS(
		handlers.AllowedOrigins([]string{"http://127.0.0.1:5050"}), // Add allowed origins here
		handlers.AllowedMethods([]string{"GET", "POST", "OPTIONS"}), // Add allowed HTTP methods
		handlers.AllowedHeaders([]string{"Content-Type"}),           // Add allowed headers
	)(router)

	// Start the server
	log.Println("Authentication Microservice is running on port 5050...")
	log.Fatal(http.ListenAndServe(":5050", corsHandler))
}
