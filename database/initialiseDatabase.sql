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
    video_url VARCHAR(255),                                           -- Video URL explaining the test
    step_1 TEXT NOT NULL,                                             -- Mandatory first step
    step_2 TEXT NULL,                                                 -- Optional second step
    step_3 TEXT NULL,                                                 -- Optional third step
    step_4 TEXT NULL,                                                 -- Optional fourth step
    step_5 TEXT NULL,                                                 -- Optional fifth step
    enabled BOOLEAN DEFAULT TRUE                                      -- Whether the test is enabled
);

-- Create the TestSession table
-- PURPOSE: Tracks test sessions where users complete all required tests
CREATE TABLE TestSession (
    session_id SMALLINT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,  -- Unique ID for the session
    user_id SMALLINT UNSIGNED NOT NULL,                                -- Associated user ID
    session_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,                  -- Date and time of the session
    avg_score SMALLINT UNSIGNED NULL,
    session_notes TEXT NULL,                                           -- Optional notes about the session
    INDEX idx_user_session (user_id, session_date)                    -- Composite index for user ID and session date
);

-- Create the UserTestResult table
-- PURPOSE: Tracks results of self-assessment tests completed by users
CREATE TABLE UserTestResult (
    result_id SMALLINT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,  -- Unique ID for the result
    user_id SMALLINT UNSIGNED NOT NULL,                               -- Associated user ID
    session_id SMALLINT UNSIGNED NOT NULL,                            -- Associated session ID
    test_id SMALLINT UNSIGNED NOT NULL,                               -- Associated test ID
    time_taken DECIMAL(10, 3) NOT NULL CHECK (time_taken >= 0),        -- Time taken to complete the test in seconds
    abrupt_percentage TINYINT UNSIGNED NOT NULL CHECK (abrupt_percentage BETWEEN 0 AND 100), -- Abrupt percentage (0-100)
    risk_level ENUM('low', 'moderate', 'high') NOT NULL,              -- Risk level (low, moderate, high)
    test_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,                    -- Date of test completion
    INDEX idx_user_test_date (user_id, test_date),                    -- Composite index for user ID and test date
    FOREIGN KEY (test_id) REFERENCES Test(test_id) ON DELETE CASCADE,  -- Foreign key constraint to Test table
    FOREIGN KEY (session_id) REFERENCES TestSession(session_id) ON DELETE CASCADE -- Foreign key to TestSession
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
-- DATABASE: ConsultationDB
-- PURPOSE: Handles all Whereby video call consultation data
-- **************************************************

-- Drop and recreate the ConsultationDB database
DROP DATABASE IF EXISTS ConsultationDB;
CREATE DATABASE ConsultationDB;
USE ConsultationDB;

-- Create the Appointments table
-- PURPOSE: Stores details of video call consultations
CREATE TABLE Appointments (
    AppointmentID INT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT, -- Unique ID for the appointment
    UserID INT UNSIGNED NOT NULL,                                 -- Associated member ID
    AdminID INT UNSIGNED NOT NULL,                                  -- Associated admin ID
    startDateTime NVARCHAR(40) NOT NULL,                           -- Start time of the appointment
    endDateTime NVARCHAR(40) NOT NULL,                             -- End time of the appointment
    ParticipantURL NVARCHAR(1000) NOT NULL,                        -- URL for the participant
    HostRoomURL NVARCHAR(1000) NOT NULL,                           -- URL for the host (admin)
    INDEX idx_member_id (MemberID),                                -- Index for quick lookup by MemberID
    INDEX idx_admin_id (AdminID),                                  -- Index for quick lookup by AdminID
    INDEX idx_start_datetime (startDateTime)                       -- Index to optimize queries by start time
);

-- **************************************************
-- DATABASE: FallSafe_AuthenticationDB
-- Add dummy data
-- **************************************************
USE FallSafe_AuthenticationDB;

-- Insert dummy data into the User table
INSERT INTO User (email, password, verification_code)
VALUES
    -- Ages 60–69
    ('user1@example.com', '$2a$10$.kXKDW80biUED2npeuui7uZf3wgj0uyVOzC/7XshKWJbtH/jzQnpi', '234567'),
    ('ben.lim@example.com', '$2a$10$.kXKDW80biUED2npeuui7uZf3wgj0uyVOzC/7XshKWJbtH/jzQnpi', '345678'),
    ('clara.ng@example.com', '$2a$10$.kXKDW80biUED2npeuui7uZf3wgj0uyVOzC/7XshKWJbtH/jzQnpi', '456789'),
    ('daniel.teo@example.com', '$2a$10$.kXKDW80biUED2npeuui7uZf3wgj0uyVOzC/7XshKWJbtH/jzQnpi', '567890'),
    ('eve.wong@example.com', '$2a$10$.kXKDW80biUED2npeuui7uZf3wgj0uyVOzC/7XshKWJbtH/jzQnpi', '678901'),

    -- Ages 70–79
    ('frank.lee@example.com', '$2a$10$.kXKDW80biUED2npeuui7uZf3wgj0uyVOzC/7XshKWJbtH/jzQnpi', '789012'),
    ('grace.ho@example.com', '$2a$10$.kXKDW80biUED2npeuui7uZf3wgj0uyVOzC/7XshKWJbtH/jzQnpi', '890123'),
    ('hank.low@example.com', '$2a$10$.kXKDW80biUED2npeuui7uZf3wgj0uyVOzC/7XshKWJbtH/jzQnpi', '901234'),
    ('irene.tan@example.com', '$2a$10$.kXKDW80biUED2npeuui7uZf3wgj0uyVOzC/7XshKWJbtH/jzQnpi', '012345'),
    ('jackie.goh@example.com', '$2a$10$.kXKDW80biUED2npeuui7uZf3wgj0uyVOzC/7XshKWJbtH/jzQnpi', '123457'),
    ('karen.tay@example.com', '$2a$10$.kXKDW80biUED2npeuui7uZf3wgj0uyVOzC/7XshKWJbtH/jzQnpi', '234568'),

    -- Ages 80–95
    ('leo.chua@example.com', '$2a$10$.kXKDW80biUED2npeuui7uZf3wgj0uyVOzC/7XshKWJbtH/jzQnpi', '345679'),
    ('mia.chen@example.com', '$2a$10$.kXKDW80biUED2npeuui7uZf3wgj0uyVOzC/7XshKWJbtH/jzQnpi', '456780'),
    ('nathan.chew@example.com', '$2a$10$.kXKDW80biUED2npeuui7uZf3wgj0uyVOzC/7XshKWJbtH/jzQnpi', '567891'),
    ('olivia.koh@example.com', '$2a$10$.kXKDW80biUED2npeuui7uZf3wgj0uyVOzC/7XshKWJbtH/jzQnpi', '678902'),
    ('paul.loo@example.com', '$2a$10$.kXKDW80biUED2npeuui7uZf3wgj0uyVOzC/7XshKWJbtH/jzQnpi', '789013');
    

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
-- Ages 60–69 (5 users)
('Alice Tan', 'user1@example.com', 61, '11 Maple Lane', '9012345601'),
('Ben Lim', 'ben.lim@example.com', 65, '22 Oak Avenue', '9123456702'),
('Clara Ng', 'clara.ng@example.com', 68, '33 Pine Street', '9234567803'),
('Daniel Teo', 'daniel.teo@example.com', 63, '44 Birch Road', '9345678904'),
('Eve Wong', 'eve.wong@example.com', 66, '55 Elm Crescent', '9456789005'),

-- Ages 70–79 (6 users)
('Frank Lee', 'frank.lee@example.com', 71, '66 Cedar Drive', '9567890106'),
('Grace Ho', 'grace.ho@example.com', 74, '77 Aspen Way', '9678901207'),
('Hank Low', 'hank.low@example.com', 75, '88 Fir Circle', '9789012308'),
('Irene Tan', 'irene.tan@example.com', 78, '99 Palm Boulevard', '9890123409'),
('Jackie Goh', 'jackie.goh@example.com', 70, '101 Redwood Plaza', '9901234500'),
('Karen Tay', 'karen.tay@example.com', 73, '112 Poplar Lane', '9012345600'),

-- Ages 80–95 (5 users)
('Leo Chua', 'leo.chua@example.com', 81, '123 Willow Terrace', '9123456701'),
('Mia Chen', 'mia.chen@example.com', 85, '134 Cypress Avenue', '9234567802'),
('Nathan Chew', 'nathan.chew@example.com', 89, '145 Spruce Path', '9345678903'),
('Olivia Koh', 'olivia.koh@example.com', 92, '156 Alder Court', '9456789004'),
('Paul Loo', 'paul.loo@example.com', 94, '167 Magnolia Lane', '9567890105');

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
('Cleaning the house (example: sweeping, vacuuming, dusting)'),
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
(1, 32, '2025-01-15 10:00:00'),
(2, 28, '2025-01-15 10:30:00'),
(3, 35, '2025-01-15 11:00:00'),
(4, 30, '2025-01-15 11:30:00'),
(5, 25, '2025-01-15 12:00:00'),
(6, 40, '2025-01-16 10:00:00'),
(7, 45, '2025-01-16 10:30:00'),
(8, 42, '2025-01-16 11:00:00'),
(9, 46, '2025-01-16 11:30:00'),
(10, 48, '2025-01-16 12:00:00'),
(11, 55, '2025-01-17 10:00:00'),
(12, 58, '2025-01-17 10:30:00'),
(13, 60, '2025-01-17 11:00:00'),
(14, 62, '2025-01-17 11:30:00'),
(15, 63, '2025-01-18 10:00:00'),
(16, 64, '2025-01-18 10:30:00'),
-- February 
(1, 31, '2025-02-01 10:00:00'), 
(2, 28, '2025-02-02 10:00:00'),
(3, 36, '2025-02-03 10:00:00'),
(4, 37, '2025-02-04 10:00:00'),
(5, 30, '2025-02-05 10:00:00'),
(6, 46, '2025-02-06 10:00:00'),
(7, 43, '2025-02-07 10:00:00'),
(8, 44, '2025-02-08 10:00:00'),
(9, 53, '2025-02-01 10:00:00'),
(10, 48, '2025-02-02 10:00:00'),
(11, 58, '2025-02-03 10:00:00'),
(12, 60, '2025-02-04 10:00:00'),
(13, 56, '2025-02-05 10:00:00'),
(14, 62, '2025-02-06 10:00:00'),
(15, 62, '2025-02-07 10:00:00'),
(16, 64, '2025-02-08 10:00:00');

-- Insert dummy data into UserResponseDetails table
INSERT INTO UserResponseDetails (response_id, question_id, response_score) VALUES
-- User 1
(1, 1, 2), (1, 2, 1), (1, 3, 2), (1, 4, 3), (1, 5, 1), (1, 6, 2),
(1, 7, 3), (1, 8, 2), (1, 9, 2), (1, 10, 3), (1, 11, 2), (1, 12, 2),
(1, 13, 3), (1, 14, 2), (1, 15, 1), (1, 16, 3),
-- User 2
(2, 1, 1), (2, 2, 1), (2, 3, 1), (2, 4, 2), (2, 5, 1), (2, 6, 1),
(2, 7, 2), (2, 8, 1), (2, 9, 1), (2, 10, 2), (2, 11, 1), (2, 12, 1),
(2, 13, 2), (2, 14, 1), (2, 15, 1), (2, 16, 2),
-- User 3
(3, 1, 3), (3, 2, 2), (3, 3, 2), (3, 4, 3), (3, 5, 2), (3, 6, 2),
(3, 7, 3), (3, 8, 2), (3, 9, 2), (3, 10, 3), (3, 11, 2), (3, 12, 2),
(3, 13, 3), (3, 14, 2), (3, 15, 1), (3, 16, 3),
-- User 4
(4, 1, 2), (4, 2, 1), (4, 3, 2), (4, 4, 3), (4, 5, 1), (4, 6, 2),
(4, 7, 3), (4, 8, 2), (4, 9, 2), (4, 10, 3), (4, 11, 2), (4, 12, 2),
(4, 13, 3), (4, 14, 2), (4, 15, 1), (4, 16, 3),
-- User 5
(5, 1, 1), (5, 2, 1), (5, 3, 2), (5, 4, 3), (5, 5, 1), (5, 6, 1),
(5, 7, 2), (5, 8, 1), (5, 9, 1), (5, 10, 2), (5, 11, 1), (5, 12, 1),
(5, 13, 2), (5, 14, 1), (5, 15, 1), (5, 16, 2),
-- User 6
(6, 1, 3), (6, 2, 3), (6, 3, 3), (6, 4, 3), (6, 5, 2), (6, 6, 2),
(6, 7, 3), (6, 8, 2), (6, 9, 2), (6, 10, 3), (6, 11, 3), (6, 12, 3),
(6, 13, 3), (6, 14, 2), (6, 15, 2), (6, 16, 3),
-- User 7
(7, 1, 3), (7, 2, 3), (7, 3, 3), (7, 4, 3), (7, 5, 3), (7, 6, 3),
(7, 7, 3), (7, 8, 3), (7, 9, 3), (7, 10, 3), (7, 11, 3), (7, 12, 3),
(7, 13, 3), (7, 14, 3), (7, 15, 3), (7, 16, 3),
-- User 8
(8, 1, 3), (8, 2, 2), (8, 3, 3), (8, 4, 3), (8, 5, 2), (8, 6, 2),
(8, 7, 3), (8, 8, 3), (8, 9, 2), (8, 10, 3), (8, 11, 2), (8, 12, 2),
(8, 13, 3), (8, 14, 3), (8, 15, 2), (8, 16, 3),
-- User 9
(9, 1, 3), (9, 2, 2), (9, 3, 3), (9, 4, 3), (9, 5, 3), (9, 6, 3),
(9, 7, 3), (9, 8, 3), (9, 9, 3), (9, 10, 3), (9, 11, 3), (9, 12, 3),
(9, 13, 3), (9, 14, 3), (9, 15, 3), (9, 16, 3),
-- User 10
(10, 1, 3), (10, 2, 3), (10, 3, 3), (10, 4, 3), (10, 5, 3), (10, 6, 3),
(10, 7, 3), (10, 8, 3), (10, 9, 3), (10, 10, 3), (10, 11, 3), (10, 12, 3),
(10, 13, 3), (10, 14, 3), (10, 15, 3), (10, 16, 3),
-- User 11
(11, 1, 4), (11, 2, 4), (11, 3, 4), (11, 4, 4), (11, 5, 3), (11, 6, 3),
(11, 7, 4), (11, 8, 4), (11, 9, 3), (11, 10, 4), (11, 11, 3), (11, 12, 4),
(11, 13, 4), (11, 14, 3), (11, 15, 3), (11, 16, 4),
-- User 12
(12, 1, 4), (12, 2, 4), (12, 3, 4), (12, 4, 4), (12, 5, 4), (12, 6, 4),
(12, 7, 4), (12, 8, 4), (12, 9, 4), (12, 10, 4), (12, 11, 4), (12, 12, 4),
(12, 13, 4), (12, 14, 4), (12, 15, 4), (12, 16, 4),
-- User 13
(13, 1, 4), (13, 2, 4), (13, 3, 3), (13, 4, 4), (13, 5, 4), (13, 6, 4),
(13, 7, 4), (13, 8, 4), (13, 9, 4), (13, 10, 4), (13, 11, 3), (13, 12, 4),
(13, 13, 4), (13, 14, 4), (13, 15, 4), (13, 16, 3),
-- User 14
(14, 1, 4), (14, 2, 3), (14, 3, 4), (14, 4, 4), (14, 5, 4), (14, 6, 4),
(14, 7, 4), (14, 8, 4), (14, 9, 4), (14, 10, 4), (14, 11, 4), (14, 12, 4),
(14, 13, 4), (14, 14, 3), (14, 15, 4), (14, 16, 4),
-- User 15
(15, 1, 4), (15, 2, 3), (15, 3, 4), (15, 4, 4), (15, 5, 4), (15, 6, 4),
(15, 7, 4), (15, 8, 4), (15, 9, 4), (15, 10, 4), (15, 11, 4), (15, 12, 4),
(15, 13, 4), (15, 14, 4), (15, 15, 4), (15, 16, 4),
-- User 16
(16, 1, 4), (16, 2, 4), (16, 3, 4), (16, 4, 4), (16, 5, 4), (16, 6, 4),
(16, 7, 4), (16, 8, 4), (16, 9, 4), (16, 10, 4), (16, 11, 4), (16, 12, 4),
(16, 13, 4), (16, 14, 4), (16, 15, 4), (16, 16, 4),
-- February results

-- User 1
(17, 1, 2), (17, 2, 1), (17, 3, 2), (17, 4, 3), (17, 5, 1), (17, 6, 2),
(17, 7, 2), (17, 8, 2), (17, 9, 3), (17, 10, 3), (17, 11, 3), (17, 12, 1),
(17, 13, 1), (17, 14, 2), (17, 15, 1), (17, 16, 2),
-- User 2
(18, 1, 2), (18, 2, 1), (18, 3, 1), (18, 4, 2), (18, 5, 2), (18, 6, 1),
(18, 7, 2), (18, 8, 2), (18, 9, 1), (18, 10, 2), (18, 11, 3), (18, 12, 1),
(18, 13, 2), (18, 14, 3), (18, 15, 1), (18, 16, 2),
-- User 3
(19, 1, 1), (19, 2, 2), (19, 3, 3), (19, 4, 3), (19, 5, 2), (19, 6, 2),
(19, 7, 3), (19, 8, 2), (19, 9, 3), (19, 10, 3), (19, 11, 2), (19, 12, 2),
(19, 13, 3), (19, 14, 2), (19, 15, 1), (19, 16, 2),
-- User 4
(20, 1, 3), (20, 2, 1), (20, 3, 2), (20, 4, 3), (20, 5, 1), (20, 6, 2),
(20, 7, 3), (20, 8, 1), (20, 9, 2), (20, 10, 3), (20, 11, 3), (20, 12, 2),
(20, 13, 3), (20, 14, 2), (20, 15, 3), (20, 16, 3),
-- User 5
(21, 1, 2), (21, 2, 1), (21, 3, 3), (21, 4, 3), (21, 5, 1), (21, 6, 1),
(21, 7, 2), (21, 8, 1), (21, 9, 2), (21, 10, 2), (21, 11, 4), (21, 12, 1),
(21, 13, 3), (21, 14, 1), (21, 15, 2), (21, 16, 1),
-- User 6
(22, 1, 3), (22, 2, 3), (22, 3, 3), (22, 4, 3), (22, 5, 2), (22, 6, 2),
(22, 7, 3), (22, 8, 3), (22, 9, 4), (22, 10, 3), (22, 11, 4), (22, 12, 3),
(22, 13, 3), (22, 14, 2), (22, 15, 2), (22, 16, 3),
-- User 7
(23, 1, 3), (23, 2, 3), (23, 3, 3), (23, 4, 3), (23, 5, 2), (23, 6, 2),
(23, 7, 3), (23, 8, 3), (23, 9, 3), (23, 10, 3), (23, 11, 3), (23, 12, 3),
(23, 13, 3), (23, 14, 2), (23, 15, 2), (23, 16, 2),
-- User 8
(24, 1, 2), (24, 2, 2), (24, 3, 3), (24, 4, 1), (24, 5, 2), (24, 6, 3),
(24, 7, 3), (24, 8, 3), (24, 9, 4), (24, 10, 3), (24, 11, 4), (24, 12, 3),
(24, 13, 4), (24, 14, 3), (24, 15, 2), (24, 16, 2),
-- User 9
(25, 1, 3), (25, 2, 2), (25, 3, 3), (25, 4, 3), (25, 5, 3), (25, 6, 3),
(25, 7, 4), (25, 8, 4), (25, 9, 4), (25, 10, 3), (25, 11, 4), (25, 12, 3),
(25, 13, 4), (25, 14, 4), (25, 15, 3), (25, 16, 3),
-- User 10
(26, 1, 3), (26, 2, 3), (26, 3, 3), (26, 4, 2), (26, 5, 3), (26, 6, 3),
(26, 7, 3), (26, 8, 3), (26, 9, 4), (26, 10, 3), (26, 11, 4), (26, 12, 3),
(26, 13, 3), (26, 14, 3), (26, 15, 3), (26, 16, 2),
-- User 11
(27, 1, 4), (27, 2, 4), (27, 3, 4), (27, 4, 4), (27, 5, 3), (27, 6, 4),
(27, 7, 4), (27, 8, 4), (27, 9, 3), (27, 10, 4), (27, 11, 3), (27, 12, 4),
(27, 13, 4), (27, 14, 3), (27, 15, 3), (27, 16, 3),
-- User 12
(28, 1, 3), (28, 2, 4), (28, 3, 3), (28, 4, 4), (28, 5, 4), (28, 6, 4),
(28, 7, 4), (28, 8, 4), (28, 9, 4), (28, 10, 4), (28, 11, 4), (28, 12, 3),
(28, 13, 4), (28, 14, 4), (28, 15, 4), (28, 16, 3),
-- User 13
(29, 1, 3), (29, 2, 4), (29, 3, 4), (29, 4, 4), (29, 5, 4), (29, 6, 3),
(29, 7, 4), (29, 8, 4), (29, 9, 3), (29, 10, 4), (29, 11, 3), (29, 12, 4),
(29, 13, 3), (29, 14, 3), (29, 15, 3), (29, 16, 3),
-- User 14
(30, 1, 3), (30, 2, 3), (30, 3, 4), (30, 4, 4), (30, 5, 4), (30, 6, 4),
(30, 7, 3), (30, 8, 4), (30, 9, 4), (30, 10, 4), (30, 11, 4), (30, 12, 4),
(30, 13, 4), (30, 14, 4), (30, 15, 4), (30, 16, 4),
-- User 15
(31, 1, 4), (31, 2, 4), (31, 3, 3), (31, 4, 3), (31, 5, 4), (31, 6, 4),
(31, 7, 4), (31, 8, 4), (31, 9, 4), (31, 10, 4), (31, 11, 4), (31, 12, 4),
(31, 13, 4), (31, 14, 4), (31, 15, 4), (31, 16, 4),
-- User 16
(32, 1, 4), (32, 2, 4), (32, 3, 4), (32, 4, 4), (32, 5, 4), (32, 6, 4),
(32, 7, 4), (32, 8, 4), (32, 9, 4), (32, 10, 4), (32, 11, 4), (32, 12, 4),
(32, 13, 4), (32, 14, 4), (32, 15, 4), (32, 16, 4);


-- **************************************************
-- DATABASE: FallSafe_SelfAssessmentDB
-- Add dummy data
-- **************************************************
USE FallSafe_SelfAssessmentDB;

-- Insert data for the Timed Up and Go Test
INSERT INTO Test (test_name, description, risk_metric, video_url, step_1, step_2, step_3, step_4, step_5) VALUES
(
    'Timed Up and Go Test',
    'Measures mobility and balance by timing how quickly you stand, walk, and sit.',
    'Taking more than 12 seconds to complete indicates an increased risk of falls.',
    'https://fallsafe.s3.ap-southeast-1.amazonaws.com/Self+Assessment+Video/TUG+Video+Demo.mp4',
    'Start seated on a chair with your back straight',
    'Stand up from the chair when ready.',
    'Walk 3 meters forward, covering a short distance.',
    'Turn around and walk back to the chair.',
    'Sit back down on the chair to complete the test.'
);

-- Insert data for the Five Times Sit to Stand Test
INSERT INTO Test (test_name, description, risk_metric, video_url, step_1, step_2, step_3, step_4) VALUES
(
    'Five Times Sit to Stand Test',
    'Tests strength and balance by timing repeated sit-to-stand movements.',
    'Taking more than 14 seconds to complete indicates an increased risk of falls.',
    'https://fallsafe.s3.ap-southeast-1.amazonaws.com/Self+Assessment+Video/5+times+Stand+and+Sit+Video+Demo.mp4',
    'Start seated on a chair with your arms crossed over your chest.',
    'Stand up fully, then sit back down as quickly as possible.',
    'Repeat this movement five times without stopping.',
    'Stop the test after sitting down the fifth time.'
);

-- Insert data for the Dynamic Gait Index (DGI)
INSERT INTO Test (test_name, description, risk_metric, video_url, step_1, step_2, step_3, step_4) VALUES
(
    'Dynamic Gait Index (DGI)',
    'Evaluates balance and coordination during different walking tasks.',
    'Taking more than 20 seconds to complete indicates an increased risk of falls.',
    'https://fallsafe.s3.ap-southeast-1.amazonaws.com/Self+Assessment+Video/Dynamic+Gait+Test+Video+Demo.mp4',
    'Walk 6 steps forward at a normal pace.',
    'Turn your head to the right and walk 6 steps slowly in the same direction.',
    'Turn around, face forward, and walk quickly back to your starting point.',
    'Stop the test after returning to your starting position'
);

-- Insert data for the 4 Stage Balance Test
INSERT INTO Test (test_name, description, risk_metric, video_url, step_1, step_2, step_3, step_4, step_5) VALUES
(
    '4 Stage Balance Test',
    'Tests static balance by holding various standing positions.',
    'Inability to balance for 10 seconds in any position indicates a higher risk of falls.',
    'https://fallsafe.s3.ap-southeast-1.amazonaws.com/Self+Assessment+Video/4+Stage+Balance+Test+Video+Demo.mp4',
    'Stand with feet together and hold for 10 seconds.',
    'Right foot takes half a step forward, hold for 10 seconds.',
    'Right foot directly in front of left foot, hold for 10 seconds.',
    'Stand on one foot (your choice) for 10 seconds.',
    'Stop if balance is lost or all steps are completed.'
);

-- Insert TestSession data for 5 users (5 sessions each, every 6 months)
INSERT INTO TestSession (user_id, session_date, avg_score, session_notes) VALUES
(1, DATE_ADD(CURRENT_DATE, INTERVAL -30 MONTH), '22.125', 'Routine assessment 2.5 years ago'),
(1, DATE_ADD(CURRENT_DATE, INTERVAL -24 MONTH), '20.000', 'Routine assessment 2 years ago'),
(1, DATE_ADD(CURRENT_DATE, INTERVAL -18 MONTH), '18.500', 'Routine assessment 1.5 years ago'),
(1, DATE_ADD(CURRENT_DATE, INTERVAL -12 MONTH), '16.375', 'Routine assessment 1 year ago'),
(1, DATE_ADD(CURRENT_DATE, INTERVAL -6 MONTH), '14.625', 'Routine assessment 6 months ago'),

(2, DATE_ADD(CURRENT_DATE, INTERVAL -30 MONTH), '18.750', 'Routine assessment 2.5 years ago'),
(2, DATE_ADD(CURRENT_DATE, INTERVAL -24 MONTH), '21.000', 'Routine assessment 2 years ago'),
(2, DATE_ADD(CURRENT_DATE, INTERVAL -18 MONTH), '23.250', 'Routine assessment 1.5 years ago'),
(2, DATE_ADD(CURRENT_DATE, INTERVAL -12 MONTH), '26.500', 'Routine assessment 1 year ago'),
(2, DATE_ADD(CURRENT_DATE, INTERVAL -6 MONTH), '29.000', 'Routine assessment 6 months ago'),

(3, DATE_ADD(CURRENT_DATE, INTERVAL -30 MONTH), '25.750', 'Routine assessment 2.5 years ago'),
(3, DATE_ADD(CURRENT_DATE, INTERVAL -24 MONTH), '23.000', 'Routine assessment 2 years ago'),
(3, DATE_ADD(CURRENT_DATE, INTERVAL -18 MONTH), '20.500', 'Routine assessment 1.5 years ago'),
(3, DATE_ADD(CURRENT_DATE, INTERVAL -12 MONTH), '17.250', 'Routine assessment 1 year ago'),
(3, DATE_ADD(CURRENT_DATE, INTERVAL -6 MONTH), '13.750', 'Routine assessment 6 months ago'),

(4, DATE_ADD(CURRENT_DATE, INTERVAL -30 MONTH), '16.750', 'Routine assessment 2.5 years ago'),
(4, DATE_ADD(CURRENT_DATE, INTERVAL -24 MONTH), '19.250', 'Routine assessment 2 years ago'),
(4, DATE_ADD(CURRENT_DATE, INTERVAL -18 MONTH), '21.500', 'Routine assessment 1.5 years ago'),
(4, DATE_ADD(CURRENT_DATE, INTERVAL -12 MONTH), '24.500', 'Routine assessment 1 year ago'),
(4, DATE_ADD(CURRENT_DATE, INTERVAL -6 MONTH), '28.250', 'Routine assessment 6 months ago'),

(5, DATE_ADD(CURRENT_DATE, INTERVAL -30 MONTH), '23.000', 'Routine assessment 2.5 years ago'),
(5, DATE_ADD(CURRENT_DATE, INTERVAL -24 MONTH), '18.750', 'Routine assessment 2 years ago'),
(5, DATE_ADD(CURRENT_DATE, INTERVAL -18 MONTH), '25.750', 'Routine assessment 1.5 years ago'),
(5, DATE_ADD(CURRENT_DATE, INTERVAL -12 MONTH), '20.750', 'Routine assessment 1 year ago'),
(5, DATE_ADD(CURRENT_DATE, INTERVAL -6 MONTH), '22.000', 'Routine assessment 6 months ago');



-- Insert UserTestResult data for all users

-- User 1: Gradual improvement in performance
INSERT INTO UserTestResult (user_id, session_id, test_id, time_taken, abrupt_percentage, risk_level, test_date) VALUES
(1, 1, 1, 25.500, 30, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -30 MONTH)), -- Test 1
(1, 1, 2, 20.000, 40, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -30 MONTH)), -- Test 2
(1, 1, 3, 15.000, 20, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -30 MONTH)),    -- Test 3 (Good performance)
(1, 1, 4, 30.000, 50, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -30 MONTH)), -- Test 4

