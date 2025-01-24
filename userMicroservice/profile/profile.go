package profile

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
)

var db *sql.DB

func init() {
	// Load environment variables
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	// Initialize database connection
	dbConnection := os.Getenv("DB_CONNECTION")
	if dbConnection == "" {
		log.Fatalf("DB_CONNECTION environment variable is not set")
	}

	log.Println("Initializing database connection...")
	db, err = sql.Open("mysql", dbConnection)
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

// CreateUserRequest represents the structure of the request to create a new user
type CreateUserRequest struct {
	Name        string `json:"name"`
	Email       string `json:"email"`
	PhoneNumber string `json:"phone_number"`
	Address     string `json:"address"`
	Age         string `json:"age"`
}

// CreateUser handles the creation of a new user record in the microservice database
func CreateUser(w http.ResponseWriter, r *http.Request) {
	var req CreateUserRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	// Insert the new user record into the microservice database
	_, err = db.Exec(`
		INSERT INTO User (name, email, phone_number, address, age)
		VALUES (?, ?, ?, ?, ?)`,
		req.Name, req.Email, req.PhoneNumber, req.Address, req.Age,
	)
	if err != nil {
		log.Printf("Error inserting user record: %v", err)
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("User created successfully"))
}

// User represents the structure of a user record
type User struct {
	UserID      int    `json:"user_id"`
	Name        string `json:"name"`
	Email       string `json:"email"`
	PhoneNumber string `json:"phone_number"`
	Address     string `json:"address"`
	Age         string `json:"age"`
}

// GetUserByID handles retrieving a user record from the database by userID
func GetUserByID(w http.ResponseWriter, r *http.Request) {
	// Extract userID from query parameters
	userID := r.URL.Query().Get("userID")
	if userID == "" {
		http.Error(w, "userID is required", http.StatusBadRequest)
		return
	}

	// Prepare the query to fetch user details by userID
	var user User
	err := db.QueryRow(`
		SELECT user_id, name, email, phone_number, address, age
		FROM User
		WHERE user_id = ?`, userID).Scan(
		&user.UserID, &user.Name, &user.Email, &user.PhoneNumber, &user.Address, &user.Age,
	)
	if err == sql.ErrNoRows {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	} else if err != nil {
		log.Printf("Error querying user record: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Respond with the user data as JSON
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(user)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}

//Struct for retriving only name and age with ID
type UserNameAge struct {
	UserID      int    `json:"user_id"`
	Name        string `json:"name"`
	Age         string `json:"age"`	
}

//This function is used by admin in getting the whole list of elderly available
func GetAllUser(w http.ResponseWriter, r *http.Request){
	var userList []UserNameAge
	//Query to fetch all users (id, name, and age)
	rows, err := db.Query(`
		SELECT user_id, name, age
		FROM User`)
	if err != nil {
		log.Printf("Error querying users: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	//Iterate over the rows and scan the values into the users slice
	for rows.Next() {
		var user UserNameAge
		if err := rows.Scan(&user.UserID, &user.Name, &user.Age); err != nil {
			log.Printf("Error scanning user row: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		userList = append(userList, user)
	}
	
	// Check if there was an error while iterating the rows
	if err := rows.Err(); err != nil {
		log.Printf("Error iterating over rows: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	
	// Respond with the list of users as JSON
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(userList)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}
