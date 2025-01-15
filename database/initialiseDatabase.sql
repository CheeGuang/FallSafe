-- **************************************************
-- DATABASE: FallSafe_AuthenticationDB
-- PURPOSE: Handles authentication and registration information
-- **************************************************

-- Drop and recreate the authentication database
DROP DATABASE IF EXISTS FallSafe_AuthenticationDB;
CREATE DATABASE FallSafe_AuthenticationDB;
USE FallSafe_AuthenticationDB;

-- Create the User table
-- PURPOSE: Stores user and admin registration details
CREATE TABLE User (
    user_id SMALLINT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,  -- Unique ID for the user
    email VARCHAR(100) NOT NULL UNIQUE,                              -- Email address
    password VARCHAR(500) DEFAULT NULL,                              -- Password (hashed)
    verification_code VARCHAR(6) DEFAULT NULL,                       -- Verification code for email verification
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,                   -- Account creation timestamp
    INDEX idx_email (email)                                          -- Index for email lookups
);

-- Create the Admin table
-- PURPOSE: Stores admin and admin registration details
CREATE TABLE Admin (
    admin_id SMALLINT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,  -- Unique ID for the admin
    email VARCHAR(100) NOT NULL UNIQUE,                              -- Email address
    password VARCHAR(500) DEFAULT NULL,                              -- Password (hashed)
    verification_code VARCHAR(6) DEFAULT NULL,                       -- Verification code for email verification
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,                   -- Account creation timestamp
    INDEX idx_email (email)                                          -- Index for email lookups
);

-- Create the UserAuthentication table
-- PURPOSE: Stores Userauthentication tokens and expiry information
CREATE TABLE UserAuthentication (
    auth_id SMALLINT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,  -- Unique ID for Userauthentication record
    user_id SMALLINT UNSIGNED NOT NULL,                             -- Associated user ID
    auth_token VARCHAR(500) NOT NULL UNIQUE,                        -- UserAuthentication token
    token_expiry TIMESTAMP NOT NULL,                                -- Expiry timestamp of the token
    INDEX idx_user_id (user_id),                                    -- Index to optimise lookups by user_id
    INDEX idx_token_expiry (token_expiry)                           -- Index to optimise expiry checks
);

-- Create the AdminAuthentication table
-- PURPOSE: Stores adminauthentication tokens and expiry information
CREATE TABLE AdminAuthentication (
    auth_id SMALLINT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,  -- Unique ID for adminauthentication record
    admin_id SMALLINT UNSIGNED NOT NULL,                             -- Associated admin ID
    auth_token VARCHAR(500) NOT NULL UNIQUE,                        -- adminAuthentication token
    token_expiry TIMESTAMP NOT NULL,                                -- Expiry timestamp of the token
    INDEX idx_admin_id (admin_id),                                    -- Index to optimise lookups by admin_id
    INDEX idx_token_expiry (token_expiry)                           -- Index to optimise expiry checks
);

-- **************************************************
-- DATABASE: FallSafe_UserDB
-- PURPOSE: Stores user profile information
-- **************************************************

-- Drop and recreate the user database
DROP DATABASE IF EXISTS FallSafe_UserDB;
CREATE DATABASE FallSafe_UserDB;
USE FallSafe_UserDB;

-- Create the User table
-- PURPOSE: Stores user profile details
CREATE TABLE User (
    user_id SMALLINT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,  -- Unique ID for the user
    name VARCHAR(100) NOT NULL,                                      -- User's name
    email VARCHAR(100) NOT NULL UNIQUE,                              -- User's email address
    age TINYINT UNSIGNED,                                            -- User's age
    address TEXT,                                                    -- User's address
    phone_number VARCHAR(15),                                        -- User's phone number
    INDEX idx_email (email)                                          -- Index for email lookups
);

-- **************************************************
-- DATABASE: FallSafe_FallSafeDB
-- PURPOSE: Tracks device requests for FallSafe devices
-- **************************************************

-- Drop and recreate the FallSafe database
DROP DATABASE IF EXISTS FallSafe_FallSafeDB;
CREATE DATABASE FallSafe_FallSafeDB;
USE FallSafe_FallSafeDB;

-- Create the DeviceRequest table
-- PURPOSE: Tracks user requests for FallSafe devices
CREATE TABLE DeviceRequest (
    request_id SMALLINT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT, -- Unique ID for the request
    user_id SMALLINT UNSIGNED NOT NULL,                               -- Associated user ID
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,                 -- Date of request submission
    delivery_status ENUM('Pending', 'Delivered', 'Cancelled') DEFAULT 'Pending', -- Delivery status
    INDEX idx_user_request_date (user_id, request_date)               -- Composite index
);

