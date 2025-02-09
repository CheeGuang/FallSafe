@echo off
setlocal

:: Define Cluster and Namespace Names
set CLUSTER_NAME=fallsafe-cluster
set NAMESPACE=fallsafe-namespace

echo Deleting Kubernetes Deployments...
kubectl delete -f k8s/admin-deployment.yaml --namespace=%NAMESPACE%
kubectl delete -f k8s/auth-deployment.yaml --namespace=%NAMESPACE%
kubectl delete -f k8s/fallsEfficacy-deployment.yaml --namespace=%NAMESPACE%
kubectl delete -f k8s/openAI-deployment.yaml --namespace=%NAMESPACE%
kubectl delete -f k8s/selfAssessment-deployment.yaml --namespace=%NAMESPACE%
kubectl delete -f k8s/user-deployment.yaml --namespace=%NAMESPACE%
kubectl delete -f k8s/frontend-deployment.yaml --namespace=%NAMESPACE%
timeout /t 3

echo Deleting Kubernetes Services...
kubectl delete -f k8s/services.yaml --namespace=%NAMESPACE%
timeout /t 3

echo Deleting Kubernetes Secrets...
kubectl delete -f k8s/microservices.secrets.yaml --namespace=%NAMESPACE%
timeout /t 3

echo Deleting Kubernetes Namespace...
kubectl delete namespace %NAMESPACE%
timeout /t 3

echo Deleting Kubernetes Cluster...
k3d cluster delete %CLUSTER_NAME%
timeout /t 3

echo Cleaning Up Docker System...
docker system prune -a --volumes -f
timeout /t 3

echo Cleanup Complete! Everything has been removed.
endlocal
pause
