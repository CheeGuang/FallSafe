#!/bin/bash

echo "Stopping FallSafe microservices..."

# Stop Go microservices by port
declare -A PORTS=(
  [adminMicroservice]=5200
  [authenticationMicroservice]=5050
  [fallsEfficacyScaleMicroservice]=5300
  [openAIMicroservice]=5150
  [selfAssessmentMicroservice]=5250
  [userMicroservice]=5100
)

for service in "${!PORTS[@]}"; do
  port=${PORTS[$service]}
  echo "Stopping $service on port $port..."

  pid=$(lsof -ti tcp:$port)
  if [ -n "$pid" ]; then
    kill -9 $pid
    echo "✔ $service stopped (PID $pid)"
  else
    echo "ℹ $service not running"
  fi
done

# Stop frontend (http-server on port 80)
echo "Stopping frontend (http-server on port 80)..."
pid=$(lsof -ti tcp:80)
if [ -n "$pid" ]; then
  kill -9 $pid
  echo "✔ frontend stopped (PID $pid)"
else
  echo "ℹ frontend not running"
fi

echo "All FallSafe services have been stopped."
