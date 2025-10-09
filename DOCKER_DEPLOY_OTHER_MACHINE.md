# 在其他电脑上部署 Docker 镜像 / Deploy Docker Image on Other Machines

## 🚀 快速命令 / Quick Commands

### 方法 1: 从 GHCR 拉取并运行（推荐）/ Pull from GHCR and Run (Recommended)

```bash
# 拉取镜像并运行，限制资源为 1 vCPU 和 512MB 内存
docker run -d \
  --name checklist-mcp-server \
  -p 8585:8585 \
  --cpus="1.0" \
  --memory="512m" \
  --memory-swap="512m" \
  -e NODE_ENV=production \
  -e PORT=8585 \
  -e MAX_SESSIONS=100 \
  --restart unless-stopped \
  ghcr.io/radiumce/checklist-mcp-server:latest
```

### 方法 2: 使用 Docker Compose（推荐生产环境）/ Using Docker Compose (Production)

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
  checklist-mcp-server:
    image: ghcr.io/radiumce/checklist-mcp-server:latest
    container_name: checklist-mcp-server
    ports:
      - "8585:8585"
    environment:
      - NODE_ENV=production
      - PORT=8585
      - MAX_SESSIONS=100
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:8585/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      start_period: 5s
      retries: 3
```

然后运行：

```bash
docker-compose up -d
```

## 📋 详细步骤 / Detailed Steps

### 步骤 1: 安装 Docker / Step 1: Install Docker

如果目标机器还没有安装 Docker：

#### Linux (Ubuntu/Debian)
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

#### macOS
```bash
brew install --cask docker
```

#### Windows
下载并安装 Docker Desktop: https://www.docker.com/products/docker-desktop

### 步骤 2: 拉取镜像 / Step 2: Pull Image

```bash
# 从 GitHub Container Registry 拉取
docker pull ghcr.io/radiumce/checklist-mcp-server:latest

# 查看镜像
docker images ghcr.io/radiumce/checklist-mcp-server
```

### 步骤 3: 运行容器（带资源限制）/ Step 3: Run Container (With Resource Limits)

```bash
docker run -d \
  --name checklist-mcp-server \
  -p 8585:8585 \
  --cpus="1.0" \
  --memory="512m" \
  --memory-swap="512m" \
  -e NODE_ENV=production \
  -e PORT=8585 \
  -e MAX_SESSIONS=100 \
  --restart unless-stopped \
  ghcr.io/radiumce/checklist-mcp-server:latest
```

### 步骤 4: 验证运行状态 / Step 4: Verify Running Status

```bash
# 查看容器状态
docker ps

# 查看日志
docker logs -f checklist-mcp-server

# 测试健康检查
curl http://localhost:8585/health

# 查看资源使用情况
docker stats checklist-mcp-server --no-stream
```

## 🔧 资源限制参数详解 / Resource Limit Parameters Explained

### CPU 限制 / CPU Limits

```bash
--cpus="1.0"              # 限制使用 1 个 CPU 核心
--cpus="0.5"              # 限制使用 0.5 个 CPU 核心
--cpus="2.0"              # 限制使用 2 个 CPU 核心
```

### 内存限制 / Memory Limits

```bash
--memory="512m"           # 限制内存为 512MB
--memory="1g"             # 限制内存为 1GB
--memory="256m"           # 限制内存为 256MB

--memory-swap="512m"      # 限制内存+交换空间总和为 512MB
                          # 设置为与 --memory 相同值表示禁用 swap
```

### 完整资源限制示例 / Complete Resource Limit Examples

#### 低资源配置（0.5 vCPU, 256MB）/ Low Resource
```bash
docker run -d \
  --name checklist-mcp-server \
  -p 8585:8585 \
  --cpus="0.5" \
  --memory="256m" \
  --memory-swap="256m" \
  -e MAX_SESSIONS=50 \
  ghcr.io/radiumce/checklist-mcp-server:latest