(1, 2, 1, 23.000, 25, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -24 MONTH)),
(1, 2, 2, 18.500, 35, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -24 MONTH)),
(1, 2, 3, 13.000, 15, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -24 MONTH)),
(1, 2, 4, 27.500, 45, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -24 MONTH)),

(1, 3, 1, 20.000, 20, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -18 MONTH)),
(1, 3, 2, 17.000, 30, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -18 MONTH)),
(1, 3, 3, 12.000, 10, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -18 MONTH)),
(1, 3, 4, 25.000, 40, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -18 MONTH)),

(1, 4, 1, 18.000, 15, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -12 MONTH)),
(1, 4, 2, 15.000, 25, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -12 MONTH)),
(1, 4, 3, 10.000, 5, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -12 MONTH)),
(1, 4, 4, 22.500, 35, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -12 MONTH)),

(1, 5, 1, 15.000, 10, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -6 MONTH)),
(1, 5, 2, 12.500, 20, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -6 MONTH)),
(1, 5, 3, 9.000, 5, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -6 MONTH)),
(1, 5, 4, 20.000, 30, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -6 MONTH));

-- User 2: Gradual decline in performance
INSERT INTO UserTestResult (user_id, session_id, test_id, time_taken, abrupt_percentage, risk_level, test_date) VALUES
(2, 6, 1, 20.000, 20, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -30 MONTH)), -- Test 1
(2, 6, 2, 18.000, 25, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -30 MONTH)), -- Test 2
(2, 6, 3, 12.000, 15, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -30 MONTH)), -- Test 3 (Good performance)
(2, 6, 4, 25.000, 40, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -30 MONTH)),

