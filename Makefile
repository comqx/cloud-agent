.PHONY: build cloud agent cli cloud-ui all clean docker docker-build docker-up docker-down help
.PHONY: docker-build-cloud docker-build-agent docker-build-ui docker-push-cloud docker-push-agent docker-push-ui docker-push-all
.PHONY: docker-buildx-setup docker-build-cloud-multi docker-build-agent-multi docker-build-ui-multi docker-build-all-multi

# Docker Hub 仓库配置（可通过环境变量覆盖）
DOCKER_REGISTRY ?= docker.io
DOCKER_NAMESPACE ?= comqx
DOCKER_TAG ?= latest

# 多架构平台支持
DOCKER_PLATFORMS ?= linux/amd64,linux/arm64

# 镜像名称
IMAGE_CLOUD = $(DOCKER_REGISTRY)/$(DOCKER_NAMESPACE)/cloud-agent-cloud:$(DOCKER_TAG)
IMAGE_AGENT = $(DOCKER_REGISTRY)/$(DOCKER_NAMESPACE)/cloud-agent-agent:$(DOCKER_TAG)
IMAGE_UI = $(DOCKER_REGISTRY)/$(DOCKER_NAMESPACE)/cloud-agent-ui:$(DOCKER_TAG)

# Buildx builder 名称
BUILDER_NAME = cloud-agent-builder

# 构建目标
build: cloud agent cli

cloud:
	@echo "Building cloud..."
	@go build -o bin/cloud ./cmd/cloud

agent:
	@echo "Building agent..."
	@go build -o bin/agent ./cmd/agent

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

# 初始化 buildx（支持多架构）
docker-buildx-setup:
	@echo "Setting up Docker buildx..."
	@if ! docker buildx ls | grep -q $(BUILDER_NAME); then \
		docker buildx create --name $(BUILDER_NAME) --use --bootstrap; \
	else \
		docker buildx use $(BUILDER_NAME); \
	fi
	@docker buildx inspect --bootstrap

# 单独构建镜像（单架构，本地使用）
docker-build-cloud:
	@echo "Building cloud image: $(IMAGE_CLOUD)"
	@docker build -f Dockerfile.cloud -t $(IMAGE_CLOUD) .

docker-build-agent:
	@echo "Building agent image: $(IMAGE_AGENT)"
	@docker build -f Dockerfile.agent -t $(IMAGE_AGENT) .

docker-build-ui:
	@echo "Building UI image: $(IMAGE_UI)"
	@docker build -f Dockerfile.ui -t $(IMAGE_UI) .

docker-build-all: docker-build-cloud docker-build-agent docker-build-ui
	@echo "All images built successfully!"

# 多架构构建（仅构建，不推送也不加载到本地）
# 注意：多架构镜像无法使用 --load 加载到本地，需要推送到仓库后拉取
docker-build-cloud-multi: docker-buildx-setup
	@echo "Building multi-arch cloud image: $(IMAGE_CLOUD) [$(DOCKER_PLATFORMS)]"
	@echo "Note: Multi-arch images cannot be loaded locally. Use docker-push-cloud to push to registry."
	@docker buildx build \
		--platform $(DOCKER_PLATFORMS) \
		-f Dockerfile.cloud \
		-t $(IMAGE_CLOUD) \
		.

docker-build-agent-multi: docker-buildx-setup
	@echo "Building multi-arch agent image: $(IMAGE_AGENT) [$(DOCKER_PLATFORMS)]"
	@echo "Note: Multi-arch images cannot be loaded locally. Use docker-push-agent to push to registry."
	@docker buildx build \
		--platform $(DOCKER_PLATFORMS) \
		-f Dockerfile.agent \
		-t $(IMAGE_AGENT) \
		.

docker-build-ui-multi: docker-buildx-setup
	@echo "Building multi-arch UI image: $(IMAGE_UI) [$(DOCKER_PLATFORMS)]"
	@echo "Note: Multi-arch images cannot be loaded locally. Use docker-push-ui to push to registry."
	@docker buildx build \
		--platform $(DOCKER_PLATFORMS) \
		-f Dockerfile.ui \
		-t $(IMAGE_UI) \
		.

docker-build-all-multi: docker-buildx-setup
	@echo "Building all multi-arch images..."
	@$(MAKE) docker-build-cloud-multi
	@$(MAKE) docker-build-agent-multi
	@$(MAKE) docker-build-ui-multi