```

#### 标准配置（1 vCPU, 512MB）/ Standard
```bash
docker run -d \
  --name checklist-mcp-server \
  -p 8585:8585 \
  --cpus="1.0" \
  --memory="512m" \
  --memory-swap="512m" \
  -e MAX_SESSIONS=100 \
  ghcr.io/radiumce/checklist-mcp-server:latest
```

#### 高资源配置（2 vCPU, 1GB）/ High Resource
```bash
docker run -d \
  --name checklist-mcp-server \
  -p 8585:8585 \
  --cpus="2.0" \
  --memory="1g" \
  --memory-swap="1g" \
  -e MAX_SESSIONS=200 \
  ghcr.io/radiumce/checklist-mcp-server:latest
```

## 📊 监控资源使用 / Monitor Resource Usage

### 实时监控 / Real-time Monitoring

```bash
# 实时查看资源使用
docker stats checklist-mcp-server

# 输出示例：
# CONTAINER ID   NAME                   CPU %     MEM USAGE / LIMIT   MEM %     NET I/O
# 3f0eaeaa2c3f   checklist-mcp-server   0.50%     45MiB / 512MiB     8.79%     1.2kB / 0B
```

### 查看资源限制 / View Resource Limits

```bash
# 查看容器配置
docker inspect checklist-mcp-server | grep -A 10 "HostConfig"

# 查看 CPU 限制
docker inspect checklist-mcp-server --format='{{.HostConfig.NanoCpus}}'

# 查看内存限制
docker inspect checklist-mcp-server --format='{{.HostConfig.Memory}}'
```

## 🔄 更新和管理 / Update and Management

### 更新镜像 / Update Image

```bash
# 1. 停止并删除旧容器
docker stop checklist-mcp-server
docker rm checklist-mcp-server

# 2. 拉取最新镜像
docker pull ghcr.io/radiumce/checklist-mcp-server:latest

# 3. 运行新容器
docker run -d \
  --name checklist-mcp-server \
  -p 8585:8585 \
  --cpus="1.0" \
  --memory="512m" \
  --memory-swap="512m" \
  ghcr.io/radiumce/checklist-mcp-server:latest
```

### 重启容器 / Restart Container

```bash
docker restart checklist-mcp-server
```

### 停止容器 / Stop Container

```bash
docker stop checklist-mcp-server
```

### 删除容器 / Remove Container

```bash
docker rm -f checklist-mcp-server
```

## 🌐 网络配置 / Network Configuration

### 自定义端口 / Custom Port

```bash
# 映射到不同的主机端口
docker run -d \
  --name checklist-mcp-server \
  -p 3000:8585 \
  --cpus="1.0" \
  --memory="512m" \
  ghcr.io/radiumce/checklist-mcp-server:latest

# 访问: http://localhost:3000
```

### 使用自定义网络 / Using Custom Network

```bash
# 创建自定义网络
docker network create mcp-network

# 在自定义网络中运行
docker run -d \
  --name checklist-mcp-server \
  --network mcp-network \
  -p 8585:8585 \
  --cpus="1.0" \
  --memory="512m" \
  ghcr.io/radiumce/checklist-mcp-server:latest
```

## 💾 数据持久化（可选）/ Data Persistence (Optional)

如果需要持久化日志或数据：

```bash
# 创建数据卷
docker volume create checklist-data

# 运行时挂载数据卷
docker run -d \
  --name checklist-mcp-server \
  -p 8585:8585 \
  --cpus="1.0" \
  --memory="512m" \
  -v checklist-data:/app/data \
  ghcr.io/radiumce/checklist-mcp-server:latest
```

## 🔐 安全配置 / Security Configuration

### 只读文件系统 / Read-only Filesystem

```bash
docker run -d \
  --name checklist-mcp-server \
  -p 8585:8585 \
  --cpus="1.0" \
  --memory="512m" \
  --read-only \
  --tmpfs /tmp \
  ghcr.io/radiumce/checklist-mcp-server:latest
