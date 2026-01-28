# 博客系统架构

## 技术栈

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js 15 (App Router)             │
│  TypeScript + React 19 + Tailwind CSS                   │
└─────────────────────────────────────────────────────────┘
```

## 系统架构图

```
┌───────────────────────────────────────────────────────────────────┐
│                          客户端                                    │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐              ┌──────────────────┐           │
│  │   前台页面      │              │   后台 CMS       │           │
│  │   /blogs        │              │   /admin         │           │
│  │   /blogs/[slug] │              │   /auth/login    │           │
│  └────────┬────────┘              └────────┬─────────┘           │
│           │                                │                     │
└───────────┼────────────────────────────────┼─────────────────────┘
            │                                │
            │                                │
┌───────────┼────────────────────────────────┼─────────────────────┐
│           │         Next.js Middleware     │                     │
│           │         (路由保护)             │                     │
│           ▼                                ▼                     │
│  ┌─────────────────┐              ┌──────────────────┐          │
│  │  公开路由       │              │   受保护路由     │          │
│  │  /blogs (GET)   │              │   /admin/*       │          │
│  └────────┬────────┘              └────────┬─────────┘          │
│           │                                │                     │
└───────────┼────────────────────────────────┼─────────────────────┘
            │                                │
            ▼                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API 路由层                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐         ┌────────────────────────┐   │
│  │  认证 API            │         │  博客 API              │   │
│  │  /api/auth/[...all]  │         │  /api/blogs            │   │
│  │                      │         │  /api/blogs/[id]       │   │
│  │  - Google OAuth      │         │                        │   │
│  │  - GitHub OAuth      │         │  - GET (公开)          │   │
│  │  - Session 管理      │         │  - POST (需认证)       │   │
│  └──────────┬───────────┘         │  - PATCH (需认证)      │   │
│             │                     │  - DELETE (需认证)     │   │
│             │                     └──────────┬─────────────┘   │
│             │                                │                  │
└─────────────┼────────────────────────────────┼──────────────────┘
              │                                │
              ▼                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Better Auth                                 │
│                   (认证和会话管理)                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      服务层 (Business Logic)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐         ┌────────────────────────┐   │
│  │  BlogService         │         │  其他 Services...       │   │
│  │                      │         │                        │   │
│  │  - getBlogs()        │         │                        │   │
│  │  - getBlogById()     │         │                        │   │
│  │  - createBlog()      │         │                        │   │
│  │  - updateBlog()      │         │                        │   │
│  │  - deleteBlog()      │         │                        │   │
│  └──────────┬───────────┘         └────────────────────────┘   │
│             │                                                    │
└─────────────┼────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    数据访问层 (Drizzle ORM)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Schema 定义                                              │  │
│  │                                                            │  │
│  │  - users (用户表)                                         │  │
│  │  - sessions (会话表)                                      │  │
│  │  - accounts (OAuth 账户表)                                │  │
│  │  - verifications (验证表)                                 │  │
│  │  - blogs (博客表)                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                PostgreSQL (Neon)                                 │
│                   数据持久化层                                   │
└─────────────────────────────────────────────────────────────────┘
```

## 数据流

### 1. 用户认证流程

```
用户点击登录
    ▼
选择 OAuth 提供商 (Google/GitHub)
    ▼
重定向到 OAuth 提供商
    ▼
用户授权
    ▼
回调到 /api/auth/callback/{provider}
    ▼
Better Auth 处理回调
    ▼
创建/更新用户记录
    ▼
创建会话 (session)
    ▼
设置 cookie
    ▼
重定向到 /admin
```

### 2. 博客创建流程 (需认证)

```
用户提交博客表单
    ▼
客户端发送 POST /api/blogs
    ▼
Middleware 验证会话
    ▼
API Route 调用 requireAuth()
    ▼
Zod 验证输入数据
    ▼
BlogService.createBlog()
    ▼
Drizzle ORM 执行 INSERT
    ▼
PostgreSQL 存储数据
    ▼
返回新博客对象
    ▼
客户端更新 UI
```

### 3. 博客列表获取流程 (公开)

```
用户访问 /blogs
    ▼
服务端组件调用 BlogService.getBlogs()
    ▼
Drizzle ORM 执行 SELECT
    ▼
PostgreSQL 返回数据
    ▼
应用过滤和分页
    ▼
服务端渲染 HTML
    ▼
返回给客户端
```

## 目录结构

```
blog-next/
│
├── app/                           # Next.js App Router
│   │
│   ├── (cms)/                     # CMS 路由组
│   │   ├── admin/                 # 管理页面
│   │   │   ├── blog-management/   # 博客管理
│   │   │   └── preference-management/  # 设置
│   │   ├── auth/                  # 认证页面
│   │   │   └── login/
│   │   └── layout.tsx             # CMS 布局 (含 AuthProvider)
│   │
│   ├── (frontend)/                # 前台路由组
│   │   ├── blogs/                 # 博客列表和详情
│   │   │   ├── [slug]/            # 博客详情页
│   │   │   └── page.tsx           # 博客列表页
│   │   └── layout.tsx             # 前台布局
│   │
│   └── api/                       # API 路由
│       ├── auth/
│       │   └── [...all]/          # Better Auth 处理所有认证请求
│       │       └── route.ts
│       └── blogs/
│           ├── route.ts           # GET /api/blogs, POST /api/blogs
│           └── [id]/
│               └── route.ts       # GET/PATCH/DELETE /api/blogs/[id]
│
├── components/                    # React 组件
│   ├── providers/
│   │   └── auth-provider.tsx      # Better Auth SessionProvider
│   ├── ui/                        # UI 组件库 (shadcn/ui)
│   ├── login-form.tsx             # 登录表单
│   └── user-nav.tsx               # 用户导航菜单
│
├── src/
│   ├── db/
│   │   ├── schema.ts              # Drizzle 表定义
│   │   └── index.ts               # 数据库实例
│   │
│   └── lib/
│       ├── services/
│       │   └── blog.service.ts    # 博客业务逻辑
│       │
│       ├── validations/
│       │   └── blog.ts            # Zod 验证 schemas
│       │
│       ├── auth.ts                # Better Auth 服务端配置
│       ├── auth-client.ts         # Better Auth 客户端配置
│       └── session.ts             # 会话工具函数
│
├── middleware.ts                  # Next.js 中间件 (路由保护)
├── drizzle.config.ts              # Drizzle Kit 配置
└── .env.local                     # 环境变量 (不提交到 Git)
```

## 数据模型

### Users (用户)

```typescript
{
  id: UUID(PK)
  name: string
  email: string(unique)
  emailVerified: boolean
  image: string ? createdAt : timestamp
  updatedAt: timestamp
}
```

### Sessions (会话)

```typescript
{
  id: UUID (PK)
  expiresAt: timestamp
  token: string (unique)
  userId: UUID (FK -> users)
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Accounts (OAuth 账户)

```typescript
{
  id: UUID (PK)
  userId: UUID (FK -> users)
  accountId: string
  providerId: string
  accessToken: string?
  refreshToken: string?
  idToken: string?
  expiresAt: timestamp?
  password: string?
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Blogs (博客)

```typescript
{
  id: UUID (PK)
  title: string
  slug: string (unique)
  content: string
  summary: string?
  coverImage: string?
  published: boolean
  authorId: UUID (FK -> users)
  createdAt: timestamp
  updatedAt: timestamp
}
```

## API 端点总览

### 认证 API

| 端点                      | 方法 | 权限   | 说明         |
| ------------------------- | ---- | ------ | ------------ |
| `/api/auth/signin/google` | GET  | 公开   | Google 登录  |
| `/api/auth/signin/github` | GET  | 公开   | GitHub 登录  |
| `/api/auth/signout`       | POST | 需认证 | 登出         |
| `/api/auth/get-session`   | GET  | 公开   | 获取当前会话 |

### 博客 API

| 端点              | 方法   | 权限         | 说明         |
| ----------------- | ------ | ------------ | ------------ |
| `/api/blogs`      | GET    | 公开         | 获取博客列表 |
| `/api/blogs`      | POST   | 需认证       | 创建博客     |
| `/api/blogs/[id]` | GET    | 公开         | 获取单个博客 |
| `/api/blogs/[id]` | PATCH  | 需认证(作者) | 更新博客     |
| `/api/blogs/[id]` | DELETE | 需认证(作者) | 删除博客     |

## 安全机制

### 1. 路由保护

- 使用 `middleware.ts` 拦截所有 `/admin` 路由
- 验证会话 token
- 未认证用户重定向到登录页

### 2. API 保护

- 使用 `requireAuth()` 验证 API 请求
- 检查用户身份和权限
- 返回 401/403 错误

### 3. 数据验证

- 所有输入通过 Zod schema 验证
- 类型安全 + 运行时验证
- 防止无效数据进入系统

### 4. SQL 注入防护

- 使用 Drizzle ORM 参数化查询
- 自动转义和清理输入

### 5. XSS 防护

- React 自动转义输出
- 使用 `dangerouslySetInnerHTML` 时需要清理 HTML

## 性能优化

### 1. Next.js 特性

- Server Components (默认)
- Streaming SSR
- 自动代码分割
- Image 优化

### 2. 数据库优化

- 使用索引 (unique constraints)
- 分页查询
- 按需加载

### 3. 缓存策略

- Next.js 自动缓存
- 可添加 Redis 缓存层（可选）

## 扩展性

### 水平扩展

- 无状态 API 设计
- 会话存储在数据库
- 可部署多实例

### 功能扩展

- 模块化架构
- 清晰的分层
- 易于添加新功能

## 总结

这个架构提供了：

- ✅ 类型安全 (TypeScript + Zod)
- ✅ 安全认证 (Better Auth + OAuth)
- ✅ 清晰分层 (API → Service → ORM → DB)
- ✅ 易于维护 (模块化设计)
- ✅ 高性能 (Next.js 15 + PostgreSQL)
- ✅ 可扩展 (无状态 API)
