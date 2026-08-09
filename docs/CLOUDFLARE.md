# Cloudflare 部署说明

KiteBlog 可以使用 Cloudflare Pages 托管静态页面，并通过 Pages Functions 提供少量后端能力。

## 推荐设置

在 Cloudflare Pages 新建项目，连接 GitHub 仓库：

```text
ciyuan1234/Kite-Blog
```

构建配置：

```text
Framework preset: Astro
Build command: pnpm run build
Build output directory: dist
Root directory: /
Node.js version: 22
```

环境变量：

```text
PUBLIC_SITE_URL=https://kite1024.xyz
PUBLIC_BASE_PATH=/
```

## 云端控制台能力

`/studio/` 控制台会调用这些 Cloudflare Pages Functions：

- `GET /api/kite-config`：读取公开站点配置
- `PUT /api/kite-config`：保存头像、背景、标题、简介等全站配置
- `DELETE /api/kite-config`：重置云端站点配置
- `POST /api/kite-drafts`：保存 Markdown 草稿
- `GET /api/kite-drafts`：列出最近草稿元数据
- `GET /api/kite-drafts?key=...`：读取指定草稿正文
- `DELETE /api/kite-drafts?key=...`：删除指定草稿

写入接口需要 Cloudflare 环境变量：

```text
KITEBLOG_ADMIN_TOKEN=一段足够长的随机口令
```

同时需要创建 KV namespace，并在 Pages 项目中绑定：

```text
Binding name: KITEBLOG_KV
```

不要把 `KITEBLOG_ADMIN_TOKEN` 写入仓库。它只应该存在于 Cloudflare 的环境变量里。

## 功能边界

Cloudflare KV 适合保存站点配置和草稿，不适合作为完整文章发布系统的唯一数据源。正式文章仍建议提交到 `src/content/posts`，这样可以继续获得 Astro 构建、RSS、Sitemap、Pagefind 搜索和版本控制。

## GitHub 同步

代码仍然以 GitHub 仓库为主。Cloudflare Pages 连接仓库后，建议部署分支选择 `main`。本地推送后 Cloudflare 会自动拉取、构建、发布。

如果手动部署：

```bash
pnpm build
pnpm deploy:cloudflare
```

首次使用 `wrangler` 手动部署时需要先登录 Cloudflare：

```bash
npx wrangler login
```

如果后续要做完整后台，可以继续扩展：

- D1：保存文章、评论、登录会话
- R2：保存头像、背景图、附件
- Workers Access 或 GitHub OAuth：后台登录
- GitHub API：把网页端发布的文章提交回仓库
