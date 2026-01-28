# 博客编辑器使用指南

## 功能特性

### 1. 富文本编辑器 (TinyMCE)

集成了功能强大的 TinyMCE 编辑器，提供以下功能：

#### 核心编辑功能

- 文本格式化（粗体、斜体、下划线、删除线）
- 标题和段落样式
- 字体系列和字体大小
- 文本对齐和行高
- 有序/无序列表
- 缩进和引用

#### 富媒体支持

- 图片上传和插入
- 媒体嵌入（视频等）
- 表格编辑
- 代码块（支持语法高亮）
- 链接管理
- 特殊字符和表情符号

#### 高级功能

- 全屏编辑模式
- 源代码编辑
- 预览模式
- 搜索和替换
- 撤销/重做
- 格式刷

### 2. 图片上传功能

#### 支持的上传方式

1. **粘贴上传**
   - 直接在编辑器中 Ctrl+V 粘贴图片
   - 自动上传到 AWS S3
   - 返回公开访问的 URL

2. **拖拽上传**
   - 直接拖拽图片文件到编辑器
   - 支持多文件拖拽

3. **文件选择上传**
   - 点击图片按钮
   - 从文件管理器选择图片

#### 图片上传配置

- **支持格式**: JPEG, PNG, GIF, WebP
- **最大大小**: 5MB
- **存储位置**: AWS S3
- **命名规则**: `blog-images/{uuid}.{ext}`
- **访问权限**: 公开读取

### 3. 版本历史系统

#### 自动版本管理

每次保存博客时，系统会自动创建版本快照：

```typescript
{
  version: 1,           // 版本号（自增）
  title: "博客标题",
  content: "博客内容",
  summary: "摘要",
  coverImage: "封面图",
  changedBy: "user_id", // 修改者
  changeNote: "手动保存", // 版本说明
  createdAt: "时间戳"
}
```

#### 版本功能

1. **查看历史版本**
   - 点击"版本历史"按钮
   - 查看所有历史版本列表
   - 显示版本号、时间、修改说明

2. **版本详情**
   - 点击"查看"查看版本内容
   - 显示标题、摘要、内容预览

3. **版本恢复**
   - 点击"恢复"按钮
   - 确认后恢复到该版本
   - 当前内容会先保存为新版本
   - 恢复操作也会创建版本记录

#### 版本管理最佳实践

- 重大修改前手动创建版本
- 添加有意义的版本说明
- 定期清理过旧的版本（可选）

## 使用流程

### 创建新博客

1. 访问 `/admin/blog-management`
2. 点击"创建博客"按钮
3. 填写基本信息：
   - **标题**: 必填，会自动生成 slug
   - **Slug**: 自动生成，可手动修改
   - **摘要**: 可选，用于 SEO 和列表显示
   - **封面图**: 可选，输入图片 URL
   - **发布状态**: 开关控制是否发布
4. 使用编辑器编写内容
5. 点击"保存草稿"或"创建博客"

### 编辑现有博客

1. 访问 `/admin/blog-management`
2. 找到要编辑的博客
3. 点击"编辑"按钮
4. 修改内容
5. 查看版本历史（可选）
6. 点击"保存草稿"或"更新博客"

### 插入图片

#### 方法一：粘贴上传

```
1. 复制图片（截图或从其他地方复制）
2. 在编辑器中按 Ctrl+V (Mac: Cmd+V)
3. 等待上传完成（自动）
4. 图片插入到编辑器
```

#### 方法二：工具栏上传

```
1. 点击工具栏的图片图标
2. 选择"上传"
3. 从文件管理器选择图片
4. 等待上传完成
5. 图片插入到编辑器
```

#### 方法三：拖拽上传

```
1. 从文件管理器拖拽图片
2. 放到编辑器区域
3. 等待上传完成
4. 图片插入到编辑器
```

### 插入代码块

```
1. 点击工具栏的 "Insert/Edit code sample" 按钮
2. 选择编程语言
3. 输入或粘贴代码
4. 点击确定
```

支持的语言：

- HTML/XML
- JavaScript/TypeScript
- CSS
- Python, Java, C/C++, C#
- PHP, Ruby, Go, Rust
- SQL, Bash

