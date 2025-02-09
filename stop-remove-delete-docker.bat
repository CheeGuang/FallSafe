docker stop $(docker ps -aq)
docker rm $(docker ps -aq)
docker rmi -f $(docker images -q)
docker pull docker.io/cheeguang/frontend:latest
docker pull docker.io/cheeguang/user-microservice:latest
docker pull docker.io/cheeguang/selfassessment-microservice:latest
docker pull docker.io/cheeguang/openai-microservice:latest
docker pull docker.io/cheeguang/fallsefficacy-microservice:latest
docker pull docker.io/cheeguang/auth-microservice:latest
docker pull docker.io/cheeguang/admin-microservice:latest
docker run -d --name frontend -p 8000:80 cheeguang/frontend:latest
docker run -d --name user-microservice -p 5100:5100 cheeguang/user-microservice:latest
docker run -d --name selfassessment-microservice -p 5250:5250 cheeguang/selfassessment-microservice:latest
docker run -d --name openai-microservice -p 5150:5150 cheeguang/openai-microservice:latest
docker run -d --name fallsefficacy-microservice -p 5300:5300 cheeguang/fallsefficacy-microservice:latest
docker run -d --name auth-microservice -p 5050:5050 cheeguang/auth-microservice:latest
docker run -d --name admin-microservice -p 5200:5200 cheeguang/admin-microservice:latest