-- **************************************************
-- DATABASE: FallSafe_FallsEfficacyScaleDB
-- PURPOSE: Stores FallsEfficacyScale data and user responses
-- **************************************************

-- Drop and recreate the FallsEfficacyScale database
DROP DATABASE IF EXISTS FallSafe_FallsEfficacyScaleDB;
CREATE DATABASE FallSafe_FallsEfficacyScaleDB;
USE FallSafe_FallsEfficacyScaleDB;

-- Create the FallsEfficacyScale table
-- PURPOSE: Stores questions for the Falls Efficacy Scale
CREATE TABLE FallsEfficacyScale (
    question_id SMALLINT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT, -- Unique ID for the question
    question_text TEXT NOT NULL                                       -- The question text
);

-- Create the UserResponse table
-- PURPOSE: Tracks user responses to the FallsEfficacyScale
CREATE TABLE UserResponse (
    response_id SMALLINT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT, -- Unique ID for the response
    user_id SMALLINT UNSIGNED NOT NULL,                                -- Associated user ID
    total_score SMALLINT UNSIGNED CHECK (total_score BETWEEN 16 AND 64) NOT NULL,    -- Total score across all questions
    response_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,                 -- Date of response submission
    INDEX idx_user_response_date (user_id, response_date)              -- Composite index
);

-- Create the UserResponseDetails table
-- PURPOSE: Tracks individual question responses for the FallsEfficacyScale
CREATE TABLE UserResponseDetails (
    detail_id SMALLINT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,   -- Unique ID for the detail record
    response_id SMALLINT UNSIGNED NOT NULL,                            -- Associated response ID
    question_id SMALLINT UNSIGNED NOT NULL,                            -- Associated question ID
    response_score TINYINT UNSIGNED CHECK (response_score BETWEEN 1 AND 4) NOT NULL -- User's response score
);

-- **************************************************
-- DATABASE: FallSafe_SelfAssessmentDB
-- PURPOSE: Stores data from preliminary self-assessments
-- **************************************************

-- Drop and recreate the self-assessment database
DROP DATABASE IF EXISTS FallSafe_SelfAssessmentDB;
CREATE DATABASE FallSafe_SelfAssessmentDB;
USE FallSafe_SelfAssessmentDB;

-- Create the Test table
-- PURPOSE: Stores information about different fall risk tests
CREATE TABLE Test (
    test_id SMALLINT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,    -- Unique ID for the test
    test_name VARCHAR(100) NOT NULL,                                  -- Name of the test
    description TEXT,                                                 -- Test description
    risk_metric VARCHAR(100),                                         -- Risk metric for the test
    enabled BOOLEAN DEFAULT TRUE                                      -- Whether the test is enabled
);

-- Create the UserTestResult table
-- PURPOSE: Tracks results of self-assessment tests completed by users
CREATE TABLE UserTestResult (
    result_id SMALLINT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,  -- Unique ID for the result
    user_id SMALLINT UNSIGNED NOT NULL,                               -- Associated user ID
    test_id SMALLINT UNSIGNED NOT NULL,                               -- Associated test ID
    score DECIMAL(10, 2) NOT NULL,                                    -- Test score
    fall_risk ENUM('Low', 'Moderate', 'High') NOT NULL,               -- Fall risk determined from the score
    test_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,                    -- Date of test completion
    INDEX idx_user_test_date (user_id, test_date)                     -- Composite index
);

-- **************************************************
-- DATABASE: FallSafe_AdminDB
-- PURPOSE: Stores admin data and monitoring details
-- **************************************************

-- Drop and recreate the admin database
DROP DATABASE IF EXISTS FallSafe_AdminDB;
CREATE DATABASE FallSafe_AdminDB;
USE FallSafe_AdminDB;

-- Create the User table
-- PURPOSE: Stores admin profile details
CREATE TABLE User (
    user_id SMALLINT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,  -- Unique ID for the admin
    name VARCHAR(100) NOT NULL,                                      -- Admin's name
    email VARCHAR(100) NOT NULL UNIQUE,                              -- Admin's email address
    role ENUM('Admin') DEFAULT 'Admin',                              -- Role fixed as Admin
    INDEX idx_email (email)                                          -- Index for email lookups
);


-- **************************************************
-- DATABASE: FallSafe_AuthenticationDB
-- Add dummy data
-- **************************************************
USE FallSafe_AuthenticationDB;

