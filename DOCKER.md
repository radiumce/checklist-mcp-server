# Docker 部署指南 / Docker Deployment Guide

本文档提供了使用 Docker 部署 Checklist MCP Server 的详细说明。

This document provides detailed instructions for deploying Checklist MCP Server using Docker.

## 快速开始 / Quick Start

### 使用 Docker / Using Docker

```bash
# 构建镜像 / Build image
docker build -t checklist-mcp-server:latest .

# 运行容器 / Run container
docker run -d \
  --name checklist-mcp-server \
  -p 8585:8585 \
  -e MAX_SESSIONS=100 \
  checklist-mcp-server:latest

# 查看日志 / View logs
docker logs -f checklist-mcp-server

# 停止容器 / Stop container
docker stop checklist-mcp-server

# 删除容器 / Remove container
docker rm checklist-mcp-server
```

### 使用 Docker Compose / Using Docker Compose

```bash
# 启动服务 / Start service
docker-compose up -d

# 查看日志 / View logs
docker-compose logs -f

# 停止服务 / Stop service
docker-compose down

# 重新构建并启动 / Rebuild and start
docker-compose up -d --build
```

## 镜像特性 / Image Features

### 优化的镜像大小 / Optimized Image Size

- **基础镜像**: `node:20-slim` - 最小化的 Node.js 运行时
- **多阶段构建**: 分离构建和运行环境，减小最终镜像体积
- **生产依赖**: 仅包含运行时必需的依赖
- **预期大小**: ~150-200MB（相比完整 node 镜像节省 ~600MB）

**Base Image**: `node:20-slim` - Minimal Node.js runtime
**Multi-stage Build**: Separate build and runtime environments
**Production Dependencies**: Only runtime dependencies included
**Expected Size**: ~150-200MB (saves ~600MB compared to full node image)

### 安全特性 / Security Features

- 非 root 用户运行（可选配置）
- 最小化攻击面
- 生产环境优化

**Non-root User**: Optional configuration
**Minimal Attack Surface**: Only essential components
**Production Optimized**: Security best practices

## 配置选项 / Configuration Options

### 环境变量 / Environment Variables

| 变量名 / Variable | 默认值 / Default | 说明 / Description |
|------------------|-----------------|-------------------|
| `PORT` | 8585 | HTTP 服务器端口 / HTTP server port |
| `NODE_ENV` | production | 运行环境 / Runtime environment |
| `MAX_SESSIONS` | 100 | 最大会话数 / Maximum concurrent sessions |

### 端口映射 / Port Mapping

默认情况下，容器暴露 8585 端口。您可以映射到主机的任意端口：

By default, the container exposes port 8585. You can map it to any host port:

```bash
# 映射到主机 3000 端口 / Map to host port 3000
docker run -d -p 3000:8585 checklist-mcp-server:latest

# 映射到主机 8080 端口 / Map to host port 8080
docker run -d -p 8080:8585 checklist-mcp-server:latest
```

### 自定义配置 / Custom Configuration

```bash
# 高流量部署 / High-traffic deployment
docker run -d \
  --name checklist-mcp-server \
  -p 8585:8585 \
  -e MAX_SESSIONS=500 \
  -e NODE_ENV=production \
  checklist-mcp-server:latest

# 资源受限环境 / Resource-constrained environment
docker run -d \
  --name checklist-mcp-server \
  -p 8585:8585 \
  -e MAX_SESSIONS=50 \
  --memory="256m" \
  --cpus="0.5" \
  checklist-mcp-server:latest
```

## 健康检查 / Health Check

容器包含内置健康检查，每 30 秒检查一次服务状态。

The container includes a built-in health check that verifies service status every 30 seconds.

```bash
# 查看健康状态 / Check health status
docker inspect --format='{{.State.Health.Status}}' checklist-mcp-server

# 手动测试健康端点 / Manually test health endpoint
curl http://localhost:8585/health
```

