# Cloudflare 部署说明

KiteBlog 现在同时支持两种 Cloudflare 部署方式：

- Cloudflare Workers：适合 `*.workers.dev` 地址，本仓库的 `worker.ts` 会处理 `/api/*` 并托管 `dist` 静态资源。
- Cloudflare Pages：适合 `*.pages.dev` 地址，本仓库保留 `functions/api/*` 作为 Pages Functions。

如果你的站点地址类似 `kite-blog.3085197557.workers.dev`，你正在使用 Workers，请优先看 Workers 配置。

## Workers 配置

构建命令：

```bash
pnpm run build
```

部署命令：

```bash
pnpm run deploy:worker
```

Wrangler 使用 `wrangler.jsonc`：

- `main`: `./worker.ts`
- `assets.directory`: `./dist`
- `assets.binding`: `ASSETS`
- `run_worker_first`: `/api/*`

Cloudflare Worker 里还必须配置：

```text
KITEBLOG_ADMIN_TOKEN=一段足够长的管理口令
```

以及 KV binding：

```text
Binding name: KITEBLOG_KV
```

如果缺少 KV binding，控制台会显示 `Cloudflare KV binding KITEBLOG_KV is not configured.`。如果缺少管理口令，保存云端配置、草稿和文章发布会失败。

## Pages 配置

如果使用 Cloudflare Pages，连接 GitHub 仓库：

```text
ciyuan1234/Kite-Blog
```

推荐构建配置：

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
KITEBLOG_ADMIN_TOKEN=一段足够长的管理口令
```

KV binding：

```text
Binding name: KITEBLOG_KV
```

手动 Pages 部署命令：

```bash
pnpm run deploy:pages
```

## 控制台接口

`/studio/` 会调用这些接口：

- `GET /api/kite-config`：读取公开站点配置
- `PUT /api/kite-config`：保存头像、背景、标题、简介、卡片效果等全站配置
- `DELETE /api/kite-config`：重置云端站点配置
- `POST /api/kite-drafts`：保存 Markdown 草稿
- `GET /api/kite-drafts`：列出最近草稿
- `GET /api/kite-drafts?key=...`：读取指定草稿正文
- `DELETE /api/kite-drafts?key=...`：删除指定草稿
- `POST /api/kite-posts`：发布云端文章
- `GET /api/kite-posts`：列出云端文章
- `GET /api/kite-posts?slug=...`：读取指定云端文章
- `DELETE /api/kite-posts?slug=...`：删除指定云端文章

云端文章会显示在 `/live/` 页面。正式长期文章仍建议提交到 `src/content/posts`，这样可以进入 Astro 构建、RSS、Sitemap、Pagefind 搜索和 Git 版本控制。

## GitHub 同步

如果 Cloudflare 项目连接了 GitHub 仓库，推送到部署分支后 Cloudflare 会自动重新构建和发布。

如果你是用 `wrangler deploy` 手动部署的 Worker，GitHub 上的代码不会自动进入线上服务；需要重新运行部署命令，或者在 Cloudflare 里开启 GitHub 自动构建。

不要把 `KITEBLOG_ADMIN_TOKEN` 写进仓库。它只应该存在于 Cloudflare 的环境变量里。
