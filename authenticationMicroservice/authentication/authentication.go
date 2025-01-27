package authentication

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io/ioutil"
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
	var hashedPassword string
	var userID int
	log.Println("Fetching user details from the User table...")
	err = db.QueryRow("SELECT user_id, password FROM User WHERE email = ?", loginRequest.Email).Scan(&userID, &hashedPassword)
	if err == sql.ErrNoRows {
		log.Println("Email not found.")
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	} else if err != nil {
		log.Printf("Database error: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
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
	token, expiryTime, err := generateJWT(userID)
	if err != nil {
		log.Printf("Error generating JWT token: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Store the token in the `UserAuthentication` table
	log.Println("Storing token in the UserAuthentication table...")
	_, err = db.Exec(`
		INSERT INTO UserAuthentication (user_id, auth_token, token_expiry)
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

func AuthenticateAdmin(w http.ResponseWriter, r *http.Request) {
	log.Println("Handling /admin/login request...")

	// Parse the incoming request
	var loginRequest LoginRequest
	err := json.NewDecoder(r.Body).Decode(&loginRequest)
	if err != nil {
		log.Printf("Error parsing request body: %v", err)
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}
	log.Printf("Parsed login request: %+v", loginRequest)

	// Fetch Admin details from the `Admin` table
	var hashedPassword string
	var adminID int
	log.Println("Fetching admin details from the Admin table...")
	err = db.QueryRow("SELECT admin_id, password FROM Admin WHERE email = ?", loginRequest.Email).Scan(&adminID, &hashedPassword)
	if err == sql.ErrNoRows {
		log.Println("Email not found.")
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	} else if err != nil {
		log.Printf("Database error: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
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

	// Generate Admin JWT Token
	log.Println("Generating JWT token...")
	token, expiryTime, err := generateAdminJWT(adminID)
	if err != nil {
		log.Printf("Error generating JWT token: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Store the token in the `AdminAuthentication` table
	log.Println("Storing token in the AdminAuthentication table...")
	_, err = db.Exec(`
		INSERT INTO AdminAuthentication (admin_id, auth_token, token_expiry)
		VALUES (?, ?, ?)
		ON DUPLICATE KEY UPDATE
		auth_token = VALUES(auth_token), token_expiry = VALUES(token_expiry)`,
		adminID, token, expiryTime)
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

// User structure to hold the response from the GetUserByID endpoint
type User struct {
	ID          int    `json:"user_id"`
	Name        string `json:"name"`
	Email       string `json:"email"`
	PhoneNumber string `json:"phone_number"`
	Address     string `json:"address"`
	Age         string `json:"age"`
}

// generateJWT now fetches user details and includes all values in the JWT
func generateJWT(userID int) (string, time.Time, error) {
	expiryTime := time.Now().Add(24 * time.Hour)

	// Fetch user details from the API
	url := fmt.Sprintf("http://127.0.0.1:5100/api/v1/user/getUser?userID=%d", userID)
	resp, err := http.Get(url)
	if err != nil {
		log.Printf("Error calling GetUserByID API: %v", err)
		return "", expiryTime, err
	}
	defer resp.Body.Close()

	// Check if the response status is OK
	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		log.Printf("Failed to fetch user details: %s", body)
		return "", expiryTime, fmt.Errorf("failed to fetch user details, status code: %d", resp.StatusCode)
	}

	// Parse the response body
	var user User
	err = json.NewDecoder(resp.Body).Decode(&user)
	if err != nil {
		log.Printf("Error decoding user response: %v", err)
		return "", expiryTime, err
	}

	// Generate JWT claims including all user fields
	claims := jwt.MapClaims{
		"user_id":      user.ID,
		"name":         user.Name,
		"email":        user.Email,
		"phone_number": user.PhoneNumber,
		"address":      user.Address,
		"age":          user.Age,
		"role":         "User",
		"exp":          expiryTime.Unix(),
		"iat":          time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString([]byte(jwtSecret))
	return signedToken, expiryTime, err
}

// Struct to hold Admin response from getAdminById in Admin endpoint
type Admin struct {
	UserID int    `json:"user_id"`
	Name   string `json:"name" `
	Email  string `json:"email"`
	Role   string `json:"role"`
}

// generatesJWTtoken for ADMIN, includes all value inside
func generateAdminJWT(adminID int) (string, time.Time, error) {
	expiryTime := time.Now().Add(24 * time.Hour)

	// Fetch user details from the API
	url := fmt.Sprintf("http://127.0.0.1:5200/api/v1/admin/getAdmin?adminID=%d", adminID)
	resp, err := http.Get(url)
	if err != nil {
		log.Printf("Error calling GetAdminByID API: %v", err)
		return "", expiryTime, err
	}
	defer resp.Body.Close()

	// Check if the response status is OK
	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		log.Printf("Failed to fetch admin details: %s", body)
		return "", expiryTime, fmt.Errorf("failed to fetch admin details, status code: %d", resp.StatusCode)
	}

	// Parse the response body
	var admin Admin
	err = json.NewDecoder(resp.Body).Decode(&admin)
	if err != nil {
		log.Printf("Error decoding admin response: %v", err)
		return "", expiryTime, err
	}

	// Generate JWT claims including all admin fields
	claims := jwt.MapClaims{
		"user_id": admin.UserID,
		"name":    admin.Name,
		"email":   admin.Email,
		"role":    admin.Role, // Include role in the JWT claims
		"exp":     expiryTime.Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString([]byte(jwtSecret))
	return signedToken, expiryTime, err
}