(2, 7, 1, 22.000, 30, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -24 MONTH)),
(2, 7, 2, 20.000, 35, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -24 MONTH)),
(2, 7, 3, 14.000, 20, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -24 MONTH)),
(2, 7, 4, 28.000, 50, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -24 MONTH)),

(2, 8, 1, 25.000, 40, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -18 MONTH)),
(2, 8, 2, 22.000, 45, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -18 MONTH)),
(2, 8, 3, 16.000, 25, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -18 MONTH)),
(2, 8, 4, 30.000, 55, 'high', DATE_ADD(CURRENT_DATE, INTERVAL -18 MONTH)),

(2, 9, 1, 28.000, 50, 'high', DATE_ADD(CURRENT_DATE, INTERVAL -12 MONTH)),
(2, 9, 2, 25.000, 55, 'high', DATE_ADD(CURRENT_DATE, INTERVAL -12 MONTH)),
(2, 9, 3, 18.000, 30, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -12 MONTH)),
(2, 9, 4, 35.000, 60, 'high', DATE_ADD(CURRENT_DATE, INTERVAL -12 MONTH)),

(2, 10, 1, 30.000, 60, 'high', DATE_ADD(CURRENT_DATE, INTERVAL -6 MONTH)),
(2, 10, 2, 28.000, 65, 'high', DATE_ADD(CURRENT_DATE, INTERVAL -6 MONTH)),
(2, 10, 3, 20.000, 35, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -6 MONTH)),
(2, 10, 4, 38.000, 70, 'high', DATE_ADD(CURRENT_DATE, INTERVAL -6 MONTH));

