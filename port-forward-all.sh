#!/bin/bash

# Define namespace
NAMESPACE=fallsafe-namespace

# Function to start port-forwarding in the background
port_forward() {
  svc=$1
  local_port=$2
  remote_port=$3
  echo "🔌 Port-forwarding $svc on $local_port -> $remote_port..."
  nohup kubectl port-forward svc/"$svc" -n "$NAMESPACE" "$local_port":"$remote_port" > "logs/$svc.log" 2>&1 &
}

# Create a logs directory if it doesn't exist
mkdir -p logs

# Start port-forwarding for each service
port_forward admin-service 5200 5200
port_forward auth-service 5050 5050
port_forward fallsefficacy-service 5300 5300
port_forward openai-service 5150 5150
port_forward selfassessment-service 5250 5250
port_forward user-service 5100 5100
port_forward frontend-service 8080 80

echo "✅ All port-forwarding started in background. Logs saved in ./logs/"
