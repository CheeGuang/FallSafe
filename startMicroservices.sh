#!/bin/bash

# Function to run a Go microservice (no logs, not backgrounded)
run_service() {
  dir=$1
  echo "Running $dir..."
  cd "$dir" || exit
  go run main.go &
  cd - > /dev/null || exit
}

# Run each microservice
run_service adminMicroservice/admin
run_service authenticationMicroservice/authentication
run_service fallsEfficacyScaleMicroservice/FES
run_service openAIMicroservice/openAI
run_service selfAssessmentMicroservice/selfAssessment
run_service userMicroservice/profile

echo "All microservices are running. Use 'ps aux | grep go' to view or Ctrl+C to stop the session."
wait