-- User 3: Strong improvement over time
INSERT INTO UserTestResult (user_id, session_id, test_id, time_taken, abrupt_percentage, risk_level, test_date) VALUES
(3, 11, 1, 28.000, 50, 'high', DATE_ADD(CURRENT_DATE, INTERVAL -30 MONTH)), -- Test 1
(3, 11, 2, 25.000, 55, 'high', DATE_ADD(CURRENT_DATE, INTERVAL -30 MONTH)), -- Test 2
(3, 11, 3, 18.000, 35, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -30 MONTH)), -- Test 3 (Good performance)
(3, 11, 4, 32.000, 60, 'high', DATE_ADD(CURRENT_DATE, INTERVAL -30 MONTH)),

(3, 12, 1, 25.000, 40, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -24 MONTH)),
(3, 12, 2, 22.000, 45, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -24 MONTH)),
(3, 12, 3, 15.000, 25, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -24 MONTH)),
(3, 12, 4, 30.000, 55, 'high', DATE_ADD(CURRENT_DATE, INTERVAL -24 MONTH)),

(3, 13, 1, 22.000, 30, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -18 MONTH)),
(3, 13, 2, 20.000, 35, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -18 MONTH)),
(3, 13, 3, 12.000, 15, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -18 MONTH)),
(3, 13, 4, 28.000, 50, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -18 MONTH)),

