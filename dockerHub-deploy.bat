@echo off
setlocal

:: Replace 'cheeguang' with your actual Docker Hub username
set DOCKER_USER=cheeguang

:: Login to Docker Hub
echo Logging into Docker Hub...
docker login
if %errorlevel% neq 0 (
    echo Docker login failed! Exiting...
    exit /b
)

:: Build and tag Docker images one by one
echo Building admin-microservice...
cd adminMicroservice
docker build --no-cache -t %DOCKER_USER%/admin-microservice:latest .
cd ..

echo Building auth-microservice...
cd authenticationMicroservice
docker build --no-cache -t %DOCKER_USER%/auth-microservice:latest .
cd ..

echo Building fallsEfficacyScale-microservice...
cd fallsEfficacyScaleMicroservice
docker build --no-cache -t %DOCKER_USER%/fallsefficacy-microservice:latest .
cd ..

echo Building openAI-microservice...
cd openAIMicroservice
docker build --no-cache -t %DOCKER_USER%/openai-microservice:latest .
cd ..

echo Building selfAssessment-microservice...
cd selfAssessmentMicroservice
docker build --no-cache -t %DOCKER_USER%/selfassessment-microservice:latest .
cd ..

echo Building user-microservice...
cd userMicroservice
docker build --no-cache -t %DOCKER_USER%/user-microservice:latest .
cd ..

echo Building frontend...
cd frontend
docker build --no-cache -t %DOCKER_USER%/frontend:latest .
cd ..

:: Push Docker images to Docker Hub one by one
echo Pushing admin-microservice...
docker push %DOCKER_USER%/admin-microservice:latest

echo Pushing auth-microservice...
docker push %DOCKER_USER%/auth-microservice:latest

echo Pushing fallsEfficacyScale-microservice...
docker push %DOCKER_USER%/fallsefficacy-microservice:latest

echo Pushing openAI-microservice...
docker push %DOCKER_USER%/openai-microservice:latest

echo Pushing selfAssessment-microservice...
docker push %DOCKER_USER%/selfassessment-microservice:latest

echo Pushing user-microservice...
docker push %DOCKER_USER%/user-microservice:latest

echo Pushing frontend...
docker push %DOCKER_USER%/frontend:latest

echo All images built and pushed successfully!
endlocal
pause
