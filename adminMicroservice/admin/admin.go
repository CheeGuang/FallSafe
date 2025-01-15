package admin

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

// Admin represents the structure of a admin record
type Admin struct {
	UserID int    `json:"user_id"`
	Name   string `json:"name" `
	Email  string `json:"email"`
	Role   string `json:"role"`
}

// GetAdminByID handles retrieving a admin record from the database by adminID
func GetAdminByID(w http.ResponseWriter, r *http.Request) {
	// Extract userID from query parameters
	adminID := r.URL.Query().Get("adminID")
	if adminID == "" {
		http.Error(w, "adminID is required", http.StatusBadRequest)
		return
	}

	// Prepare the query to fetch admin details by adminID
	var admin Admin
	err := db.QueryRow(`
		SELECT user_id, name, email, role
		FROM User
		WHERE user_id = ?`, adminID).Scan(
		&admin.UserID, &admin.Name, &admin.Email, &admin.Role,
	)
	if err == sql.ErrNoRows {
		http.Error(w, "Admin not found", http.StatusNotFound)
		return
	} else if err != nil {
		log.Printf("Error querying admin record: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Respond with the admin data as JSON
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(admin)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}
