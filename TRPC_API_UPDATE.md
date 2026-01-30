# tRPC API 更新指南

## 概述

已将项目迁移到 tRPC 官方推荐的 React Server Components API 模式，使用 `@trpc/tanstack-react-query` 包。

## 主要变化

### 1. 客户端 Hook 模式变更

**旧写法：**
```typescript
import { trpc } from '@/lib/trpc/client'

export function MyComponent() {
  const { data } = trpc.blog.list.useQuery({ page: 1 })
  const mutation = trpc.blog.create.useMutation()
  const utils = trpc.useUtils()
}
```

**新写法：**
```typescript
import { useTRPC } from '@/lib/trpc/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function MyComponent() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const { data } = useQuery(trpc.blog.list.queryOptions({ page: 1 }))
  const mutation = useMutation(trpc.blog.create.mutationOptions())

  // Invalidate queries
  queryClient.invalidateQueries({
    queryKey: trpc.blog.list.queryOptions({ page: 1 }).queryKey
  })
}
```

### 2. 服务端架构重构

**文件结构变化：**
```
之前：
server/
├── context.ts
├── trpc.ts
└── routers/
    ├── index.ts
    ├── blog.ts
    └── ...

现在：
lib/trpc/
├── init.ts           # tRPC 初始化和 context
├── client.tsx        # 客户端 Provider 和 Hook
├── server.tsx        # 服务端 helpers
├── query-client.ts   # QueryClient 配置
└── routers/          # API 路由
    ├── _app.ts
    ├── blog.ts
    └── ...
```

**init.ts 新文件：**
- 统一的 tRPC 初始化配置
- `createTRPCContext` - 创建请求上下文（session, user）
- 三种 procedure 类型：
  - `publicProcedure` - 公开访问
  - `protectedProcedure` - 需要登录
  - `adminProcedure` - 需要管理员权限

### 3. Context 类型改进

```typescript
// init.ts
export const createTRPCContext = cache(async () => {
  const session = await getSession()
  const user = getSessionUser(session)

  return {
    session,  // 完整的 session 对象
    user,     // 带有 role 字段的 User 对象
  }
})

type Context = Awaited<ReturnType<typeof createTRPCContext>>

const t = initTRPC.context<Context>().create({
  transformer: superjson,  // 支持 Date, Map, Set 等复杂类型
})
```

### 4. Procedure 中间件

```typescript
// 自动进行身份验证检查
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new Error('UNAUTHORIZED')
  }
  return next({ ctx: { ...ctx, user: ctx.user } })
})

// 自动进行管理员权限检查
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new Error('FORBIDDEN')
  }
  return next({ ctx })
})
```

### 5. Router 定义示例

```typescript
// lib/trpc/routers/blog.ts
import { publicProcedure, protectedProcedure } from '../init'

export const blogRouter = {
  list: publicProcedure
    .input(z.object({ page: z.number() }))
    .query(async ({ input }) => {
      return await BlogService.getBlogs(input)
    }),

  create: protectedProcedure  // 自动验证登录状态
    .input(createBlogSchema)
    .mutation(async ({ input, ctx }) => {
      // ctx.user 保证存在且类型正确
      return await BlogService.createBlog({
        ...input,
        authorId: ctx.user.id
      })
    })
}
```

## 迁移步骤

如果需要添加新的 API 端点：

1. **在 router 中定义 procedure：**
```typescript
// lib/trpc/routers/your-router.ts
import { publicProcedure, protectedProcedure, adminProcedure } from '../init'

export const yourRouter = {
  yourEndpoint: publicProcedure  // 或 protectedProcedure 或 adminProcedure
    .input(z.object({ ... }))
    .query(async ({ input, ctx }) => {
      // 实现逻辑
    })
}
```

2. **在客户端组件中使用：**
```typescript
'use client'

import { useTRPC } from '@/lib/trpc/client'
import { useQuery } from '@tanstack/react-query'

export function YourComponent() {
  const trpc = useTRPC()

  const { data, isLoading } = useQuery(
    trpc.yourRouter.yourEndpoint.queryOptions({ ... })
  )

  return <div>{/* 使用 data */}</div>
}
```

3. **Query invalidation：**
```typescript
import { useQueryClient } from '@tanstack/react-query'

const queryClient = useQueryClient()

// 在 mutation 成功后 invalidate
queryClient.invalidateQueries({
  queryKey: trpc.yourRouter.yourEndpoint.queryOptions({ ... }).queryKey
})
```

## 技术优势

1. **更好的类型安全**：Context 类型正确传递到所有 procedures
2. **统一的认证检查**：通过 middleware 自动处理，无需在每个 endpoint 重复代码
3. **官方推荐模式**：遵循 tRPC 官方 RSC 文档
4. **SuperJSON 支持**：自动序列化/反序列化复杂类型（Date, Map, Set）
5. **更清晰的文件组织**：所有 tRPC 相关代码集中在 lib/trpc/

## 注意事项

1. 所有客户端组件都必须使用 `useTRPC()` hook 获取 trpc 实例
2. Query/Mutation 使用 TanStack Query 的原生 hook + tRPC 的 `Options` 方法
3. Invalidation 需要通过 `useQueryClient()` 和 `queryOptions().queryKey`
4. 新的 procedure 定义在 `lib/trpc/init.ts` 中，导入时使用它们代替旧的 `t.procedure`

## 相关文档

- [tRPC Server Components](https://trpc.io/docs/client/tanstack-react-query/server-components)
- [TanStack Query](https://tanstack.com/query/latest)
- [SuperJSON](https://github.com/blitz-js/superjson)
