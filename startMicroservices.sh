#!/bin/bash

# Function to run a Go microservice
run_service() {
  dir=$1
  echo "Running $dir..."
  cd "$dir" || exit
  go run main.go &
  cd - > /dev/null || exit
}

# Run each microservice (adjusted paths)
run_service adminMicroservice
run_service authenticationMicroservice
run_service fallsEfficacyScaleMicroservice
run_service openAIMicroservice
run_service selfAssessmentMicroservice
run_service userMicroservice

echo "All microservices are running. Use 'ps aux | grep go' to view or Ctrl+C to stop the session."
wait