### 插入表格

```
1. 点击工具栏的表格图标
2. 选择行数和列数
3. 表格插入到编辑器
4. 可以继续添加/删除行列
5. 可以合并单元格
6. 可以设置表格样式
```

### 版本管理操作

#### 创建版本快照

```
1. 编辑博客后点击"版本历史"
2. 点击"创建版本"
3. 输入版本说明（可选）
4. 确认创建
```

#### 查看版本历史

```
1. 点击"版本历史"按钮
2. 查看所有版本列表
3. 点击"查看"查看版本详情
```

#### 恢复版本

```
1. 在版本历史中找到目标版本
2. 点击"恢复"按钮
3. 确认恢复操作
4. 页面自动刷新显示恢复后的内容
```

## API 使用

### 图片上传 API

```typescript
// POST /api/upload
const formData = new FormData()
formData.append('file', file)

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData
})

const { url } = await response.json()
```

### 版本历史 API

```typescript
// 获取版本列表
GET /api/blogs/{blogId}/versions

// 创建版本
POST /api/blogs/{blogId}/versions
Body: { changeNote?: string }

// 获取特定版本
GET /api/blogs/{blogId}/versions/{versionId}

// 恢复版本
POST /api/blogs/{blogId}/versions/{versionId}/restore
```

## 环境配置

### AWS S3 设置

1. 创建 S3 存储桶
2. 配置 CORS 策略：

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

3. 配置存储桶策略（公开读取）：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/blog-images/*"
    }
  ]
}
```

4. 在 `.env.local` 中配置：

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET_NAME=your_bucket_name
```

### TinyMCE API Key

1. 访问 [TinyMCE](https://www.tiny.cloud/)
2. 注册账号
3. 创建项目获取 API Key
4. 在 `.env.local` 中配置：

```bash
NEXT_PUBLIC_TINYMCE_API_KEY=your_api_key
```

## 数据库迁移

添加了版本历史表，需要运行迁移：

```bash
# 推送 schema
pnpm db:push

# 或生成并运行迁移
pnpm db:generate
pnpm db:migrate
```

## 组件使用

### BlogEditor 组件

```typescript
import { BlogEditor } from "@/components/blog-editor";

<BlogEditor
  value={content}
  onChange={setContent}
  onImageUpload={async (file) => {
    // 自定义图片上传逻辑
    return "https://example.com/image.jpg";
  }}
  disabled={loading}
/>
```

### BlogForm 组件

```typescript
import { BlogForm } from "@/components/blog-form";

// 创建模式
<BlogForm mode="create" />

// 编辑模式
<BlogForm blog={existingBlog} mode="edit" />
```

### BlogVersionHistory 组件

```typescript
import { BlogVersionHistory } from "@/components/blog-version-history";

<BlogVersionHistory blogId={blog.id} />
```

## 故障排查

### 图片上传失败

1. 检查 AWS 凭证是否正确
2. 检查 S3 存储桶 CORS 配置
3. 检查存储桶策略
4. 查看浏览器控制台错误
5. 检查文件大小是否超过 5MB

### TinyMCE 无法加载

1. 检查 API Key 是否正确
2. 检查网络连接
3. 查看浏览器控制台错误
4. 确认 `NEXT_PUBLIC_TINYMCE_API_KEY` 环境变量

### 版本恢复失败

1. 检查用户是否有权限
2. 检查版本 ID 是否正确
3. 查看服务器日志
4. 确认数据库连接正常

## 性能优化

### 图片优化建议

1. 上传前压缩图片
2. 使用 WebP 格式
3. 设置合适的图片尺寸
4. 考虑使用 CDN

### 编辑器性能

1. 大文档考虑分段保存
2. 定期清理旧版本
3. 使用草稿功能避免丢失内容

## 安全注意事项

1. 图片上传需要认证
2. 版本操作需要认证
3. 只能操作自己的博客
4. 文件类型验证
5. 文件大小限制
6. S3 访问控制

## 最佳实践

1. 定期保存避免丢失内容
2. 重大修改前创建版本
3. 使用有意义的版本说明
4. 优化图片后再上传
5. 使用语义化的 HTML 结构
6. 测试后再发布
7. 定期备份数据库