-- Insert dummy data into the User table
INSERT INTO User (email, password, verification_code)
VALUES
    ('user1@example.com', '$2a$10$.kXKDW80biUED2npeuui7uZf3wgj0uyVOzC/7XshKWJbtH/jzQnpi', '123456');

-- Insert dummy data into the Admin table
INSERT INTO Admin (email, password, verification_code)
VALUES
    ('admin1@example.com', '$2a$10$.kXKDW80biUED2npeuui7uZf3wgj0uyVOzC/7XshKWJbtH/jzQnpi', '111222');

-- Insert dummy data into the UserAuthentication table
INSERT INTO UserAuthentication (user_id, auth_token, token_expiry)
VALUES
    (1, 'authTokenUser1', '2025-01-16 10:00:00');

-- Insert dummy data into the AdminAuthentication table
INSERT INTO AdminAuthentication (admin_id, auth_token, token_expiry)
VALUES
    (1, 'authTokenAdmin1', '2025-01-16 10:30:00');


-- **************************************************
-- DATABASE: FallSafe_UserDB
-- Add dummy data
-- **************************************************
USE FallSafe_UserDB;

-- Insert dummy data into the User table
INSERT INTO User (name, email, age, address, phone_number) VALUES
('Charlie Brown', 'user1@example.com', 35, '123 Elm Street', '1234567890');

-- **************************************************
-- DATABASE: FallSafe_FallSafeDB
-- Add dummy data
-- **************************************************
USE FallSafe_FallSafeDB;

-- Insert dummy data into the DeviceRequest table
INSERT INTO DeviceRequest (user_id, request_date, delivery_status) VALUES
(1, '2025-01-10 09:00:00', 'Pending');

-- **************************************************
-- DATABASE: FallSafe_FallsEfficacyScaleDB
-- Add dummy data
-- **************************************************
USE FallSafe_FallsEfficacyScaleDB;

-- Insert dummy data into FallsEfficacyScale table
INSERT INTO FallsEfficacyScale (question_text) VALUES
('Cleaning the house (e.g. sweep, vacuum, dust)'),
('Getting dressed or undressed'),
('Preparing simple meals'),
('Taking a bath or shower'),
('Going to the shop'),
('Getting in or out of a chair'),
('Going up or down stairs'),
('Walking around in the neighborhood'),
('Reaching for something above your head or on the ground'),
('Going to answer the telephone before it stops ringing'),
('Walking on a slippery surface (e.g. wet or icy)'),
('Visiting a friend or relative'),
('Walking in a place with crowds'),
('Walking on an uneven surface (e.g. rocky ground, poorly maintained pavement)'),
('Walking up or down a slope'),
('Going out to a social event (e.g. religious service, family gathering, or club meeting)');

-- Insert dummy data into UserResponse table
INSERT INTO UserResponse (user_id, total_score, response_date) VALUES
(1, 48, '2025-01-15 10:00:00');

-- Insert dummy data into UserResponseDetails table
INSERT INTO UserResponseDetails (response_id, question_id, response_score) VALUES
(1, 1, 3),
(1, 2, 2),
(1, 3, 4),
(1, 4, 3),
(1, 5, 2),
(1, 6, 3),
(1, 7, 4),
(1, 8, 3),
(1, 9, 2),
(1, 10, 4),
(1, 11, 3),
(1, 12, 2),
(1, 13, 4),
(1, 14, 3),
(1, 15, 2),
(1, 16, 4);


-- **************************************************
-- DATABASE: FallSafe_SelfAssessmentDB
-- Add dummy data
-- **************************************************
USE FallSafe_SelfAssessmentDB;

-- Insert dummy data into the Test table
INSERT INTO Test (test_name, description, risk_metric, enabled) VALUES
('Balance Test', 'Assess the balance of the user.', 'Balance Score', TRUE),
('Strength Test', 'Evaluate the lower body strength.', 'Strength Score', TRUE);

-- Insert dummy data into the UserTestResult table
INSERT INTO UserTestResult (user_id, test_id, score, fall_risk, test_date) VALUES
(1, 1, 85.5, 'Low', '2025-01-12 10:30:00');

-- **************************************************
-- DATABASE: FallSafe_AdminDB
-- Add dummy data
-- **************************************************
USE FallSafe_AdminDB;

-- Insert dummy data into the User table
INSERT INTO User (name, email, role) VALUES
('Eve Adams', 'admin1@example.com', 'Admin');
