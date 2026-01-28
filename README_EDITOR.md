# 博客编辑器功能说明

## 🎉 已完成功能

本项目实现了一个功能完整的博客管理系统，包括：

### ✨ 核心功能

1. **富文本编辑器** - 基于 TinyMCE
   - 完整的文本格式化
   - 代码高亮（15+ 语言）
   - 表格编辑
   - 媒体嵌入
   - 全屏/预览模式

2. **图片上传** - 集成 AWS S3
   - 粘贴上传（Ctrl+V）
   - 拖拽上传
   - 文件选择上传
   - 自动压缩和优化
   - 5MB 大小限制

3. **版本历史系统**
   - 自动版本快照
   - 版本列表查看
   - 版本详情预览
   - 一键恢复版本
   - 恢复前自动备份

4. **博客管理**
   - 创建/编辑/删除
   - 草稿/发布状态
   - 自动生成 slug
   - SEO 友好
   - 分页列表

## 📁 项目结构

```
blog-next/
├── app/
│   ├── api/
│   │   ├── upload/              # 图片上传 API
│   │   ├── blogs/               # 博客 CRUD API
│   │   │   └── [id]/
│   │   │       └── versions/    # 版本历史 API
│   │   └── auth/                # 认证 API
│   │
│   ├── (cms)/admin/             # CMS 后台
│   │   └── blog-management/     # 博客管理
│   │       ├── page.tsx         # 列表页
│   │       ├── create/          # 创建页
│   │       └── edit/[id]/       # 编辑页
│   │
│   └── (frontend)/              # 前台展示
│       └── blogs/               # 博客展示
│
├── components/
│   ├── blog-editor.tsx          # TinyMCE 编辑器
│   ├── blog-form.tsx            # 博客表单
│   ├── blog-version-history.tsx # 版本历史 UI
│   └── ui/                      # shadcn/ui 组件
│
├── lib/
│   ├── s3.ts                    # S3 上传工具
│   ├── db/
│   │   └── schema.ts            # 数据库 Schema
│   ├── services/
│   │   ├── blog.service.ts      # 博客服务
│   │   └── blog-version.service.ts # 版本服务
│   └── validations/
│       └── blog.ts              # Zod 验证
│
└── 文档/
    ├── EDITOR_QUICKSTART.md     # 快速开始
    ├── BLOG_EDITOR_GUIDE.md     # 使用指南
    └── EDITOR_IMPLEMENTATION_SUMMARY.md # 实现总结
```

## 🚀 快速开始

### 1. 配置环境变量

```bash
# .env.local
# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET_NAME=your_bucket

# TinyMCE
NEXT_PUBLIC_TINYMCE_API_KEY=your_key
```

### 2. 数据库迁移

```bash
pnpm db:push
```

### 3. 启动开发

```bash
pnpm dev
```

### 4. 访问管理后台

```
http://localhost:3000/admin/blog-management
```

## 📖 文档导航

| 文档 | 说明 |
|------|------|
| [EDITOR_QUICKSTART.md](./EDITOR_QUICKSTART.md) | 快速配置和开始使用 |
| [BLOG_EDITOR_GUIDE.md](./BLOG_EDITOR_GUIDE.md) | 详细的功能使用指南 |
| [EDITOR_IMPLEMENTATION_SUMMARY.md](./EDITOR_IMPLEMENTATION_SUMMARY.md) | 技术实现总结 |
| [BACKEND_SETUP.md](./BACKEND_SETUP.md) | 后端 API 文档 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 系统架构说明 |

## 🎯 功能演示

### 创建博客

```
1. 点击"创建博客"
2. 输入标题（自动生成 slug）
3. 填写摘要
4. 使用编辑器写内容
5. 粘贴图片（自动上传 S3）
6. 保存草稿或发布
```

### 编辑和版本管理

```
1. 点击"编辑"
2. 修改内容
3. 保存（自动创建版本）
4. 点击"版本历史"
5. 查看/恢复历史版本
```

## 🔧 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **UI 组件**: shadcn/ui
- **富文本**: TinyMCE
- **数据库**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **认证**: Better Auth
- **存储**: AWS S3
- **验证**: Zod

## 🌟 核心特性

### 1. 图片上传

