# KiteBlog

KiteBlog 是 `ciyuan1234` 的个人博客项目，基于 Astro 7、Svelte islands 和 Firefly 主题二次改造。

- 站点域名：<https://kite1024.xyz>
- GitHub 主页：<https://github.com/ciyuan1234>
- 项目仓库：<https://github.com/ciyuan1234/Kite-Blog>
- 当前部署：Cloudflare Worker / Cloudflare 静态资源托管
- 主要技术：Astro、TypeScript、Svelte、Tailwind CSS、Pagefind、Cloudflare Worker、GitHub Contents API

## 项目定位

这是一个可长期维护的个人博客，而不是单纯模板演示站。

站点用于记录技术实践、项目构建、生活想法和长期学习笔记。后台支持网页端写作和站点配置，内容最终写回 GitHub 仓库，再由 Cloudflare 重新部署并对外展示。

## 当前功能

- 中文导航、中文站点信息和个人资料
- 首页、文章、归档、分类、标签、搜索、RSS、Sitemap
- GitHub OAuth 后台登录
- 网页端新增、编辑、删除文章
- 本地 Markdown 文件拖拽导入
- 分类、个人链接、友链管理
- 后台修改头像、首页文案、统一背景 URL、播放器地址
- 电脑和手机共用同一套背景配置
- 站点技术文档页：`/tech/`
- 关于页：`/about/`

## 后台工作流

后台入口：

```txt
/admin/
```

登录方式：

- 使用 GitHub OAuth 登录
- 只允许 `ADMIN_GITHUB_LOGIN=ciyuan1234` 对应账号进入后台

文章管理：

- 文章文件存放在 `src/content/posts`
- 后台保存文章后，通过 GitHub Contents API 提交 Markdown 文件
- Cloudflare 重新部署后，文章会进入首页、归档、分类、RSS 和搜索索引

站点设置：

- 头像、首页文案、统一背景 URL、播放器地址等在 `/admin/settings/` 修改
- 设置保存后会写入 `src/config/profileConfig.ts`、`src/config/backgroundWallpaper.ts` 和 `src/config/siteConfig.ts`
- 背景只有一套配置，后台保存时会同时写入 desktop 和 mobile，确保电脑和手机一致

## Cloudflare 环境变量

后台依赖 Cloudflare 环境变量和 Secret。不要把这些值写进前端代码或提交到仓库。

必需项：

```txt
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
GITHUB_REPO_TOKEN
SESSION_SECRET
ADMIN_GITHUB_LOGIN=ciyuan1234
PUBLIC_SITE_URL=https://kite1024.xyz
GITHUB_REPO_OWNER=ciyuan1234
GITHUB_REPO_NAME=Kite-Blog
GITHUB_REPO_BRANCH=main
```

`GITHUB_REPO_TOKEN` 必须能读写仓库内容，GitHub Fine-grained token 至少需要：

```txt
Contents: Read and write
```

## 分支约定

正式部署分支使用 `main`。

Cloudflare 后台写入分支也应保持：

```txt
GITHUB_REPO_BRANCH=main
```

不要把正式改动只推到 `master`，否则 GitHub 首页和 Cloudflare 部署可能看不到新版本。

## 常用目录

- `src/pages/`：前台页面和后台页面
- `src/pages/admin/`：后台管理页面
- `src/content/posts/`：博客文章
- `src/content/spec/`：关于页、技术文档等站点说明
- `src/config/`：站点配置
- `src/utils/`：通用工具逻辑
- `worker.ts`：Cloudflare Worker API 和 GitHub 写入逻辑
- `docs/`：部署和补充文档

## 本地开发

请使用 pnpm：

```bash
pnpm install
pnpm dev
```

常用命令：

```bash
pnpm check
pnpm type-check
pnpm build
pnpm deploy:cloudflare
```

在 Windows PowerShell 中也可以使用：

```powershell
pnpm.cmd dev
pnpm.cmd build
```

如果 pnpm 版本切换被网络或签名校验卡住，可以直接使用本地依赖中的工具做检查：

```powershell
.\node_modules\.bin\astro.cmd check
.\node_modules\.bin\tsc.cmd --noEmit --isolatedDeclarations
.\node_modules\.bin\biome.cmd check .\src .\functions .\worker.ts
```

## 部署说明

当前项目适合部署到 Cloudflare Worker。

构建流程大致是：

1. 代码推送到 GitHub `main`
2. Cloudflare 拉取 GitHub 仓库重新构建
3. Astro 生成静态页面
4. Worker 负责 `/api/*` 后台接口
5. 访客访问 `kite1024.xyz`

如果后台改了文章或配置，但前台没有立刻变化，通常是 Cloudflare 还没有完成重新部署。

## 维护记忆

- GitHub 仓库是内容和配置的唯一持久化来源
- 后台不是本地编辑器，保存动作会提交到 GitHub
- 删除文章后，前台要等 Cloudflare 部署完成才会消失
- 统一背景 URL 是唯一后台入口，不再分别维护桌面背景和手机背景
- 技术文档内容放在 `src/content/spec/tech.md`
- 关于页面内容放在 `src/content/spec/about.md`
- 新增后台能力时，优先保持 GitHub-backed 工作流，不引入本地-only 存储

## 开源致谢

本项目基于 Firefly 主题二次改造，Firefly 基于 fuwari 开发。

- Firefly: <https://github.com/CuteLeaf/Firefly>
- fuwari: <https://github.com/saicaca/fuwari>
