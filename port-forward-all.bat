@echo off
setlocal

:: Define namespace
set NAMESPACE=fallsafe-namespace

:: Function to start port-forwarding in a new window
start "Admin Service" cmd /k "kubectl port-forward svc/admin-service -n %NAMESPACE% 5200:5200"
start "Auth Service" cmd /k "kubectl port-forward svc/auth-service -n %NAMESPACE% 5050:5050"
start "Falls Efficacy Service" cmd /k "kubectl port-forward svc/fallsefficacy-service -n %NAMESPACE% 5300:5300"
start "OpenAI Service" cmd /k "kubectl port-forward svc/openai-service -n %NAMESPACE% 5150:5150"
start "Self-Assessment Service" cmd /k "kubectl port-forward svc/selfassessment-service -n %NAMESPACE% 5250:5250"
start "User Service" cmd /k "kubectl port-forward svc/user-service -n %NAMESPACE% 5100:5100"
start "Frontend Service" cmd /k "kubectl port-forward svc/frontend-service -n %NAMESPACE% 8080:80"

echo All port-forwarding started in separate windows!
echo Close any window to stop its corresponding service.

endlocal
pause
