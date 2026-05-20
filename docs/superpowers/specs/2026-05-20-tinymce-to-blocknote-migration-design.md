# TinyMCE → BlockNote 迁移设计

- 日期：2026-05-20
- 状态：已批准，待实现计划
- 动机：TinyMCE 授权费用高，而本项目仅用到其极少功能；迁移到开源的 BlockNote.js，统一为单一编辑体系。

## 背景与现状

当前富文本编辑链路完全由 **HTML 字符串** 驱动：

- **编辑器** `components/blog-editor.tsx`：TinyMCE，产出 HTML。
- **存储** `blogs` 表：
  - `content`（HTML 原文）
  - `highlightedContent`（保存时用 Shiki 预渲染好代码块的 HTML，前台渲染用）
- **保存管线** `lib/shiki.ts` `highlightHtml()`：cheerio 解析 HTML → 给 h2/h3 注入 `id`（TOC 用）→ 高亮 `<pre><code>` 代码块。
- **渲染** `app/(frontend)/post/[id]/page.tsx`：用 React 内联 HTML 注入方式渲染，取 `highlightedContent || content`。
- **下游全部基于 HTML**：`components/blog-toc.tsx` 解析 `h2[id]/h3[id]`；`lib/algolia.ts` 索引 `content`；`lib/services/diff.service.ts` 按行 diff `content`。
- **图片上传**：TinyMCE handler → tRPC `upload.getPresignedUrl` → 直传 S3。

### 存量实测数据（来自 72 篇备份分析）

实际使用的元素（决定功能裁剪）：

| 类别                                                                   | 用量                 | 结论                    |
| ---------------------------------------------------------------------- | -------------------- | ----------------------- |
| 段落 / h2 / h3                                                         | 全量、高频           | 必须                    |
| 代码块 `pre`+`code`（59 篇）                                           | 852 块，约 18 种语言 | 核心，必须 + Shiki 高亮 |
| 图片（53 篇）                                                          | 606 张               | 核心，必须              |
| 列表 ul/ol（52 篇）、链接（51 篇）、bold/italic/strike/`code`/mark/sup | 高频                 | 必须                    |
| 表格（9 篇）、blockquote（14 篇）                                      | 中等                 | 保留                    |
| h4（15 篇）、video（1 篇）、hr（1 篇）                                 | 长尾                 | 保真保留                |
| iframe / 媒体嵌入 / 脚注 / emoji 组件                                  | 0 篇                 | 砍掉                    |
| 内联 `style`                                                           | 仅 2 处              | 忽略                    |

代码语言（`language-*`）：ts、js、shell、bash、html、css、javascript、c、graphql、yaml、json、rust、python、tsx、cpp、yml、scss、jsx。

## 决策摘要

1. **存储格式**：blocks JSON 作为编辑真源 + 派生 HTML 供渲染（不保留旧 HTML 双体系）。
2. **存量**：全部 72 篇一次性迁移到 BlockNote blocks。
3. **功能范围**：最大保真，扩展 BlockNote（h4 用原生 `levels`，保留 sup/mark，video/hr 用块）。
4. **UI 库**：`@blocknote/mantine`（默认、最成熟），仅 admin 后台使用；前台渲染不受影响。
5. **`content` 列被 BlockNote 生成的 HTML 覆盖**（旧 TinyMCE HTML 仅保留在备份中）。
6. **保留** `superscript` / `divider` 两个小自定义 spec。

## 数据模型

`blogs` 表新增一列，语义重新划分：

| 列                   | 类型                       | 角色                                                                                  |
| -------------------- | -------------------------- | ------------------------------------------------------------------------------------- |
| `contentBlocks` 🆕   | text（blocks JSON 字符串） | **编辑真源**，BlockNote 直接加载/保存，无损                                           |
| `content`            | text（HTML）               | **派生**：由 blocks 生成的干净语义 HTML。供 Algolia / 版本 diff / 全文搜索 / 渲染兜底 |
| `highlightedContent` | text（HTML）               | **派生**：对 `content` 跑 Shiki 后的成品，前台渲染用                                  |

`blog_versions` 表同样新增 `contentBlocks`（该表当前 0 行，零迁移成本），使版本恢复也无损。

**前台渲染路径 `highlightedContent || content` 完全不变。**

## 共享 Schema

新建 `lib/blocknote/schema.ts`，定义供两端复用的 `BlockNoteSchema`：

- 标题块 `levels: [1, 2, 3, 4, 5, 6]`（h4 原生支持）。
- 代码块：语言集对齐现有 18 种；编辑器内高亮可用 BlockNote 内置（懒加载），不强求与渲染端一致。
- 自定义 `superscript` 内联 spec：定义 `<sup>` 的 parse/render（2 篇用到）。
- 自定义 `divider` 块 spec：定义 `<hr>` 的 parse/render（1 篇用到）。
- `mark` 高亮 → 映射 BlockNote 原生 background-color 文本样式。
- `video` → BlockNote 原生块。

