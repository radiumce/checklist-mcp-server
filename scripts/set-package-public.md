# 设置 Docker 镜像为公开 / Set Docker Image to Public

## 📝 步骤说明 / Step-by-Step Instructions

### 方法 1: 通过 GitHub Web 界面（推荐）/ Method 1: Via GitHub Web Interface (Recommended)

#### 步骤 1: 访问 Packages 页面 / Step 1: Visit Packages Page

访问您的 GitHub Packages 页面：
Visit your GitHub Packages page:

🔗 **https://github.com/radiumce?tab=packages**

#### 步骤 2: 选择包 / Step 2: Select Package

1. 在 Packages 列表中找到 `checklist-mcp-server`
2. 点击包名称进入包详情页面

Find `checklist-mcp-server` in the Packages list and click on it.

#### 步骤 3: 打开包设置 / Step 3: Open Package Settings

1. 在包详情页面，点击右侧的 **"Package settings"** 按钮
2. 或直接访问：https://github.com/users/radiumce/packages/container/checklist-mcp-server/settings

On the package details page, click the **"Package settings"** button on the right.

#### 步骤 4: 更改可见性 / Step 4: Change Visibility

1. 滚动到页面底部的 **"Danger Zone"** 区域
2. 找到 **"Change package visibility"** 部分
3. 点击 **"Change visibility"** 按钮
4. 在弹出的对话框中：
   - 选择 **"Public"**
   - 输入包名称 `checklist-mcp-server` 确认
   - 点击 **"I understand the consequences, change package visibility"**

Scroll to the bottom "Danger Zone" section:
- Find "Change package visibility"
- Click "Change visibility"
- Select "Public"
- Type package name to confirm
- Click confirm button

#### 步骤 5: 验证 / Step 5: Verify

设置完成后，您应该能看到：
- 包详情页面显示 "Public" 标签
- 任何人都可以拉取镜像，无需认证

After setting, you should see:
- "Public" label on package details page
- Anyone can pull the image without authentication

### 方法 2: 通过 GitHub CLI（实验性）/ Method 2: Via GitHub CLI (Experimental)

⚠️ **注意**: GitHub CLI 目前对包可见性的支持有限，推荐使用 Web 界面。

```bash
# 安装 GitHub CLI（如果未安装）
brew install gh

# 登录
gh auth login

# 使用 API 设置可见性（需要 admin:packages 权限）
gh api \
  --method PATCH \
  -H "Accept: application/vnd.github+json" \
  /user/packages/container/checklist-mcp-server \
  -f visibility='public'
```

### 📋 快速链接 / Quick Links

- **您的 Packages**: https://github.com/radiumce?tab=packages
- **包详情页面**: https://github.com/radiumce/checklist-mcp-server/pkgs/container/checklist-mcp-server
- **包设置页面**: https://github.com/users/radiumce/packages/container/checklist-mcp-server/settings

### ✅ 验证公开状态 / Verify Public Status

设置为公开后，测试是否可以无需认证拉取：

After setting to public, test if you can pull without authentication:

```bash
# 登出 Docker（测试公开访问）
docker logout ghcr.io

# 尝试拉取镜像（应该成功）
docker pull ghcr.io/radiumce/checklist-mcp-server:latest

# 如果成功，说明镜像已公开
# If successful, the image is public
```

### 🔒 公开 vs 私有 / Public vs Private

#### 公开镜像 (Public)
- ✅ 任何人都可以拉取
- ✅ 无需 GitHub 认证
- ✅ 适合开源项目
- ✅ 增加项目可见性

#### 私有镜像 (Private)
- 🔒 仅授权用户可以拉取
- 🔒 需要 GitHub 认证
- 🔒 适合私有项目
- 🔒 更好的访问控制

### 📊 设置后的影响 / Impact After Setting

#### 对用户的影响 / Impact on Users

**公开后，用户可以直接使用：**

```bash
# 无需登录，直接拉取
docker pull ghcr.io/radiumce/checklist-mcp-server:latest

# 直接运行
docker run -d -p 8585:8585 ghcr.io/radiumce/checklist-mcp-server:latest
```

#### 对 README 的建议更新 / Suggested README Update

在 README.md 中添加：

```markdown
### 🐳 从 GitHub Container Registry 安装

```bash
# 拉取镜像
docker pull ghcr.io/radiumce/checklist-mcp-server:latest

# 运行容器
docker run -d \
  --name checklist-mcp-server \
  -p 8585:8585 \
  ghcr.io/radiumce/checklist-mcp-server:latest
```

或使用 Docker Compose:

```yaml
services:
  checklist-mcp-server:
    image: ghcr.io/radiumce/checklist-mcp-server:latest
    ports:
      - "8585:8585"
    restart: unless-stopped
```
```

### 🎯 完成检查清单 / Completion Checklist

- [ ] 访问 Packages 页面
- [ ] 找到 checklist-mcp-server 包
- [ ] 进入 Package settings
- [ ] 更改可见性为 Public
- [ ] 确认更改
- [ ] 验证可以无认证拉取
- [ ] 更新 README.md
- [ ] 更新 docker-compose.yml

### 🆘 故障排查 / Troubleshooting

#### 找不到 "Change visibility" 选项

**原因**: 
- 可能还没有推送镜像到 GHCR
- 权限不足

**解决**:
```bash
# 先推送镜像
npm run docker:push

# 然后再设置可见性
```

#### 无法更改可见性

**原因**: 
- 需要包的 admin 权限
- 组织包可能有不同的权限要求

**解决**:
- 确保您是包的所有者
- 检查 GitHub 账户权限

### 📚 相关文档 / Related Documentation

- [GitHub Packages 可见性文档](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility)
- [Container Registry 文档](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

---

## 🚀 现在就开始 / Start Now

**点击以下链接直接访问设置页面：**

1. 📦 **Packages 页面**: https://github.com/radiumce?tab=packages
2. ⚙️ **包设置页面**: https://github.com/users/radiumce/packages/container/checklist-mcp-server/settings

**或者在终端运行：**

```bash
# macOS 打开浏览器
open "https://github.com/radiumce?tab=packages"
```
