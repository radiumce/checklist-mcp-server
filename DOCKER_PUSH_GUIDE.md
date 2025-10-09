# 推送 Docker 镜像到 GHCR 指南 / Push Docker Image to GHCR Guide

## 📦 镜像信息 / Image Information

- **Registry**: `ghcr.io`
- **Image Name**: `ghcr.io/radiumce/checklist-mcp-server`
- **Version**: `1.2.0`

## 🚀 方法 1: 使用自动化脚本（推荐）/ Method 1: Using Automated Script (Recommended)

### 使用 npm 脚本 / Using npm Script

```bash
npm run docker:push
```

### 使用 Make 命令 / Using Make Command

```bash
make push
```

### 直接运行脚本 / Run Script Directly

```bash
./scripts/docker-push-ghcr.sh
```

## 🔧 方法 2: 手动推送 / Method 2: Manual Push

### 步骤 1: 登录到 GHCR / Step 1: Login to GHCR

#### 选项 A: 使用 GitHub CLI（推荐）/ Option A: Using GitHub CLI (Recommended)

```bash
# 安装 GitHub CLI（如果未安装）/ Install GitHub CLI (if not installed)
# macOS:
brew install gh

# 登录 GitHub / Login to GitHub
gh auth login

# 登录到 GHCR / Login to GHCR
gh auth token | docker login ghcr.io -u radiumce --password-stdin
```

#### 选项 B: 使用 Personal Access Token / Option B: Using Personal Access Token

1. **创建 Personal Access Token / Create Personal Access Token**
   - 访问 / Visit: https://github.com/settings/tokens/new
   - 选择权限 / Select scopes:
     - ✅ `write:packages` - 上传容器镜像
     - ✅ `read:packages` - 下载容器镜像
     - ✅ `delete:packages` - 删除容器镜像（可选）
   - 生成并复制 token / Generate and copy token

2. **使用 Token 登录 / Login with Token**
   ```bash
   # 将 YOUR_TOKEN 替换为您的实际 token
   # Replace YOUR_TOKEN with your actual token
   echo "YOUR_TOKEN" | docker login ghcr.io -u radiumce --password-stdin
   ```

   或者交互式登录 / Or login interactively:
   ```bash
   docker login ghcr.io -u radiumce
   # 输入密码时粘贴您的 token
   # Paste your token when prompted for password
   ```

### 步骤 2: 标记镜像 / Step 2: Tag Images

```bash
# 标记为 latest
docker tag checklist-mcp-server:latest ghcr.io/radiumce/checklist-mcp-server:latest

# 标记为版本号
docker tag checklist-mcp-server:latest ghcr.io/radiumce/checklist-mcp-server:1.2.0

# 标记为 v 前缀版本号
docker tag checklist-mcp-server:latest ghcr.io/radiumce/checklist-mcp-server:v1.2.0
```

### 步骤 3: 推送镜像 / Step 3: Push Images

```bash
# 推送 latest 标签
docker push ghcr.io/radiumce/checklist-mcp-server:latest

# 推送版本号标签
docker push ghcr.io/radiumce/checklist-mcp-server:1.2.0

# 推送 v 前缀版本号标签
docker push ghcr.io/radiumce/checklist-mcp-server:v1.2.0
```

### 步骤 4: 设置镜像为公开（可选）/ Step 4: Make Image Public (Optional)

1. 访问 / Visit: https://github.com/radiumce?tab=packages
2. 点击 `checklist-mcp-server` 包
3. 点击 "Package settings"
4. 滚动到底部，点击 "Change visibility"
5. 选择 "Public"
6. 确认更改

## 📥 拉取镜像 / Pull Image

推送成功后，其他用户可以使用以下命令拉取镜像：

After successful push, others can pull the image using:

```bash
# 拉取 latest 版本
docker pull ghcr.io/radiumce/checklist-mcp-server:latest

# 拉取特定版本
docker pull ghcr.io/radiumce/checklist-mcp-server:1.2.0
docker pull ghcr.io/radiumce/checklist-mcp-server:v1.2.0
```

## 🏃 运行镜像 / Run Image

```bash
# 从 GHCR 运行镜像
docker run -d \
  --name checklist-mcp-server \
  -p 8585:8585 \
  -e MAX_SESSIONS=100 \
  --restart unless-stopped \
  ghcr.io/radiumce/checklist-mcp-server:latest
```

## 🔍 验证推送 / Verify Push

### 检查镜像是否存在 / Check if Image Exists

```bash
# 尝试拉取镜像（不运行）
docker pull ghcr.io/radiumce/checklist-mcp-server:latest

# 查看镜像信息
docker images ghcr.io/radiumce/checklist-mcp-server
```

### 在 GitHub 上查看 / View on GitHub

访问 / Visit:
- Package 页面 / Package page: https://github.com/radiumce/checklist-mcp-server/pkgs/container/checklist-mcp-server
- 您的 Packages / Your packages: https://github.com/radiumce?tab=packages

## 🔄 更新 docker-compose.yml / Update docker-compose.yml

推送后，您可以更新 `docker-compose.yml` 使用 GHCR 镜像：

After pushing, you can update `docker-compose.yml` to use GHCR image:

```yaml
version: '3.8'

services:
  checklist-mcp-server:
    image: ghcr.io/radiumce/checklist-mcp-server:latest
    # 或使用特定版本 / Or use specific version:
    # image: ghcr.io/radiumce/checklist-mcp-server:1.2.0
    container_name: checklist-mcp-server
    ports:
      - "8585:8585"
    environment:
      - NODE_ENV=production
      - PORT=8585
      - MAX_SESSIONS=100
    restart: unless-stopped
```

## 📝 更新 README / Update README

推送后，建议在 README.md 中添加从 GHCR 拉取的说明：

After pushing, recommend adding GHCR pull instructions to README.md:

```markdown
### Docker 安装 / Docker Installation

```bash
# 从 GitHub Container Registry 拉取并运行
docker run -d \
  --name checklist-mcp-server \
  -p 8585:8585 \
  ghcr.io/radiumce/checklist-mcp-server:latest
```
```

## 🛠️ 故障排查 / Troubleshooting

### 认证失败 / Authentication Failed

```bash
# 错误: unauthorized: unauthenticated
# 解决: 重新登录
docker logout ghcr.io
gh auth token | docker login ghcr.io -u radiumce --password-stdin
```

### 权限不足 / Permission Denied

```bash
# 错误: denied: permission_denied
# 解决: 确保 token 有 write:packages 权限
# Make sure token has write:packages permission
```

### 镜像不存在 / Image Not Found

```bash
# 错误: Error response from daemon: pull access denied
# 解决: 检查镜像名称和标签是否正确
# Check if image name and tag are correct
docker images checklist-mcp-server
```

## 📚 相关资源 / Related Resources

- [GitHub Container Registry 文档](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker 推送文档](https://docs.docker.com/engine/reference/commandline/push/)
- [GitHub Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)

## 🎉 完成检查清单 / Completion Checklist

- [ ] 本地镜像已构建 / Local image built
- [ ] 已登录到 GHCR / Logged in to GHCR
- [ ] 镜像已标记 / Images tagged
- [ ] 镜像已推送 / Images pushed
- [ ] 镜像可见性已设置（公开/私有）/ Visibility set (public/private)
- [ ] 已验证可以拉取 / Verified can pull
- [ ] README 已更新 / README updated
- [ ] docker-compose.yml 已更新 / docker-compose.yml updated
