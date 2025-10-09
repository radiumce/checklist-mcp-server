# Docker 快速开始 / Docker Quick Start

## 一键启动 / One-Command Start

```bash
# 构建并运行 / Build and run
docker-compose up -d

# 查看日志 / View logs
docker-compose logs -f

# 停止服务 / Stop service
docker-compose down
```

## 手动构建 / Manual Build

```bash
# 1. 构建镜像 / Build image
docker build -t checklist-mcp-server:latest .

# 2. 运行容器 / Run container
docker run -d \
  --name checklist-mcp-server \
  -p 8585:8585 \
  -e MAX_SESSIONS=100 \
  --restart unless-stopped \
  checklist-mcp-server:latest

# 3. 检查状态 / Check status
docker ps
docker logs checklist-mcp-server

# 4. 测试健康检查 / Test health check
curl http://localhost:8585/health
```

## 使用构建脚本 / Using Build Script

```bash
# 构建并测试 / Build and test
./scripts/docker-build.sh

# 仅构建 / Build only
./scripts/docker-build.sh --build-only

# 自定义标签 / Custom tag
./scripts/docker-build.sh --tag v1.2.0
```

## MCP 客户端配置 / MCP Client Configuration

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

## 常用命令 / Common Commands

```bash
# 查看日志 / View logs
docker logs -f checklist-mcp-server

# 重启容器 / Restart container
docker restart checklist-mcp-server

# 停止容器 / Stop container
docker stop checklist-mcp-server

# 删除容器 / Remove container
docker rm checklist-mcp-server

# 查看资源使用 / View resource usage
docker stats checklist-mcp-server

# 进入容器 / Enter container
docker exec -it checklist-mcp-server sh
```

## 镜像大小优化 / Image Size Optimization

本项目使用以下技术优化镜像大小：

This project uses the following techniques to optimize image size:

- ✅ **node:20-slim** 基础镜像 / base image (~150MB)
- ✅ **多阶段构建** / Multi-stage build
- ✅ **仅生产依赖** / Production dependencies only
- ✅ **最小化文件** / Minimal files via .dockerignore

**预期镜像大小 / Expected image size:** ~150-200MB

对比 / Comparison:
- node:20 完整镜像 / Full image: ~900MB
- node:20-slim: ~150MB
- 本项目 / This project: ~150-200MB

## 故障排查 / Troubleshooting

### 端口已被占用 / Port Already in Use

```bash
# 查看端口占用 / Check port usage
lsof -i :8585

# 使用其他端口 / Use different port
docker run -d -p 3000:8585 checklist-mcp-server:latest
```

### 容器无法启动 / Container Won't Start

```bash
# 查看详细日志 / View detailed logs
docker logs checklist-mcp-server

# 检查容器状态 / Check container status
docker inspect checklist-mcp-server
```

### 健康检查失败 / Health Check Failing

```bash
# 手动测试 / Manual test
docker exec checklist-mcp-server wget -O- http://localhost:8585/health

# 查看健康状态 / View health status
docker inspect --format='{{.State.Health.Status}}' checklist-mcp-server
```

## 更多信息 / More Information

📖 完整文档 / Full documentation: [DOCKER.md](DOCKER.md)
📖 项目主页 / Project home: [README.md](README.md)
