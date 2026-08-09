# Cloudflare 部署说明

KiteBlog 当前推荐使用 Cloudflare Workers 部署。Worker 托管 `dist` 静态资源，并处理 `/api/*` 后台接口。

## 构建与部署

```bash
pnpm run build
pnpm run deploy:worker
```

`wrangler.jsonc` 的关键配置：

- `main`: `./worker.ts`
- `assets.directory`: `./dist`
- `assets.binding`: `ASSETS`
- `run_worker_first`: `/api/*`

## 后台配置

网页后台位于 `/admin/`，文章会通过 GitHub API 写入仓库：

```text
ciyuan1234/Kite-Blog
```

Cloudflare Worker 需要配置这些环境变量：

```text
ADMIN_PASSWORD=后台登录密码
GITHUB_REPO_TOKEN=有仓库 contents 读写权限的 GitHub Token
SESSION_SECRET=一段足够长的随机字符串
PUBLIC_SITE_URL=https://kite1024.xyz
```

可选环境变量：

```text
GITHUB_REPO_OWNER=ciyuan1234
GITHUB_REPO_NAME=Kite-Blog
GITHUB_REPO_BRANCH=main
```

后台登录不再使用 GitHub OAuth。`ADMIN_PASSWORD` 只放在 Cloudflare 环境变量里，不要写进仓库。

## 后台接口

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/admin/session`
- `GET /api/admin/settings`
- `PUT /api/admin/settings`
- `GET /api/admin/posts`
- `GET /api/admin/posts/:slug`
- `POST /api/admin/posts`
- `PUT /api/admin/posts/:slug`
- `DELETE /api/admin/posts/:slug`

新增文章会创建 `src/content/posts/{slug}.md`。编辑和删除会直接提交到 GitHub。Cloudflare 连接 GitHub 自动部署后，提交完成后会自动重新构建，文章随后进入首页、归档、RSS、Sitemap 和 Pagefind 搜索。

站点设置会更新这些配置文件：

- `src/config/profileConfig.ts`
- `src/config/backgroundWallpaper.ts`
- `src/config/siteConfig.ts`

头像、背景和首页文案保存后同样需要等待 Cloudflare 自动部署完成，手机和其他浏览器才会看到最新版本。

## 注意事项

- 不要把 `ADMIN_PASSWORD`、`GITHUB_REPO_TOKEN` 或 `SESSION_SECRET` 写进仓库。
- 图片使用外链 URL，例如图床、GitHub raw 或 Cloudflare R2 的公开链接。
- 如果你是手动 `wrangler deploy`，GitHub 上的代码不会自动进入线上 Worker，需要重新部署。