客户端编辑器（`useCreateBlockNote`）与服务端 `ServerBlockNoteEditor` **共用同一 schema**，保证 HTML↔blocks 转换一致。

## 保存管线（服务端）

客户端只回传 `contentBlocks`（JSON 字符串）。`BlogService.createBlog/updateBlog` 内：

```
blocks = JSON.parse(input.contentBlocks)
content = await ServerBlockNoteEditor(schema).blocksToHTMLLossy(blocks)   // 干净语义 HTML
highlightedContent = await highlightHtml(content)                          // 复用现有 Shiki 管线
→ contentBlocks / content / highlightedContent 三列一起写入
```

`@blocknote/server-util` 的 `ServerBlockNoteEditor` 在 Node 运行时执行（tRPC 路由是 Node），无需浏览器。
（实现时确认导出 HTML 的精确方法名：`blocksToHTMLLossy` vs `blocksToFullHTML`——选「干净语义 HTML」一档，以适配现有 `.blog-content` 样式与 Shiki 正则。）

## 存量迁移脚本

新建 `scripts/migrate-to-blocknote.ts`，幂等、事务化、支持 `--dry` 预演：

```
对每篇 blog（仅处理 content_blocks IS NULL 的行）:
  blocks = serverEditor.tryParseHTMLToBlocks(blog.content)   // 旧 TinyMCE HTML
  content_blocks       = JSON.stringify(blocks)
  content              = serverEditor.blocksToHTMLLossy(blocks)  // 覆盖旧 HTML，统一体系
  highlighted_content  = highlightHtml(content)
```

- 失败计数 + 逐篇日志。
- 运行前可重跑 `scripts/backup-blogs.ts` 再生成时间戳备份。
- 已有备份：`backups/blogs-backup-2026-05-19T23-30-24-771Z.json`（72 篇）。

## 渲染保真修正（实测发现）

`lib/shiki.ts` 当前高亮器缺少存量用到的语言/别名，迁移时一并补齐：

- 新增语言：`graphql`、`tsx`、`jsx`、`scss`。
- 新增别名：`shell → bash`、`yml → yaml`。

否则这些代码块迁移后不会被高亮。

## 客户端与表单改造

- **`components/blog-editor.tsx`** 重写：`useCreateBlockNote({ schema, uploadFile, initialContent })` + `<BlockNoteView theme={resolvedTheme} editable={!disabled} />`。
  - `uploadFile`：复用现有 presigned-URL → S3 直传，返回 publicUrl。
  - `initialContent`：从 `contentBlocks` JSON 解析；create 模式为空文档。
  - `onChange` → `onChange(JSON.stringify(editor.document))`。
- **`components/blog-form.tsx`**、**`lib/validations/blog.ts`**、**tRPC `blog.create|update`** 输入字段：`content`(HTML) → `contentBlocks`(JSON 字符串)；自动保存逻辑同步更新。
- 前台 `post/[id]/page.tsx`、`blog-toc.tsx`、`algolia.ts`、`diff.service.ts` **不变**（继续消费派生 HTML）。

## 清理

- 移除依赖 `@tinymce/tinymce-react`、`tinymce`。
- 移除 `NEXT_PUBLIC_TINYMCE_API_KEY` 使用点。
- 更新 `CLAUDE.md`（编辑器/存储格式段落）、`.env.example`。

## 测试

- **转换单测**：从备份取代表性文章（代码密集 / 含表格 / 含图 / 含 h4 / 含 sup / 含 hr），断言 `tryParseHTMLToBlocks` 产出非空 blocks，且 `blocksToHTMLLossy` 输出包含预期标签。
- **保存管线单测**：blocks → content(HTML) → highlightedContent。
- **手动验证**：迁移后随机抽查若干篇的编辑（加载到 BlockNote）与前台渲染。

## 风险与缓解

- **HTML→blocks 有损**：部分非标准结构会被近似/降级。缓解：迁移前后保留备份；`--dry` 预演 + 抽查。
- **代码块 HTML 结构差异**：BlockNote lossy 导出的 `<pre><code>` 结构需与 `highlightHtml` 正则匹配。缓解：实现时核对并按需微调正则。
- **`ServerBlockNoteEditor` 运行时**：确保 tRPC / 脚本在 Node 运行时（非 Edge）。

## 不做（YAGNI）

- 不保留 TinyMCE 任何 premium 插件功能（存量零使用）。
- 不为 Algolia 改为纯文本索引（沿用现有 HTML 索引行为）。
- 不引入新的渲染管线；沿用现有 React 内联 HTML 注入渲染方式。
