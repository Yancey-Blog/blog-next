# 博客后端设置指南

## 技术栈

- **数据库**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **认证**: Better Auth (Google & GitHub OAuth)
- **验证**: Zod
- **框架**: Next.js 15 (App Router)

## 初始设置

### 1. 环境变量配置

复制 `.env.example` 创建 `.env.local`:

```bash
cp .env.example .env.local
```

配置以下环境变量：

#### 数据库

- `DATABASE_URL`: Neon PostgreSQL 连接字符串

#### 应用

- `NEXT_PUBLIC_APP_URL`: 应用 URL（开发环境: http://localhost:3000）

#### Google OAuth

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 Google+ API
4. 创建 OAuth 2.0 客户端 ID
5. 添加授权重定向 URI: `{NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
6. 复制 Client ID 和 Client Secret

#### GitHub OAuth

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 创建新的 OAuth App
3. 设置回调 URL: `{NEXT_PUBLIC_APP_URL}/api/auth/callback/github`
4. 复制 Client ID 和 Client Secret

#### Better Auth Secret

生成随机密钥:

```bash
openssl rand -base64 32
```

### 2. 数据库迁移

生成迁移文件:

```bash
pnpm db:generate
```

推送 schema 到数据库:

```bash
pnpm db:push
```

或者运行迁移:

```bash
pnpm db:migrate
```

### 3. 启动开发服务器

```bash
pnpm dev
```

## API 文档

### 认证 API

#### 登录

- **Google**: 重定向到 `/api/auth/signin/google`
- **GitHub**: 重定向到 `/api/auth/signin/github`

#### 登出

- **端点**: `/api/auth/signout`
- **方法**: POST

#### 获取会话

- **端点**: `/api/auth/get-session`
- **方法**: GET

### 博客 API

#### 获取博客列表

- **端点**: `GET /api/blogs`
- **权限**: 公开
- **查询参数**:
  - `page` (number, default: 1): 页码
  - `pageSize` (number, default: 10, max: 100): 每页数量
  - `published` (boolean, optional): 过滤已发布/未发布
  - `search` (string, optional): 搜索标题和内容

**示例**:

```typescript
const response = await fetch('/api/blogs?page=1&pageSize=10&published=true')
const data = await response.json()
```

#### 获取单个博客

- **端点**: `GET /api/blogs/[id]`
- **权限**: 公开

**示例**:

```typescript
const response = await fetch('/api/blogs/123e4567-e89b-12d3-a456-426614174000')
const blog = await response.json()
```

#### 创建博客

- **端点**: `POST /api/blogs`
- **权限**: 需要认证
- **请求体**:

```typescript
{
  title: string;           // 必填，1-200 字符
  slug: string;            // 必填，1-200 字符，只能包含小写字母、数字和连字符
  content: string;         // 必填
  summary?: string;        // 可选，最多 500 字符
  coverImage?: string;     // 可选，必须是有效 URL
  published?: boolean;     // 可选，默认 false
}
```

**示例**:

```typescript
const response = await fetch('/api/blogs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: '我的第一篇博客',
    slug: 'my-first-blog',
    content: '这是博客内容...',
    summary: '博客摘要',
    published: false
  })
})
```

#### 更新博客

- **端点**: `PATCH /api/blogs/[id]`
- **权限**: 需要认证（仅作者）
- **请求体**: 与创建相同，但所有字段都是可选的

**示例**:

```typescript
const response = await fetch(
  '/api/blogs/123e4567-e89b-12d3-a456-426614174000',
  {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: '更新后的标题',
      published: true
    })
  }
)
```

#### 删除博客

- **端点**: `DELETE /api/blogs/[id]`
- **权限**: 需要认证（仅作者）

**示例**:

```typescript
const response = await fetch(
  '/api/blogs/123e4567-e89b-12d3-a456-426614174000',
  {
    method: 'DELETE'
  }
)
```

## 权限说明

### 公开访问

- 查看博客列表（可选择仅查看已发布）
- 查看单个博客详情

### 需要认证

- 创建博客
- 更新博客（仅限作者）
- 删除博客（仅限作者）

### 路由保护

- `/admin/*` 路由需要认证
- 未认证用户会被重定向到 `/auth/login`

## 使用示例

### 在客户端组件中使用认证

```typescript
'use client';

import { useSession, signIn, signOut } from '@/lib/auth-client';

export function AuthButton() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return (
      <div>
        <button onClick={() => signIn.social({ provider: 'google' })}>
          Google 登录
        </button>
        <button onClick={() => signIn.social({ provider: 'github' })}>
          GitHub 登录
        </button>
      </div>
    );
  }

  return (
    <div>
      <p>欢迎, {session.user.name}</p>
      <button onClick={() => signOut()}>登出</button>
    </div>
  );
}
```

### 在服务端组件中获取会话

```typescript
import { getSession } from '@/lib/session';

export default async function AdminPage() {
  const session = await getSession();

  if (!session) {
    redirect('/auth/login');
  }

  return <div>欢迎, {session.user.name}</div>;
}
```

### 创建博客表单

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CreateBlogForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title'),
      slug: formData.get('slug'),
      content: formData.get('content'),
      summary: formData.get('summary'),
      published: formData.get('published') === 'on',
    };

    try {
      const response = await fetch('/api/blogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      router.push('/admin/blog-management');
      router.refresh();
    } catch (error) {
      console.error('创建失败:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" placeholder="标题" required />
      <input name="slug" placeholder="slug" required />
      <textarea name="content" placeholder="内容" required />
      <textarea name="summary" placeholder="摘要" />
      <label>
        <input type="checkbox" name="published" />
        发布
      </label>
      <button type="submit" disabled={loading}>
        {loading ? '创建中...' : '创建博客'}
      </button>
    </form>
  );
}
```

## 数据库管理

### Drizzle Studio

启动 Drizzle Studio 可视化管理数据库:

```bash
pnpm db:studio
```

访问 `https://local.drizzle.studio` 查看和管理数据。

## 错误处理

API 返回标准的 HTTP 状态码：

- `200`: 成功
- `201`: 创建成功
- `400`: 请求错误（验证失败）
- `401`: 未认证
- `403`: 无权限
- `404`: 资源不存在
- `409`: 冲突（如 slug 重复）
- `500`: 服务器错误

错误响应格式：

```typescript
{
  error: string // 错误信息
}
```

## 安全注意事项

1. **环境变量**: 永远不要提交 `.env.local` 到版本控制
2. **CORS**: 在生产环境中配置正确的 `trustedOrigins`
3. **速率限制**: 考虑添加 API 速率限制
4. **输入验证**: 所有输入都通过 Zod 验证
5. **SQL 注入**: Drizzle ORM 自动防护 SQL 注入
6. **XSS**: 在前端渲染用户内容时使用适当的转义
