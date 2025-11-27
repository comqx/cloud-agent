#!/bin/bash

# 生成自签证书脚本
# 用法: ./generate-cert.sh [证书目录] [域名/IP] [额外域名/IP...]
#
# 可自定义的配置项：
# - v3_req: OpenSSL 扩展配置段名称（可自定义）
# - alt_names: Subject Alternative Names 配置段名称（可自定义）
# - DNS/IP 条目: 在 alt_names 中添加更多域名或 IP
# - keyUsage: 密钥用途（keyEncipherment, dataEncipherment, digitalSignature 等）
# - extendedKeyUsage: 扩展密钥用途（serverAuth, clientAuth 等）
# - 有效期: -days 参数（当前 3650 天，约 10 年）
# - 私钥长度: genrsa 的位数（当前 2048）

CERT_DIR="${1:-./certs}"
HOST="${2:-localhost}"
# 支持多个额外的域名/IP（从第3个参数开始）
shift 2 2>/dev/null || shift 1 2>/dev/null || true
EXTRA_HOSTS=("$@")

# 创建证书目录
mkdir -p "$CERT_DIR"

# 生成私钥
echo "生成私钥..."
openssl genrsa -out "$CERT_DIR/server.key" 2048

# 生成证书签名请求
echo "生成证书签名请求..."
openssl req -new -key "$CERT_DIR/server.key" -out "$CERT_DIR/server.csr" \
  -subj "/C=CN/ST=State/L=City/O=Organization/CN=$HOST"

# 生成自签证书（有效期 10 年）
# 可自定义配置：
# - cloudagent: 扩展配置段名称（可改为其他名称，如 my_extensions）
# - alt_names: SAN 配置段名称（可改为其他名称，如 san_list）
# - keyUsage: 可添加 digitalSignature, nonRepudiation 等
# - extendedKeyUsage: 可添加 clientAuth（双向认证）
echo "生成自签证书..."
openssl x509 -req -days 3650 -in "$CERT_DIR/server.csr" \
  -signkey "$CERT_DIR/server.key" -out "$CERT_DIR/server.crt" \
  -extensions cloudagent -extfile <(
    # [cloudagent] 是扩展配置段的名称，可以自定义（如改为 [my_extensions]）
    echo "[cloudagent]"
    # keyUsage: 密钥用途，可自定义添加更多用途
    # 可选值: digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment, keyAgreement, keyCertSign, cRLSign, encipherOnly, decipherOnly
    echo "keyUsage = keyEncipherment, dataEncipherment"
    # extendedKeyUsage: 扩展密钥用途，可自定义添加 clientAuth（用于双向认证）
    # 可选值: serverAuth, clientAuth, codeSigning, emailProtection, timeStamping, OCSPSigning
    echo "extendedKeyUsage = serverAuth"
    # subjectAltName: 引用 alt_names 配置段（名称可自定义）
    echo "subjectAltName = @alt_names"
    # [alt_names] 是 SAN 配置段的名称，可以自定义（如改为 [san_list]）
    echo "[alt_names]"
    # DNS 条目：添加域名，可以添加多个（DNS.1, DNS.2, DNS.3...）
    echo "DNS.1 = $HOST"
    echo "DNS.2 = localhost"
    # IP 条目：添加 IP 地址，可以添加多个（IP.1, IP.2, IP.3...）
    echo "IP.1 = 127.0.0.1"
    if [[ "$HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      echo "IP.2 = $HOST"
    fi
    # 添加额外的域名/IP（从命令行参数）
    dns_count=3
    ip_count=3
    for extra_host in "${EXTRA_HOSTS[@]}"; do
      if [[ "$extra_host" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "IP.$ip_count = $extra_host"
        ((ip_count++))
      else
        echo "DNS.$dns_count = $extra_host"
        ((dns_count++))
      fi
    done
  )

# 清理 CSR 文件
rm "$CERT_DIR/server.csr"

# 设置权限
chmod 600 "$CERT_DIR/server.key"
chmod 644 "$CERT_DIR/server.crt"

echo "证书生成完成！"
echo "证书文件: $CERT_DIR/server.crt"
echo "私钥文件: $CERT_DIR/server.key"
echo ""
echo "注意: 这是自签证书，客户端需要配置跳过证书验证或导入 CA 证书"