```

### 限制网络访问 / Limit Network Access

```bash
# 仅允许本地访问
docker run -d \
  --name checklist-mcp-server \
  -p 127.0.0.1:8585:8585 \
  --cpus="1.0" \
  --memory="512m" \
  ghcr.io/radiumce/checklist-mcp-server:latest
```

## 📝 完整部署脚本 / Complete Deployment Script

创建 `deploy.sh` 文件：

```bash
#!/bin/bash

# 部署配置
IMAGE="ghcr.io/radiumce/checklist-mcp-server:latest"
CONTAINER_NAME="checklist-mcp-server"
PORT="8585"
CPU_LIMIT="1.0"
MEMORY_LIMIT="512m"

# 停止并删除旧容器（如果存在）
echo "Stopping old container..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# 拉取最新镜像
echo "Pulling latest image..."
docker pull $IMAGE

# 运行新容器
echo "Starting new container..."
docker run -d \
  --name $CONTAINER_NAME \
  -p $PORT:8585 \
  --cpus="$CPU_LIMIT" \
  --memory="$MEMORY_LIMIT" \
  --memory-swap="$MEMORY_LIMIT" \
  -e NODE_ENV=production \
  -e PORT=8585 \
  -e MAX_SESSIONS=100 \
  --restart unless-stopped \
  $IMAGE

# 等待容器启动
echo "Waiting for container to start..."
sleep 5

# 检查状态
echo "Container status:"
docker ps | grep $CONTAINER_NAME

# 测试健康检查
echo "Testing health endpoint..."
curl -s http://localhost:$PORT/health | jq .

echo "Deployment complete!"
```

使用方法：

```bash
chmod +x deploy.sh
./deploy.sh
```

## 🎯 MCP 客户端配置 / MCP Client Configuration

在其他电脑上配置 MCP 客户端：

```json
{
  "mcpServers": {
    "checklist": {
      "transport": "http",
      "url": "http://localhost:8585/mcp"
    }
  }
}
```

如果服务器在远程机器上：

```json
{
  "mcpServers": {
    "checklist": {
      "transport": "http",
      "url": "http://your-server-ip:8585/mcp"
    }
  }
}
```

## 🛠️ 故障排查 / Troubleshooting

### 容器无法启动 / Container Won't Start

```bash
# 查看日志
docker logs checklist-mcp-server

# 查看详细信息
docker inspect checklist-mcp-server
```

### 内存不足 / Out of Memory

```bash
# 增加内存限制
docker update --memory="1g" checklist-mcp-server

# 或重新创建容器
docker rm -f checklist-mcp-server
docker run -d --name checklist-mcp-server -p 8585:8585 --memory="1g" ghcr.io/radiumce/checklist-mcp-server:latest
```

### CPU 使用率过高 / High CPU Usage

```bash
# 查看资源使用
docker stats checklist-mcp-server

# 调整 CPU 限制
docker update --cpus="0.5" checklist-mcp-server
```

### 端口被占用 / Port Already in Use

```bash
# 使用不同端口
docker run -d --name checklist-mcp-server -p 3000:8585 --cpus="1.0" --memory="512m" ghcr.io/radiumce/checklist-mcp-server:latest
```

## 📚 相关命令速查 / Command Quick Reference

```bash
# 查看运行状态
docker ps

# 查看日志
docker logs -f checklist-mcp-server

# 查看资源使用
docker stats checklist-mcp-server

# 重启容器
docker restart checklist-mcp-server

# 停止容器
docker stop checklist-mcp-server

# 删除容器
docker rm checklist-mcp-server

# 进入容器
docker exec -it checklist-mcp-server sh

# 测试健康检查
curl http://localhost:8585/health

# 查看容器配置
docker inspect checklist-mcp-server
```

## ✅ 部署检查清单 / Deployment Checklist

- [ ] Docker 已安装
- [ ] 镜像已拉取
- [ ] 端口未被占用
- [ ] 资源限制已设置
- [ ] 容器已启动
- [ ] 健康检查通过
- [ ] MCP 客户端已配置
- [ ] 服务可正常访问