**健康检查响应 / Health Check Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "server": "checklist-mcp-server",
  "version": "1.2.0"
}
```

## MCP 客户端配置 / MCP Client Configuration

使用 Docker 部署后，在 MCP 客户端中配置如下：

After deploying with Docker, configure your MCP client as follows:

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

如果使用自定义端口，请相应调整 URL：

If using a custom port, adjust the URL accordingly:

```json
{
  "mcpServers": {
    "checklist": {
      "transport": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

## 生产部署建议 / Production Deployment Recommendations

### 1. 使用持久化日志 / Use Persistent Logging

```bash
docker run -d \
  --name checklist-mcp-server \
  -p 8585:8585 \
  -v /var/log/checklist-mcp:/app/logs \
  checklist-mcp-server:latest
```

### 2. 设置重启策略 / Set Restart Policy

```bash
docker run -d \
  --name checklist-mcp-server \
  -p 8585:8585 \
  --restart unless-stopped \
  checklist-mcp-server:latest
```

### 3. 资源限制 / Resource Limits

```bash
docker run -d \
  --name checklist-mcp-server \
  -p 8585:8585 \
  --memory="512m" \
  --memory-swap="512m" \
  --cpus="1.0" \
  checklist-mcp-server:latest
```

### 4. 使用 Docker Compose 进行编排 / Use Docker Compose for Orchestration

推荐使用 `docker-compose.yml` 进行生产部署，便于管理和维护。

Recommended for production deployments for easier management and maintenance.

## 故障排查 / Troubleshooting

### 容器无法启动 / Container Won't Start

```bash
# 查看容器日志 / View container logs
docker logs checklist-mcp-server

# 查看详细错误信息 / View detailed error information
docker inspect checklist-mcp-server
```

### 端口冲突 / Port Conflict

```bash
# 检查端口占用 / Check port usage
lsof -i :8585

# 使用其他端口 / Use a different port
docker run -d -p 3000:8585 checklist-mcp-server:latest
```

### 健康检查失败 / Health Check Failing

```bash
# 进入容器调试 / Enter container for debugging
docker exec -it checklist-mcp-server sh

# 手动测试健康端点 / Manually test health endpoint
wget -O- http://localhost:8585/health
```

### 内存不足 / Out of Memory

```bash
# 增加内存限制 / Increase memory limit
docker update --memory="1g" checklist-mcp-server

# 或减少 MAX_SESSIONS / Or reduce MAX_SESSIONS
docker run -d -e MAX_SESSIONS=50 checklist-mcp-server:latest
```

## 镜像构建优化 / Image Build Optimization

### 查看镜像大小 / View Image Size

```bash
docker images checklist-mcp-server
```

### 清理构建缓存 / Clean Build Cache

```bash
# 清理 Docker 构建缓存 / Clean Docker build cache
docker builder prune

# 清理未使用的镜像 / Clean unused images
docker image prune -a
```

### 分析镜像层 / Analyze Image Layers

```bash
# 使用 dive 工具分析镜像 / Use dive tool to analyze image
docker run --rm -it \
  -v /var/run/docker.sock:/var/run/docker.sock \
  wagoodman/dive:latest checklist-mcp-server:latest
```

## 高级用法 / Advanced Usage

### 使用自定义 Dockerfile / Using Custom Dockerfile

如需进一步优化，可以修改 Dockerfile：

For further optimization, you can modify the Dockerfile:

```dockerfile
# 使用更小的基础镜像 / Use an even smaller base image
FROM node:20-alpine AS builder
# ... rest of the Dockerfile
```

### 多架构支持 / Multi-architecture Support

```bash
# 构建多架构镜像 / Build multi-architecture image
docker buildx build --platform linux/amd64,linux/arm64 \
  -t checklist-mcp-server:latest .
```

### 推送到镜像仓库 / Push to Image Registry

```bash
# 标记镜像 / Tag image
docker tag checklist-mcp-server:latest your-registry/checklist-mcp-server:latest

# 推送镜像 / Push image
docker push your-registry/checklist-mcp-server:latest
```

## 性能监控 / Performance Monitoring

### 查看容器资源使用 / View Container Resource Usage

```bash
# 实时监控 / Real-time monitoring
docker stats checklist-mcp-server

# 查看容器进程 / View container processes
docker top checklist-mcp-server
```

### 导出容器指标 / Export Container Metrics

```bash
# 获取容器统计信息 / Get container statistics
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" checklist-mcp-server
```

## 安全加固 / Security Hardening

### 以非 root 用户运行 / Run as Non-root User

在 Dockerfile 中添加：

Add to Dockerfile:

```dockerfile
# 创建非 root 用户 / Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 切换用户 / Switch user
USER nodejs
```

### 只读文件系统 / Read-only Filesystem

```bash
docker run -d \
  --name checklist-mcp-server \
  -p 8585:8585 \
  --read-only \
  --tmpfs /tmp \
  checklist-mcp-server:latest
```

## 相关资源 / Related Resources

- [Docker 官方文档 / Docker Official Documentation](https://docs.docker.com/)
- [Node.js Docker 最佳实践 / Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [项目主 README / Project Main README](./README.md)
