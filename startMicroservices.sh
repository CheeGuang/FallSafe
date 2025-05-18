#!/bin/bash

# Function to run a Go service in background
run_service() {
  dir=$1
  echo "Starting service in $dir"
  cd "$dir" || exit
  nohup go run main.go > output.log 2>&1 &
  cd - > /dev/null || exit
}

# Start each microservice
run_service adminMicroservice/admin
run_service authenticationMicroservice/authentication
run_service fallsEfficacyScaleMicroservice/FES
run_service openAIMicroservice/openAI
run_service selfAssessmentMicroservice/selfAssessment
run_service userMicroservice/profile

echo "All Go microservices started in background."
