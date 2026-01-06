#!/bin/bash

# Define Cluster and Namespace Names
CLUSTER_NAME=fallsafe-cluster
NAMESPACE=fallsafe-namespace
DOCKER_USER=cheeguang
DOCKER_PASSWORD=0@Jl123123
DOCKER_EMAIL=jeffreyleetino@gmail.com

# Step 0: Delete any existing cluster to prevent conflicts
echo "🧼 Deleting existing cluster if any..."
k3d cluster delete "$CLUSTER_NAME"

# Step 1: Create Kubernetes Cluster with k3d (specify image for version consistency)
echo "🚀 Creating Kubernetes Cluster..."
k3d cluster create "$CLUSTER_NAME" --servers 1 --agents 2 --image rancher/k3s:v1.30.6-k3s1 --wait
if [ $? -ne 0 ]; then
    echo "❌ Cluster creation failed! Exiting..."
    exit 1
fi

# Step 2: Merge and switch kubeconfig context
echo "🔧 Setting kubectl context..."
k3d kubeconfig merge "$CLUSTER_NAME" --kubeconfig-switch-context
if [ $? -ne 0 ]; then
    echo "❌ Failed to configure kubeconfig! Exiting..."
    exit 1
fi

# Step 3: Wait until the Kubernetes API is ready
echo "⏳ Waiting for Kubernetes API to be ready..."
until kubectl get nodes &> /dev/null; do
  echo "  ...still waiting..."
  sleep 3
done
echo "✅ Cluster is ready!"

# Step 4: Create Namespace
echo "📦 Creating namespace: $NAMESPACE"
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Step 5: Create Kubernetes Secrets
echo "🔐 Creating Kubernetes Secrets..."
kubectl apply -f k8s/microservices.secrets.yaml --namespace="$NAMESPACE"
kubectl create secret docker-registry dockerhubsecret \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username="$DOCKER_USER" \
  --docker-password="$DOCKER_PASSWORD" \
  --docker-email="$DOCKER_EMAIL" \
  --namespace="$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Step 6: Deploy Services
echo "📡 Deploying Services..."
kubectl apply -f k8s/services.yaml --namespace="$NAMESPACE"

# Step 7: Deploy Microservices
echo "📦 Deploying Microservices..."
kubectl apply -f k8s/admin-deployment.yaml --namespace="$NAMESPACE"
kubectl apply -f k8s/auth-deployment.yaml --namespace="$NAMESPACE"
kubectl apply -f k8s/fallsEfficacy-deployment.yaml --namespace="$NAMESPACE"
kubectl apply -f k8s/openAI-deployment.yaml --namespace="$NAMESPACE"
kubectl apply -f k8s/selfAssessment-deployment.yaml --namespace="$NAMESPACE"
kubectl apply -f k8s/user-deployment.yaml --namespace="$NAMESPACE"

# Step 8: Deploy Frontend
echo "🌐 Deploying Frontend..."
kubectl apply -f k8s/frontend-deployment.yaml --namespace="$NAMESPACE"

# Step 9: Verify Deployment
echo "🔍 Verifying Deployment..."
kubectl get pods --namespace="$NAMESPACE"
kubectl get services --namespace="$NAMESPACE"

# Step 10: Retrieve Frontend Service IP
echo "🌍 Frontend Service External IP (if LoadBalancer):"
kubectl get svc frontend-service --namespace="$NAMESPACE"

echo "✅ Kubernetes deployment complete!"