(3, 14, 1, 18.000, 20, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -12 MONTH)),
(3, 14, 2, 16.000, 25, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -12 MONTH)),
(3, 14, 3, 10.000, 10, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -12 MONTH)),
(3, 14, 4, 25.000, 35, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -12 MONTH)),

(3, 15, 1, 15.000, 10, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -6 MONTH)),
(3, 15, 2, 12.000, 15, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -6 MONTH)),
(3, 15, 3, 8.000, 5, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -6 MONTH)),
(3, 15, 4, 20.000, 25, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -6 MONTH));

-- User 4: Gradual decline in performance
INSERT INTO UserTestResult (user_id, session_id, test_id, time_taken, abrupt_percentage, risk_level, test_date) VALUES
(4, 16, 1, 18.000, 20, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -30 MONTH)), -- Test 1
(4, 16, 2, 15.000, 25, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -30 MONTH)), -- Test 2
(4, 16, 3, 12.000, 10, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -30 MONTH)), -- Test 3 (Good performance)
(4, 16, 4, 22.000, 30, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -30 MONTH)),

(4, 17, 1, 20.000, 25, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -24 MONTH)),
(4, 17, 2, 18.000, 30, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -24 MONTH)),
(4, 17, 3, 14.000, 15, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -24 MONTH)),
(4, 17, 4, 25.000, 35, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -24 MONTH)),

