# 证书生成脚本自定义配置说明

## 可自定义的配置项

### 1. 配置段名称（可自定义）

#### `v3_req` - 扩展配置段名称
```bash
echo "[v3_req]"  # 可以改为 [my_extensions], [server_cert], 等任意名称
```
- **作用**：定义证书扩展配置的段名
- **自定义**：可以改为任意名称，但需要与 `-extensions` 参数保持一致
- **示例**：
  ```bash
  -extensions my_extensions -extfile <(
    echo "[my_extensions]"
    ...
  )
  ```

#### `alt_names` - SAN 配置段名称
```bash
echo "[alt_names]"  # 可以改为 [san_list], [subject_alt], 等任意名称
```
- **作用**：定义 Subject Alternative Names (SAN) 的配置段名
- **自定义**：可以改为任意名称，但需要与 `subjectAltName = @alt_names` 中的引用保持一致
- **示例**：
  ```bash
  echo "subjectAltName = @san_list"
  echo "[san_list]"
  echo "DNS.1 = example.com"
  ```

### 2. 密钥用途配置（可自定义）

#### `keyUsage` - 密钥用途
```bash
echo "keyUsage = keyEncipherment, dataEncipherment"
```

**可选值**（可组合使用，用逗号分隔）：
- `digitalSignature` - 数字签名
- `nonRepudiation` - 不可否认性
- `keyEncipherment` - 密钥加密（当前使用）
- `dataEncipherment` - 数据加密（当前使用）
- `keyAgreement` - 密钥协商
- `keyCertSign` - 证书签名
- `cRLSign` - CRL 签名
- `encipherOnly` - 仅加密
- `decipherOnly` - 仅解密

**示例**：
```bash
# 服务器证书（当前配置）
echo "keyUsage = keyEncipherment, dataEncipherment"

# 更完整的服务器证书
echo "keyUsage = digitalSignature, keyEncipherment, dataEncipherment"

# 证书签名用途（CA 证书）
echo "keyUsage = keyCertSign, cRLSign"
```

#### `extendedKeyUsage` - 扩展密钥用途
```bash
echo "extendedKeyUsage = serverAuth"
```

**可选值**（可组合使用，用逗号分隔）：
- `serverAuth` - 服务器认证（当前使用）
- `clientAuth` - 客户端认证（双向认证）
- `codeSigning` - 代码签名
- `emailProtection` - 邮件保护
- `timeStamping` - 时间戳
- `OCSPSigning` - OCSP 签名

**示例**：
```bash
# 仅服务器认证（当前配置）
echo "extendedKeyUsage = serverAuth"

# 双向认证（服务器 + 客户端）
echo "extendedKeyUsage = serverAuth, clientAuth"

# 仅客户端认证
echo "extendedKeyUsage = clientAuth"
```

### 3. Subject Alternative Names (SAN) - 可添加多个

#### DNS 条目
```bash
echo "DNS.1 = $HOST"
echo "DNS.2 = localhost"
echo "DNS.3 = example.com"  # 可以继续添加
echo "DNS.4 = *.example.com"  # 支持通配符
```

#### IP 条目
```bash
echo "IP.1 = 127.0.0.1"
echo "IP.2 = 192.168.1.100"  # 可以继续添加
echo "IP.3 = ::1"  # IPv6 地址
```

**使用示例**：
```bash
# 生成包含多个域名的证书
./generate-cert.sh ./certs example.com api.example.com www.example.com

# 生成包含 IP 的证书
./generate-cert.sh ./certs 192.168.1.100 10.0.0.1
```

### 4. 其他可自定义项

#### 证书有效期
```bash
-days 3650  # 当前 10 年，可以改为任意天数
```
**示例**：
```bash
-days 365   # 1 年
-days 730   # 2 年
-days 1825  # 5 年
-days 3650  # 10 年（当前）
```

#### 私钥长度
```bash
openssl genrsa -out "$CERT_DIR/server.key" 2048
```
**可选值**：
- `1024` - 不推荐（安全性低）
- `2048` - 当前使用（推荐）
- `3072` - 更高安全性
- `4096` - 最高安全性（但性能开销较大）

