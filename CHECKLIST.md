# 部署前检查清单

## 环境配置 ✓

### 1. 数据库配置

- [ ] 在 Neon 创建 PostgreSQL 数据库
- [ ] 复制 `DATABASE_URL` 到 `.env.local`

### 2. Google OAuth 配置

- [ ] 访问 [Google Cloud Console](https://console.cloud.google.com/)
- [ ] 创建 OAuth 2.0 客户端 ID
- [ ] 添加授权重定向 URI: `{APP_URL}/api/auth/callback/google`
- [ ] 复制 `GOOGLE_CLIENT_ID` 到 `.env.local`
- [ ] 复制 `GOOGLE_CLIENT_SECRET` 到 `.env.local`

### 3. GitHub OAuth 配置

- [ ] 访问 [GitHub Developer Settings](https://github.com/settings/developers)
- [ ] 创建新的 OAuth App
- [ ] 设置 Authorization callback URL: `{APP_URL}/api/auth/callback/github`
- [ ] 复制 `GITHUB_CLIENT_ID` 到 `.env.local`
- [ ] 复制 `GITHUB_CLIENT_SECRET` 到 `.env.local`

### 4. Better Auth 配置

- [ ] 生成随机密钥: `openssl rand -base64 32`
- [ ] 复制到 `BETTER_AUTH_SECRET`
- [ ] 设置 `BETTER_AUTH_URL` (开发: http://localhost:3000)
- [ ] 设置 `NEXT_PUBLIC_APP_URL` (开发: http://localhost:3000)

### 5. 环境变量示例

```bash
# .env.local
DATABASE_URL=postgresql://user:pass@host/db
NEXT_PUBLIC_APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
BETTER_AUTH_SECRET=xxx
BETTER_AUTH_URL=http://localhost:3000
```

## 数据库初始化 ✓

- [ ] 运行 `pnpm db:push` 推送 schema 到数据库

或者

- [ ] 运行 `pnpm db:generate` 生成迁移文件
- [ ] 运行 `pnpm db:migrate` 应用迁移

## 启动应用 ✓

- [ ] 运行 `pnpm dev`
- [ ] 访问 http://localhost:3000

## 功能测试 ✓

### 认证流程

- [ ] 访问 `/auth/login`
- [ ] 测试 Google 登录
- [ ] 测试 GitHub 登录
- [ ] 确认登录后重定向到 `/admin`
- [ ] 测试登出功能

### 博客 API

- [ ] 创建一篇博客（POST `/api/blogs`）
- [ ] 获取博客列表（GET `/api/blogs`）
- [ ] 获取单个博客（GET `/api/blogs/[id]`）
- [ ] 更新博客（PATCH `/api/blogs/[id]`）
- [ ] 删除博客（DELETE `/api/blogs/[id]`）

### 权限测试

- [ ] 未登录时无法访问 `/admin`
- [ ] 未登录时无法创建/修改/删除博客
- [ ] 仅作者可修改/删除自己的博客
- [ ] 公开可访问已发布的博客列表

### 前台页面

- [ ] 访问 `/blogs` 查看博客列表
- [ ] 测试搜索功能
- [ ] 测试分页功能
- [ ] 访问 `/blogs/[slug]` 查看博客详情

## 代码质量检查 ✓

- [ ] 运行 `pnpm lint` 检查代码规范
- [ ] 运行 `pnpm build` 确保构建成功
- [ ] 检查 TypeScript 类型错误

## 生产部署准备

### Vercel 部署

- [ ] 在 Vercel 创建新项目
- [ ] 连接 GitHub 仓库
- [ ] 设置环境变量（所有 `.env.local` 中的变量）
- [ ] 更新 OAuth 回调 URL 为生产域名
- [ ] 部署

### 其他平台（Railway, Fly.io 等）

- [ ] 设置环境变量
- [ ] 配置构建命令: `pnpm build`
- [ ] 配置启动命令: `pnpm start`
- [ ] 运行数据库迁移: `pnpm db:migrate`
- [ ] 更新 OAuth 回调 URL
- [ ] 部署

## 安全检查

- [ ] `.env.local` 已添加到 `.gitignore`
- [ ] 生产环境使用强密码和密钥
- [ ] 数据库连接使用 SSL
- [ ] OAuth 回调 URL 正确配置
- [ ] 所有 API 输入都经过验证

## 性能优化（可选）

- [ ] 启用 Next.js Image 优化
- [ ] 配置 ISR（增量静态再生成）
- [ ] 添加 Redis 缓存
- [ ] 启用 CDN

## 监控和日志（可选）

- [ ] 集成 Sentry 错误追踪
- [ ] 配置日志系统
- [ ] 设置性能监控
- [ ] 配置告警通知

## 完成！🎉

如果所有检查项都完成，你的博客系统应该已经可以正常运行了！

### 快速命令参考

```bash
# 开发
pnpm dev                  # 启动开发服务器
pnpm build                # 构建生产版本
pnpm start                # 启动生产服务器
pnpm lint                 # 代码检查

# 数据库
pnpm db:generate          # 生成迁移
pnpm db:migrate           # 运行迁移
pnpm db:push              # 推送 schema
pnpm db:studio            # 启动 Drizzle Studio
```

### 文档参考

- [快速开始指南](./QUICKSTART.md)
- [后端设置详解](./BACKEND_SETUP.md)
- [实现总结](./IMPLEMENTATION_SUMMARY.md)