(4, 18, 1, 22.000, 35, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -18 MONTH)),
(4, 18, 2, 20.000, 40, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -18 MONTH)),
(4, 18, 3, 16.000, 20, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -18 MONTH)),
(4, 18, 4, 28.000, 45, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -18 MONTH)),

(4, 19, 1, 25.000, 50, 'high', DATE_ADD(CURRENT_DATE, INTERVAL -12 MONTH)),
(4, 19, 2, 23.000, 55, 'high', DATE_ADD(CURRENT_DATE, INTERVAL -12 MONTH)),
(4, 19, 3, 18.000, 25, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -12 MONTH)),
(4, 19, 4, 32.000, 60, 'high', DATE_ADD(CURRENT_DATE, INTERVAL -12 MONTH)),

(4, 20, 1, 30.000, 60, 'high', DATE_ADD(CURRENT_DATE, INTERVAL -6 MONTH)),
(4, 20, 2, 28.000, 65, 'high', DATE_ADD(CURRENT_DATE, INTERVAL -6 MONTH)),
(4, 20, 3, 20.000, 30, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -6 MONTH)),
(4, 20, 4, 35.000, 70, 'high', DATE_ADD(CURRENT_DATE, INTERVAL -6 MONTH));

-- User 5: Fluctuates over time
INSERT INTO UserTestResult (user_id, session_id, test_id, time_taken, abrupt_percentage, risk_level, test_date) VALUES
(5, 21, 1, 25.000, 40, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -30 MONTH)), -- Test 1
(5, 21, 2, 22.000, 45, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -30 MONTH)), -- Test 2
(5, 21, 3, 15.000, 25, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -30 MONTH)), -- Test 3 (Good performance)
(5, 21, 4, 30.000, 55, 'high', DATE_ADD(CURRENT_DATE, INTERVAL -30 MONTH)),

