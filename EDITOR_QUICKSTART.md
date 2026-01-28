# 博客编辑器快速开始

## 前置要求

- ✅ 已完成后端基础设置（参考 `QUICKSTART.md`）
- ✅ 数据库已初始化
- ✅ 认证系统已配置

## 快速配置

### 1. 配置 AWS S3（5分钟）

#### 方法 A: AWS 控制台

1. 登录 [AWS 控制台](https://console.aws.amazon.com/)
2. 进入 S3 服务
3. 创建新存储桶（如：`my-blog-images`）
4. 配置权限：
   - 取消勾选"阻止所有公开访问"
   - 仅允许 `blog-images/*` 路径公开读取

5. 配置 CORS：

   ```
   S3 -> 存储桶 -> 权限 -> CORS
   ```

   粘贴以下配置：

   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST"],
       "AllowedOrigins": ["http://localhost:3000"],
       "ExposeHeaders": ["ETag"]
     }
   ]
   ```

6. 创建 IAM 用户：
   ```
   IAM -> 用户 -> 添加用户
   ```

   - 权限：`AmazonS3FullAccess`（或自定义策略）
   - 获取 Access Key ID 和 Secret Access Key

#### 方法 B: AWS CLI

```bash
# 创建存储桶
aws s3 mb s3://my-blog-images

# 配置 CORS
cat > cors.json << EOF
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST"],
      "AllowedOrigins": ["http://localhost:3000"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}
EOF
aws s3api put-bucket-cors --bucket my-blog-images --cors-configuration file://cors.json

