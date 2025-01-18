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
    ('user1@example.com', '$2a$10$.kXKDW80biUED2npeuui7uZf3wgj0uyVOzC/7XshKWJbtH/jzQnpi', '123456'),

    -- Ages 60–69
    ('alice.tan@example.com', '$2a$10$.kXKDW80biUED2npeuui7uZf3wgj0uyVOzC/7XshKWJbtH/jzQnpi', '234567'),
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
('Charlie Brown', 'user1@example.com', 60, '123 Elm Street', '1234567890'),
-- Ages 60–69 (5 users)
('Alice Tan', 'alice.tan@example.com', 61, '11 Maple Lane', '9012345601'),
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
(16, 64, '2025-01-18 10:30:00');

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
(13, 1, 4), (13, 2, 4), (13, 3, 4), (13, 4, 4), (13, 5, 4), (13, 6, 4),
(13, 7, 4), (13, 8, 4), (13, 9, 4), (13, 10, 4), (13, 11, 4), (13, 12, 4),
(13, 13, 4), (13, 14, 4), (13, 15, 4), (13, 16, 4),
-- User 14
(14, 1, 4), (14, 2, 4), (14, 3, 4), (14, 4, 4), (14, 5, 4), (14, 6, 4),
(14, 7, 4), (14, 8, 4), (14, 9, 4), (14, 10, 4), (14, 11, 4), (14, 12, 4),
(14, 13, 4), (14, 14, 4), (14, 15, 4), (14, 16, 4),
-- User 15
(15, 1, 4), (15, 2, 4), (15, 3, 4), (15, 4, 4), (15, 5, 4), (15, 6, 4),
(15, 7, 4), (15, 8, 4), (15, 9, 4), (15, 10, 4), (15, 11, 4), (15, 12, 4),
(15, 13, 4), (15, 14, 4), (15, 15, 4), (15, 16, 4),
-- User 16
(16, 1, 4), (16, 2, 4), (16, 3, 4), (16, 4, 4), (16, 5, 4), (16, 6, 4),
(16, 7, 4), (16, 8, 4), (16, 9, 4), (16, 10, 4), (16, 11, 4), (16, 12, 4),
(16, 13, 4), (16, 14, 4), (16, 15, 4), (16, 16, 4);


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