# 推送镜像到 Docker Hub（多架构）
docker-push-cloud: docker-buildx-setup
	@echo "Building and pushing multi-arch cloud image: $(IMAGE_CLOUD) [$(DOCKER_PLATFORMS)]"
	@docker buildx build \
		--platform $(DOCKER_PLATFORMS) \
		-f Dockerfile.cloud \
		-t $(IMAGE_CLOUD) \
		--push \
		.

docker-push-agent: docker-buildx-setup
	@echo "Building and pushing multi-arch agent image: $(IMAGE_AGENT) [$(DOCKER_PLATFORMS)]"
	@docker buildx build \
		--platform $(DOCKER_PLATFORMS) \
		-f Dockerfile.agent \
		-t $(IMAGE_AGENT) \
		--push \
		.

docker-push-ui: docker-buildx-setup
	@echo "Building and pushing multi-arch UI image: $(IMAGE_UI) [$(DOCKER_PLATFORMS)]"
	@docker buildx build \
		--platform $(DOCKER_PLATFORMS) \
		-f Dockerfile.ui \
		-t $(IMAGE_UI) \
		--push \
		.

docker-push-all: docker-buildx-setup
	@echo "Building and pushing all multi-arch images..."
	@$(MAKE) docker-push-cloud
	@$(MAKE) docker-push-agent
	@$(MAKE) docker-push-ui
	@echo "All images pushed successfully!"

# 清理
clean:
	@echo "Cleaning..."
	@rm -rf bin/
	@rm -rf cloud-ui/dist/
	@rm -rf data/

# 运行
run-cloud:
	@go run ./cmd/cloud/main.go

run-agent:
	@go run ./cmd/agent/main.go

# 帮助
help:
	@echo "Available targets:"
	@echo "  build              - Build cloud, agent, and cli"
	@echo "  cloud              - Build cloud service"
	@echo "  agent              - Build agent"
	@echo "  cli                - Build CLI tool"
	@echo "  cloud-ui           - Build Cloud UI"
	@echo "  all                - Build everything"
	@echo ""
	@echo "Docker Compose:"
	@echo "  docker-build       - Build Docker images (compose)"
	@echo "  docker-up          - Start Docker containers"
	@echo "  docker-down        - Stop Docker containers"
	@echo "  docker-logs        - View Docker logs"
	@echo ""
	@echo "Docker Images (单架构，本地使用):"
	@echo "  docker-build-cloud - Build cloud image (single arch)"
	@echo "  docker-build-agent - Build agent image (single arch)"
	@echo "  docker-build-ui    - Build UI image (single arch)"
	@echo "  docker-build-all   - Build all images (single arch)"
	@echo ""
	@echo "Docker Images (多架构，本地使用):"
	@echo "  docker-build-cloud-multi - Build cloud image (multi-arch)"
	@echo "  docker-build-agent-multi - Build agent image (multi-arch)"
	@echo "  docker-build-ui-multi    - Build UI image (multi-arch)"
	@echo "  docker-build-all-multi   - Build all images (multi-arch)"
	@echo ""
	@echo "Docker Push (多架构，推送到 Docker Hub):"
	@echo "  docker-push-cloud  - Build and push cloud image (multi-arch)"
	@echo "  docker-push-agent  - Build and push agent image (multi-arch)"
	@echo "  docker-push-ui     - Build and push UI image (multi-arch)"
	@echo "  docker-push-all    - Build and push all images (multi-arch)"
	@echo ""
	@echo "Docker Buildx Setup:"
	@echo "  docker-buildx-setup - Initialize buildx builder for multi-arch"
	@echo ""
	@echo "Environment variables:"
	@echo "  DOCKER_REGISTRY    - Docker registry (default: docker.io)"
	@echo "  DOCKER_NAMESPACE   - Docker namespace/username (default: comqx)"
	@echo "  DOCKER_TAG         - Image tag (default: latest)"
	@echo "  DOCKER_PLATFORMS   - Target platforms (default: linux/amd64,linux/arm64)"
	@echo ""
	@echo "Examples:"
	@echo "  # 推送所有镜像（多架构）"
	@echo "  make docker-push-all"
	@echo ""
	@echo "  # 使用自定义标签和平台"
	@echo "  make docker-push-all DOCKER_TAG=v1.0.0 DOCKER_PLATFORMS=linux/amd64,linux/arm64"
	@echo ""
	@echo "  # 只推送 cloud 镜像"
	@echo "  make docker-push-cloud DOCKER_TAG=v1.0.0"
	@echo ""
	@echo "  clean              - Clean build artifacts"
	@echo "  run-cloud          - Run cloud service"
	@echo "  run-agent          - Run agent"
