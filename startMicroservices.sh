#!/bin/bash

# Function to run a Go microservice
run_service() {
  dir=$1
  echo "Running $dir..."
  cd "$dir" || exit
  go run main.go &
  cd - > /dev/null || exit
}

# Run each Go microservice
run_service adminMicroservice
run_service authenticationMicroservice
run_service fallsEfficacyScaleMicroservice
run_service openAIMicroservice
run_service selfAssessmentMicroservice
run_service userMicroservice

# Start frontend on port 80 (must be run as root)
echo "Starting frontend on port 80..."
cd frontend || exit
http-server -p 80 -a 0.0.0.0 &
cd - > /dev/null || exit

echo "All microservices and frontend are running at http://<your-ec2-public-ip>/"
wait
