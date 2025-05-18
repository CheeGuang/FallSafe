#!/bin/bash

# Function to run a Go microservice with nohup
run_service() {
  dir=$1
  name=$(basename "$dir")
  echo "Starting $name..."
  cd "$dir" || exit
  nohup go run main.go > "../${name}.log" 2>&1 &
  cd - > /dev/null || exit
}

# Run all microservices
run_service adminMicroservice
run_service authenticationMicroservice
run_service fallsEfficacyScaleMicroservice
run_service openAIMicroservice
run_service selfAssessmentMicroservice
run_service userMicroservice

# Start frontend using http-server on port 80
echo "Starting frontend on port 80..."
cd frontend || exit
nohup http-server -p 80 -a 0.0.0.0 > ../frontend.log 2>&1 &
cd - > /dev/null || exit

echo "All services are running in the background."