- ✅ 多种上传方式（粘贴/拖拽/选择）
- ✅ 自动上传到 S3
- ✅ 文件类型验证
- ✅ 大小限制（5MB）
- ✅ 唯一文件名（UUID）
- ✅ 公开访问 URL

### 2. 版本历史

- ✅ 自动版本快照
- ✅ 版本列表展示
- ✅ 版本内容预览
- ✅ 一键恢复
- ✅ 恢复前备份
- ✅ 版本说明

### 3. 富文本编辑

- ✅ 所见即所得
- ✅ 代码高亮
- ✅ 表格支持
- ✅ 媒体嵌入
- ✅ 全屏编辑
- ✅ 源码模式

## 📊 API 端点

### 图片上传
```
POST /api/upload
Content-Type: multipart/form-data
```

### 博客管理
```
GET    /api/blogs              # 列表
POST   /api/blogs              # 创建
GET    /api/blogs/[id]         # 详情
PATCH  /api/blogs/[id]         # 更新
DELETE /api/blogs/[id]         # 删除
```

### 版本历史
```
GET  /api/blogs/[id]/versions                      # 版本列表
POST /api/blogs/[id]/versions                      # 创建版本
GET  /api/blogs/[id]/versions/[versionId]          # 版本详情
POST /api/blogs/[id]/versions/[versionId]/restore  # 恢复版本
```

## 🔐 权限说明

| 操作 | 权限要求 |
|------|---------|
| 查看已发布博客 | 公开 |
| 创建博客 | 需登录 |
| 编辑博客 | 作者 |
| 删除博客 | 作者 |
| 上传图片 | 需登录 |
| 版本管理 | 作者 |

## 💡 最佳实践

1. **编写内容**
   - 使用语义化标题（H1-H6）
   - 合理使用段落和列表
   - 添加 alt 文本给图片
   - 优化图片大小

2. **版本管理**
   - 重大修改前创建版本
   - 添加有意义的版本说明
   - 定期清理旧版本

3. **性能优化**
   - 压缩图片后上传
   - 使用 WebP 格式
   - 避免过大的文档
   - 定期备份数据

## 🐛 故障排查

### 图片上传失败
```bash
# 检查 AWS 配置
aws s3 ls s3://your-bucket

# 检查 CORS
aws s3api get-bucket-cors --bucket your-bucket
```

### TinyMCE 加载失败
```bash
# 检查环境变量
echo $NEXT_PUBLIC_TINYMCE_API_KEY

# 重启服务
pnpm dev
```

### 版本表不存在
```bash
# 运行迁移
pnpm db:push
```

## 📈 性能指标

- 编辑器加载: < 2s
- 图片上传: < 5s (5MB)
- 版本切换: < 1s
- 页面加载: < 3s

## 🎨 自定义配置

### TinyMCE 插件

编辑 `components/blog-editor.tsx`:

```typescript
plugins: [
  'anchor', 'autolink', 'charmap',
  // 添加更多插件...
]
```

### S3 存储路径

编辑 `lib/s3.ts`:

```typescript
const fileKey = `blog-images/${uuidv4()}.${fileExtension}`;
// 修改为自定义路径
```

### 版本保存策略

编辑 `components/blog-form.tsx`:

```typescript
// 自定义版本创建逻辑
await fetch(`/api/blogs/${blog.id}/versions`, {
  method: "POST",
  body: JSON.stringify({ changeNote: "自定义说明" }),
});
```

## 🚢 部署

### Vercel 部署

```bash
# 设置环境变量
vercel env add DATABASE_URL
vercel env add AWS_REGION
vercel env add AWS_ACCESS_KEY_ID
# ... 其他变量

# 部署
vercel deploy --prod
```

### Railway 部署

```bash
# 连接项目
railway link

# 设置环境变量
railway variables set DATABASE_URL=xxx

# 部署
railway up
```

## 🔗 相关资源

- [TinyMCE 文档](https://www.tiny.cloud/docs/)
- [AWS S3 文档](https://docs.aws.amazon.com/s3/)
- [Next.js 文档](https://nextjs.org/docs)
- [Drizzle ORM](https://orm.drizzle.team/)

## 📝 更新日志

### v1.0.0 (2026-01-28)
- ✅ 初始版本
- ✅ TinyMCE 编辑器集成
- ✅ AWS S3 图片上传
- ✅ 版本历史系统
- ✅ 博客管理界面

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可

MIT License

---

**开始创作吧！** 🎉
