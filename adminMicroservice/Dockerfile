# Use official Golang image
FROM golang:1.23-alpine

# Set environment variables
ENV GO111MODULE=on \
    CGO_ENABLED=0 \
    GOOS=linux \
    GOARCH=amd64

# Set working directory
WORKDIR /app

# Copy files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build executable
RUN go build -o main .

# Expose application port (assume 8080, change if needed)
EXPOSE 8080

# Set entrypoint
CMD ["./main"]