# 配置公开读取策略
cat > policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-blog-images/blog-images/*"
    }
  ]
}
EOF
aws s3api put-bucket-policy --bucket my-blog-images --policy file://policy.json
```

### 2. 获取 TinyMCE API Key（2分钟）

1. 访问 https://www.tiny.cloud/
2. 点击"Get Started for Free"
3. 创建账号（支持 Google/GitHub 登录）
4. 创建项目
5. 复制 API Key

### 3. 更新环境变量

编辑 `.env.local`，添加：

```bash
# AWS S3
AWS_REGION=us-east-1                           # 你的 S3 区域
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXX           # IAM 用户 Access Key
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxx           # IAM 用户 Secret Key
AWS_S3_BUCKET_NAME=my-blog-images             # 存储桶名称

# TinyMCE
NEXT_PUBLIC_TINYMCE_API_KEY=your_api_key_here # TinyMCE API Key
```

### 4. 运行数据库迁移

```bash
# 推送新的 schema（包含 blog_versions 表）
pnpm db:push
```

### 5. 启动开发服务器

```bash
pnpm dev
```

## 验证配置

### 测试图片上传

1. 访问 http://localhost:3000/admin/blog-management/create
2. 在编辑器中按 `Ctrl+V` 粘贴一张图片
3. 应该看到上传进度
4. 图片应该成功插入到编辑器

### 测试版本历史

1. 创建一篇博客并保存
2. 编辑博客并再次保存
3. 点击"版本历史"按钮
4. 应该看到至少 2 个版本
5. 尝试恢复到旧版本

## 故障排查

### 图片上传失败

**错误**: `Network error` 或 `403 Forbidden`

**解决方案**:

```bash
# 检查 AWS 凭证
echo $AWS_ACCESS_KEY_ID
echo $AWS_REGION

# 测试 AWS 连接
aws s3 ls s3://my-blog-images

# 检查 CORS 配置
aws s3api get-bucket-cors --bucket my-blog-images
```

### TinyMCE 加载失败

**错误**: `Failed to load TinyMCE`

**解决方案**:

```bash
# 检查环境变量
echo $NEXT_PUBLIC_TINYMCE_API_KEY

# 重启开发服务器
pnpm dev
```

### 版本表不存在

**错误**: `relation "blog_versions" does not exist`

**解决方案**:

```bash
# 重新推送 schema
pnpm db:push

# 或生成并运行迁移
pnpm db:generate
pnpm db:migrate
```

## 使用示例

### 创建第一篇博客

```
1. 访问 /admin/blog-management
2. 点击"创建博客"
3. 输入标题: "我的第一篇博客"
4. Slug 自动生成: "my-first-blog"
5. 在编辑器中写入内容
6. 粘贴图片测试上传
7. 点击"保存草稿"
8. 查看版本历史
9. 切换"发布"开关
10. 点击"创建博客"
```

### 编辑和版本管理

```
1. 从列表页点击"编辑"
2. 修改内容
3. 点击"更新博客"（自动创建版本）
4. 点击"版本历史"
5. 查看所有版本
6. 点击某个版本的"恢复"
7. 确认恢复
```

## 功能清单

- [x] 富文本编辑器
- [x] 图片粘贴上传
- [x] 图片拖拽上传
- [x] 图片选择上传
- [x] 代码高亮
- [x] 表格编辑
- [x] 版本历史
- [x] 版本恢复
- [x] 草稿保存
- [x] 自动生成 slug
- [x] 发布状态切换
- [x] 预览功能

## 下一步

1. 阅读 [BLOG_EDITOR_GUIDE.md](./BLOG_EDITOR_GUIDE.md) 了解详细功能
2. 阅读 [EDITOR_IMPLEMENTATION_SUMMARY.md](./EDITOR_IMPLEMENTATION_SUMMARY.md) 了解技术实现
3. 开始创建内容！

## 生产环境配置

### S3 配置调整

1. 更新 CORS 配置，添加生产域名：

   ```json
   {
     "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"]
   }
   ```

2. 配置 CDN（可选但推荐）：
   - CloudFront 分发
   - 自定义域名
   - SSL 证书

### TinyMCE 配置

1. 升级到付费计划（可选）：
   - 更多高级功能
   - 更高并发限制
   - 技术支持

2. 添加生产域名到 TinyMCE 项目设置

### 环境变量

在生产环境（Vercel/Railway 等）设置所有环境变量：

```
DATABASE_URL
NEXT_PUBLIC_APP_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
BETTER_AUTH_SECRET
BETTER_AUTH_URL
AWS_REGION
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_S3_BUCKET_NAME
NEXT_PUBLIC_TINYMCE_API_KEY
```

## 性能优化建议

1. **图片优化**:
   - 上传前压缩
   - 使用 WebP 格式
   - 合理的图片尺寸

2. **编辑器性能**:
   - 大文档分段保存
   - 定期清理旧版本
   - 使用草稿功能

3. **CDN 加速**:
   - CloudFront 分发 S3 内容
   - 配置缓存策略
   - 启用 Gzip/Brotli 压缩

## 成本估算

### AWS S3（月费用）

- 存储: $0.023/GB
- 请求: $0.005/1000 请求
- 数据传输: 前 1GB 免费，之后 $0.09/GB

**示例**:

- 1000 张图片（平均 200KB）= 200MB = ~$0.005/月
- 10000 次请求 = ~$0.05/月
- 总计: < $1/月（小型博客）

### TinyMCE

- 免费计划: 1000 加载/月
- Core 计划: $49/月，无限加载
- Essential 计划: $299/月，高级功能

**建议**: 个人博客使用免费计划足够

## 安全检查清单

- [ ] AWS IAM 用户权限最小化
- [ ] S3 存储桶策略正确配置
- [ ] 仅 `blog-images/*` 路径公开
- [ ] CORS 配置仅允许你的域名
- [ ] 环境变量不提交到 Git
- [ ] 图片上传需要认证
- [ ] 文件类型和大小验证
- [ ] 定期备份数据库

## 支持和帮助

- 查看文档: `BLOG_EDITOR_GUIDE.md`
- 查看实现: `EDITOR_IMPLEMENTATION_SUMMARY.md`
- TinyMCE 文档: https://www.tiny.cloud/docs/
- AWS S3 文档: https://docs.aws.amazon.com/s3/

开始享受博客编辑吧！ 🎉
