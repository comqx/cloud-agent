#!/bin/bash

# WSS 快速测试脚本
# 用于测试 WSS 配置是否正常工作

set -e

CERT_DIR="./certs"
CERT_FILE="$CERT_DIR/server.crt"
KEY_FILE="$CERT_DIR/server.key"

echo "=== WSS 配置测试脚本 ==="
echo ""

# 检查证书是否存在
if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    echo "❌ 证书文件不存在，正在生成..."
    chmod +x scripts/generate-cert.sh
    ./scripts/generate-cert.sh "$CERT_DIR" localhost
    echo "✅ 证书生成完成"
    echo ""
fi

echo "📋 配置信息："
echo "  证书文件: $CERT_FILE"
echo "  私钥文件: $KEY_FILE"
echo ""

# 检查证书信息
echo "📜 证书信息："
openssl x509 -in "$CERT_FILE" -noout -subject -dates 2>/dev/null || echo "  无法读取证书信息"
echo ""

echo "✅ 配置检查完成！"
echo ""
echo "🚀 启动命令示例："
echo ""
echo "1. 启动 Cloud 服务（WSS）："
echo "   ./bin/cloud -addr :8443 -cert $CERT_FILE -key $KEY_FILE"
echo ""
echo "2. 启动 Agent（连接 WSS）："
echo "   ./bin/agent -cloud https://localhost:8443"
echo ""
echo "3. 测试 WSS 连接（需要安装 wscat）："
echo "   wscat -c wss://localhost:8443/ws --no-check"
echo ""

