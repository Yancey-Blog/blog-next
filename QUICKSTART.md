# 快速开始

## 1. 安装依赖

```bash
pnpm install
```

## 2. 配置环境变量

复制环境变量模板：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 填入以下信息：

### Neon 数据库设置

1. 访问 [Neon](https://neon.tech)
2. 创建新项目
3. 复制连接字符串到 `DATABASE_URL`

### Google OAuth 设置

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建项目 → 启用 API → OAuth 同意屏幕
3. 创建 OAuth 2.0 客户端 ID
4. 授权重定向 URI: `http://localhost:3000/api/auth/callback/google`
5. 复制 Client ID 和 Secret

### GitHub OAuth 设置

1. 访问 [GitHub Settings](https://github.com/settings/developers)
2. New OAuth App
3. 回调 URL: `http://localhost:3000/api/auth/callback/github`
4. 复制 Client ID 和 Secret

### Better Auth Secret

生成随机密钥：

```bash
openssl rand -base64 32
```

## 3. 初始化数据库

推送数据库 schema：

```bash
pnpm db:push
```

或者生成迁移文件：

```bash
pnpm db:generate
pnpm db:migrate
```

## 4. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

## 5. 测试流程

1. 访问 `/auth/login` 登录
2. 使用 Google 或 GitHub 登录
3. 登录成功后会重定向到 `/admin`
4. 访问 `/admin/blog-management` 管理博客

## API 测试

### 创建博客

```bash
curl -X POST http://localhost:3000/api/blogs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "我的第一篇博客",
    "slug": "my-first-blog",
    "content": "这是博客内容",
    "published": false
  }'
```

### 获取博客列表

```bash
# 获取所有博客
curl http://localhost:3000/api/blogs

# 仅获取已发布
curl http://localhost:3000/api/blogs?published=true

# 搜索
curl http://localhost:3000/api/blogs?search=关键词

# 分页
curl http://localhost:3000/api/blogs?page=1&pageSize=10
```

### 获取单个博客

```bash
curl http://localhost:3000/api/blogs/{blog-id}
```

### 更新博客

```bash
curl -X PATCH http://localhost:3000/api/blogs/{blog-id} \
  -H "Content-Type: application/json" \
  -d '{
    "title": "更新后的标题",
    "published": true
  }'
```

### 删除博客

```bash
curl -X DELETE http://localhost:3000/api/blogs/{blog-id}
```

## 数据库管理

启动 Drizzle Studio 可视化管理：

```bash
pnpm db:studio
```

访问 https://local.drizzle.studio

## 项目结构

```
blog-next/
├── app/
│   ├── (cms)/              # CMS 后台路由组
│   │   ├── admin/          # 管理页面（需要认证）
│   │   ├── auth/           # 认证页面
│   │   └── layout.tsx      # CMS 布局
│   ├── (frontend)/         # 前台路由组
│   └── api/                # API 路由
│       ├── auth/           # 认证 API
│       └── blogs/          # 博客 API
├── components/             # React 组件
│   ├── providers/          # Context Providers
│   └── ui/                 # UI 组件
├── src/
│   ├── db/                 # 数据库相关
│   │   ├── schema.ts       # Drizzle 表定义
│   │   └── index.ts        # 数据库实例
│   └── lib/                # 工具库
│       ├── auth.ts         # Better Auth 配置
│       ├── auth-client.ts  # 客户端认证工具
│       ├── session.ts      # 会话工具
│       └── validations/    # Zod 验证 schemas
├── middleware.ts           # Next.js 中间件（路由保护）
└── drizzle.config.ts       # Drizzle Kit 配置
```

## 权限说明

### 公开访问

- `GET /api/blogs` - 博客列表
- `GET /api/blogs/[id]` - 博客详情

### 需要认证

- `POST /api/blogs` - 创建博客
- `PATCH /api/blogs/[id]` - 更新博客（仅作者）
- `DELETE /api/blogs/[id]` - 删除博客（仅作者）
- `/admin/*` 路由 - 后台管理页面

## 下一步

查看 [BACKEND_SETUP.md](./BACKEND_SETUP.md) 了解更多详细信息。