#### 证书主题信息
```bash
-subj "/C=CN/ST=State/L=City/O=Organization/CN=$HOST"
```

**字段说明**：
- `C` - Country（国家），如 CN, US
- `ST` - State/Province（省/州），如 Beijing, California
- `L` - Locality/City（城市），如 Beijing, San Francisco
- `O` - Organization（组织），如 My Company
- `OU` - Organizational Unit（部门），可选
- `CN` - Common Name（通用名称），通常是域名或 IP

**示例**：
```bash
-subj "/C=CN/ST=Beijing/L=Beijing/O=MyCompany/CN=example.com"
```

## 完整自定义示例

### 示例 1：双向认证证书
```bash
openssl x509 -req -days 3650 -in "$CERT_DIR/server.csr" \
  -signkey "$CERT_DIR/server.key" -out "$CERT_DIR/server.crt" \
  -extensions v3_req -extfile <(
    echo "[v3_req]"
    echo "keyUsage = digitalSignature, keyEncipherment, dataEncipherment"
    echo "extendedKeyUsage = serverAuth, clientAuth"  # 支持双向认证
    echo "subjectAltName = @alt_names"
    echo "[alt_names]"
    echo "DNS.1 = $HOST"
    echo "DNS.2 = localhost"
    echo "IP.1 = 127.0.0.1"
  )
```

### 示例 2：包含多个域名和 IP
```bash
openssl x509 -req -days 3650 -in "$CERT_DIR/server.csr" \
  -signkey "$CERT_DIR/server.key" -out "$CERT_DIR/server.crt" \
  -extensions v3_req -extfile <(
    echo "[v3_req]"
    echo "keyUsage = keyEncipherment, dataEncipherment"
    echo "extendedKeyUsage = serverAuth"
    echo "subjectAltName = @alt_names"
    echo "[alt_names]"
    echo "DNS.1 = example.com"
    echo "DNS.2 = www.example.com"
    echo "DNS.3 = api.example.com"
    echo "DNS.4 = *.example.com"  # 通配符域名
    echo "IP.1 = 192.168.1.100"
    echo "IP.2 = 10.0.0.1"
    echo "IP.3 = ::1"  # IPv6
  )
```

### 示例 3：自定义配置段名称
```bash
openssl x509 -req -days 3650 -in "$CERT_DIR/server.csr" \
  -signkey "$CERT_DIR/server.key" -out "$CERT_DIR/server.crt" \
  -extensions my_server_ext -extfile <(
    echo "[my_server_ext]"  # 自定义段名
    echo "keyUsage = keyEncipherment, dataEncipherment"
    echo "extendedKeyUsage = serverAuth"
    echo "subjectAltName = @my_san_list"  # 自定义 SAN 段名
    echo "[my_san_list]"  # 自定义 SAN 段名
    echo "DNS.1 = $HOST"
    echo "IP.1 = 127.0.0.1"
  )
```

## 总结

| 配置项 | 是否可自定义 | 说明 |
|--------|------------|------|
| `v3_req` | ✅ 是 | 扩展配置段名称，可改为任意名称 |
| `alt_names` | ✅ 是 | SAN 配置段名称，可改为任意名称 |
| `keyUsage` | ✅ 是 | 密钥用途，可添加/删除用途项 |
| `extendedKeyUsage` | ✅ 是 | 扩展密钥用途，可添加 clientAuth 等 |
| DNS/IP 条目 | ✅ 是 | 可添加多个 DNS 和 IP 地址 |
| 有效期 | ✅ 是 | `-days` 参数，可设置任意天数 |
| 私钥长度 | ✅ 是 | `genrsa` 的位数，可选 2048/3072/4096 |
| 证书主题 | ✅ 是 | `-subj` 参数，可自定义所有字段 |

## 注意事项

1. **配置段名称一致性**：如果修改了 `v3_req` 或 `alt_names` 的名称，需要确保所有引用保持一致
2. **SAN 限制**：现代浏览器要求证书必须包含 SAN，不能仅依赖 CN
3. **通配符证书**：`*.example.com` 只匹配一级子域名，不匹配多级（如 `a.b.example.com`）
4. **IP 地址**：SAN 中的 IP 地址必须与实际访问的 IP 完全匹配

