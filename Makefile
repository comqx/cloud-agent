.PHONY: build cloud agent service cli cloud-ui all clean docker docker-build docker-up docker-down help

# 构建目标
build: cloud agent service cli

cloud:
	@echo "Building cloud..."
	@go build -o bin/cloud ./cmd/cloud

agent:
	@echo "Building agent..."
	@go build -o bin/agent ./cmd/agent

service:
	@echo "Building tiangong-deploy-service..."
	@go build -o bin/service ./cmd/tiangong-deploy-service

cli:
	@echo "Building CLI..."
	@go build -o bin/cloudctl ./cmd/cli

cloud-ui:
	@echo "Building Cloud UI..."
	@cd cloud-ui && npm run build

all: build cloud-ui

# Docker 相关
docker-build:
	@echo "Building Docker images..."
	@docker-compose -f deployments/docker-compose.yml build

docker-up:
	@echo "Starting Docker containers..."
	@docker-compose -f deployments/docker-compose.yml up -d

docker-down:
	@echo "Stopping Docker containers..."
	@docker-compose -f deployments/docker-compose.yml down

docker-logs:
	@docker-compose -f deployments/docker-compose.yml logs -f

# 清理
clean:
	@echo "Cleaning..."
	@rm -rf bin/
	@rm -rf cloud-ui/dist/
	@rm -rf data/

# 运行
run-cloud:
	@go run ./cmd/cloud/main.go

run-service:
	@go run ./cmd/tiangong-deploy-service/main.go

run-agent:
	@go run ./cmd/agent/main.go

# 帮助
help:
	@echo "Available targets:"
	@echo "  build        - Build cloud, agent, service, and cli"
	@echo "  cloud        - Build cloud service"
	@echo "  agent        - Build agent"
	@echo "  service      - Build tiangong-deploy-service"
	@echo "  cli          - Build CLI tool"
	@echo "  cloud-ui     - Build Cloud UI"
	@echo "  all          - Build everything"
	@echo "  docker-build - Build Docker images"
	@echo "  docker-up    - Start Docker containers"
	@echo "  docker-down  - Stop Docker containers"
	@echo "  docker-logs  - View Docker logs"
	@echo "  clean        - Clean build artifacts"
	@echo "  run-cloud    - Run cloud service"
	@echo "  run-service  - Run tiangong-deploy-service"
	@echo "  run-agent    - Run agent"