(5, 22, 1, 20.000, 30, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -24 MONTH)),
(5, 22, 2, 18.000, 35, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -24 MONTH)),
(5, 22, 3, 12.000, 15, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -24 MONTH)),
(5, 22, 4, 25.000, 40, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -24 MONTH)),

(5, 23, 1, 28.000, 55, 'high', DATE_ADD(CURRENT_DATE, INTERVAL -18 MONTH)),
(5, 23, 2, 25.000, 60, 'high', DATE_ADD(CURRENT_DATE, INTERVAL -18 MONTH)),
(5, 23, 3, 18.000, 35, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -18 MONTH)),
(5, 23, 4, 32.000, 65, 'high', DATE_ADD(CURRENT_DATE, INTERVAL -18 MONTH)),

(5, 24, 1, 22.000, 30, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -12 MONTH)),
(5, 24, 2, 20.000, 35, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -12 MONTH)),
(5, 24, 3, 13.000, 20, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -12 MONTH)),
(5, 24, 4, 28.000, 45, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -12 MONTH)),

(5, 25, 1, 24.000, 35, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -6 MONTH)),
(5, 25, 2, 21.000, 40, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -6 MONTH)),
(5, 25, 3, 14.000, 15, 'low', DATE_ADD(CURRENT_DATE, INTERVAL -6 MONTH)),
(5, 25, 4, 29.000, 50, 'moderate', DATE_ADD(CURRENT_DATE, INTERVAL -6 MONTH));

-- **************************************************
-- DATABASE: FallSafe_AdminDB
-- Add dummy data
-- **************************************************
USE FallSafe_AdminDB;

-- Insert dummy data into the User table
INSERT INTO User (name, email, role) VALUES
('Eve Adams', 'admin1@example.com', 'Admin');
