@echo off
:: Open a new terminal for each microservice and run main.go

start cmd /k "cd /d adminMicroservice && go run main.go"
start cmd /k "cd /d authenticationMicroservice && go run main.go"
start cmd /k "cd /d fallsEfficacyScaleMicroservice && go run main.go"
start cmd /k "cd /d openAIMicroservice && go run main.go"
start cmd /k "cd /d selfAssessmentMicroservice && go run main.go"
start cmd /k "cd /d userMicroservice && go run main.go"

:: You can add more lines as needed for other directories.
echo Microservices started. Close this window to stop the batch process.
