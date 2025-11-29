#!/bin/bash

# 构建 Agent 镜像脚本
# 使用静态编译，避免 GLIBC 版本冲突

set -e

REGISTRY="${DOCKER_REGISTRY:-docker.io}"
NAMESPACE="${DOCKER_NAMESPACE:-comqx}"
IMAGE_NAME="cloud-agent-agent"
TAG="${IMAGE_TAG:-latest}"

FULL_IMAGE="${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${TAG}"

echo "========================================="
echo "构建 Agent 镜像（静态编译版本）"
echo "========================================="
echo "镜像: ${FULL_IMAGE}"
echo ""

# 构建镜像
echo "正在构建镜像..."
docker build -t "${FULL_IMAGE}" -f Dockerfile.agent .

echo ""
echo "========================================="
echo "验证二进制文件是否为静态链接"
echo "========================================="

# 创建临时容器并验证
CONTAINER_ID=$(docker create "${FULL_IMAGE}")
docker cp "${CONTAINER_ID}:/app/agent" /tmp/agent-verify
docker rm "${CONTAINER_ID}"

echo "文件类型:"
file /tmp/agent-verify

echo ""
echo "检查动态库依赖 (应该显示 'not a dynamic executable'):"
if command -v ldd &> /dev/null; then
    ldd /tmp/agent-verify 2>&1 || true
else
    echo "ldd 命令不可用，跳过检查"
fi

rm -f /tmp/agent-verify

echo ""
echo "========================================="
echo "构建完成！"
echo "========================================="
echo ""
echo "下一步："
echo "1. 推送镜像: docker push ${FULL_IMAGE}"
echo "2. 重新部署 DaemonSet: kubectl rollout restart daemonset/cloud-agent"
echo ""
