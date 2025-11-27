#!/bin/bash

# 测试 API 端点脚本

echo "=== 测试 Cloud Agent API ==="
echo ""

# 测试 HTTP 端口
echo "1. 测试 HTTP 端口 (8080):"
curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:8080/api/v1/agents 2>&1 | head -20
echo ""

# 测试 HTTPS 端口
echo "2. 测试 HTTPS 端口 (8443):"
curl -s -k -w "\nHTTP Status: %{http_code}\n" https://localhost:8443/api/v1/agents 2>&1 | head -20
echo ""

# 检查进程
echo "3. 检查运行中的 Cloud 服务进程:"
ps aux | grep -E "(cloud|8080|8443)" | grep -v grep || echo "未找到运行中的服务"
echo ""

# 检查端口占用
echo "4. 检查端口占用:"
lsof -i :8080 2>/dev/null || echo "端口 8080 未被占用"
lsof -i :8443 2>/dev/null || echo "端口 8443 未被占用"
echo ""

echo "=== 测试完成 ==="

