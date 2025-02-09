@echo off
setlocal

:: Define Cluster and Namespace Names
set CLUSTER_NAME=fallsafe-cluster
set NAMESPACE=fallsafe-namespace
set DOCKER_USER=cheeguang  :: Replace with your Docker Hub username

:: Step 1: Create Kubernetes Cluster with k3d
echo Creating Kubernetes Cluster...
k3d cluster create %CLUSTER_NAME% --servers 1 --agents 2
if %errorlevel% neq 0 (
    echo Cluster creation failed! Exiting...
    exit /b
)
timeout /t 5

:: Step 2: Configure kubectl to Use k3d Cluster
echo Setting kubectl context...
kubectl config use-context k3d-%CLUSTER_NAME%
if %errorlevel% neq 0 (
    echo Failed to set Kubernetes context! Exiting...
    exit /b
)
timeout /t 2

:: Step 3: Create Namespace
echo Creating namespace: %NAMESPACE%...
kubectl create namespace %NAMESPACE%
timeout /t 2

:: Step 4: Create Kubernetes Secrets
echo Creating Kubernetes Secrets...
kubectl apply -f k8s/microservices.secrets.yaml --namespace=%NAMESPACE%
timeout /t 2

kubectl create secret docker-registry dockerhubsecret --docker-server=https://index.docker.io/v1/ --docker-username=cheeguang --docker-password=0@Jl123123 --docker-email=jeffreyleetino@gmail.com --namespace=fallsafe-namespace

:: Step 5: Deploy Services
echo Deploying Services...
kubectl apply -f k8s/services.yaml --namespace=%NAMESPACE%
timeout /t 2

:: Step 6: Deploy Microservices
echo Deploying Microservices...
kubectl apply -f k8s/admin-deployment.yaml --namespace=%NAMESPACE%
kubectl apply -f k8s/auth-deployment.yaml --namespace=%NAMESPACE%
kubectl apply -f k8s/fallsEfficacy-deployment.yaml --namespace=%NAMESPACE%
kubectl apply -f k8s/openAI-deployment.yaml --namespace=%NAMESPACE%
kubectl apply -f k8s/selfAssessment-deployment.yaml --namespace=%NAMESPACE%
kubectl apply -f k8s/user-deployment.yaml --namespace=%NAMESPACE%
timeout /t 2

:: Step 7: Deploy Frontend
echo Deploying Frontend...
kubectl apply -f k8s/frontend-deployment.yaml --namespace=%NAMESPACE%
timeout /t 2

:: Step 8: Verify Deployment
echo Verifying Deployment...
kubectl get pods --namespace=%NAMESPACE%
kubectl get services --namespace=%NAMESPACE%
timeout /t 3

:: Step 9: Retrieve Frontend URL (For LoadBalancer)
echo Retrieving Frontend Service External IP...
kubectl get svc frontend-service --namespace=%NAMESPACE%
timeout /t 3

echo Kubernetes deployment complete!
endlocal
pause
