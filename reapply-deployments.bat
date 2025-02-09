@echo off
setlocal

echo Reapplying Kubernetes Deployments...

kubectl apply -f k8s/admin-deployment.yaml
kubectl apply -f k8s/auth-deployment.yaml
kubectl apply -f k8s/fallsEfficacy-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/microservices.secrets.yaml
kubectl apply -f k8s/openAI-deployment.yaml
kubectl apply -f k8s/selfAssessment-deployment.yaml
kubectl apply -f k8s/services.yaml
kubectl apply -f k8s/user-deployment.yaml

echo Kubernetes Deployments Reapplied Successfully!
endlocal
pause
