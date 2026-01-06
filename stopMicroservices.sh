#!/bin/bash

echo "Stopping FallSafe microservices..."

# Stop Go microservices started via `go run main.go`
for service in \
  adminMicroservice \
  authenticationMicroservice \
  fallsEfficacyScaleMicroservice \
  openAIMicroservice \
  selfAssessmentMicroservice \
  userMicroservice
do
  echo "Stopping $service..."
  pkill -f "go run main.go.*$service" 2>/dev/null
done

# Stop frontend (http-server on port 80)
echo "Stopping frontend (http-server)..."
pkill -f "http-server -p 80" 2>/dev/null

echo "All FallSafe services have been stopped."
