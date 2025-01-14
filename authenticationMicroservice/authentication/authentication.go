package authentication

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

var db *sql.DB
var jwtSecret string // JWT secret key loaded from environment variables

func init() {
	// Load environment variables
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

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

	// Load JWT secret
	jwtSecret = os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatalf("JWT_SECRET not set in .env")
	}
}

// LoginRequest represents the structure of a login request
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginResponse represents the structure of a login response
type LoginResponse struct {
	Token string `json:"token"`
}

// AuthenticateUser handles user login by verifying credentials and returning a JWT token
func AuthenticateUser(w http.ResponseWriter, r *http.Request) {
	log.Println("Handling /login request...")

	// Parse the incoming request
	var loginRequest LoginRequest
	err := json.NewDecoder(r.Body).Decode(&loginRequest)
	if err != nil {
		log.Printf("Error parsing request body: %v", err)
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}
	log.Printf("Parsed login request: %+v", loginRequest)

	// Fetch user details from the `User` table
	var hashedPassword, name, email, contactNumber, address string
	var userID int
	log.Println("Fetching user details from the User table...")
	err = db.QueryRow("SELECT user_id, password, name, email, contact_number, address FROM User WHERE email = ?", loginRequest.Email).Scan(&userID, &hashedPassword, &name, &email, &contactNumber, &address)
	if err == sql.ErrNoRows {
		log.Println("Email not found.")
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	} else if err != nil {
		log.Printf("Database error: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Verify if the password is hashed
	if hashedPassword == "" {
		log.Println("User password is not set in the database.")
		http.Error(w, "Password not set for this account", http.StatusUnauthorized)
		return
	}

	// Verify the password
	log.Println("Verifying password...")
	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(loginRequest.Password))
	if err != nil {
		log.Println("Invalid password.")
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	// Generate JWT token
	log.Println("Generating JWT token...")
	token, expiryTime, err := generateJWT(userID, name, email, contactNumber, address)
	if err != nil {
		log.Printf("Error generating JWT token: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Store the token in the `Authentication` table
	log.Println("Storing token in the Authentication table...")
	_, err = db.Exec(`
		INSERT INTO Authentication (user_id, auth_token, token_expiry)
		VALUES (?, ?, ?)
		ON DUPLICATE KEY UPDATE
		auth_token = VALUES(auth_token), token_expiry = VALUES(token_expiry)`,
		userID, token, expiryTime)
	if err != nil {
		log.Printf("Error storing token in the database: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Respond with the token
	log.Println("Login successful. Returning token...")
	response := LoginResponse{Token: token}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// generateJWT generates a JWT token for an authenticated user and returns the token and its expiry time
func generateJWT(userID int, name, email, contactNumber, address string) (string, time.Time, error) {
	expiryTime := time.Now().Add(24 * time.Hour) // Token expires in 24 hours

	claims := jwt.MapClaims{
		"user_id":        userID,
		"name":           name,
		"email":          email,
		"contact_number": contactNumber,
		"address":        address,
		"exp":            expiryTime.Unix(),
		"iat":            time.Now().Unix(),
	}

	// Create a new JWT token with the claims
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Sign the token with the JWT secret key
	signedToken, err := token.SignedString([]byte(jwtSecret))
	return signedToken, expiryTime, err
}