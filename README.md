# KiteBlog

KiteBlog 是 `ciyuan1234` 的个人博客，基于 Astro 7、Svelte islands 和 Firefly 主题改造，准备部署到 GitHub Pages。

- 站点域名：<https://kite1024.xyz>
- GitHub 主页：<https://github.com/ciyuan1234>
- 项目仓库：<https://github.com/ciyuan1234/Kite-Blog>
- 技术栈：Astro、TypeScript、Svelte、Pagefind、Tailwind CSS

## 当前功能

- 中文站点信息、中文导航和个人资料
- 文章、归档、分类、标签
- Pagefind 静态搜索
- RSS、Sitemap、自定义域名 `CNAME`
- 背景轮播、主题切换、布局切换
- 更强的玻璃卡片视觉效果
- 本地音乐播放器配置入口
- `/studio/` 网页端控制台，用于本机预览头像、背景、文案和生成文章 Markdown

## GitHub Pages 说明

GitHub Pages 只能托管静态文件，不能直接运行长期在线的后端服务，也不能让浏览器直接安全地写入仓库文件。

当前 `/studio/` 控制台的改动会保存到当前浏览器的 `localStorage`，适合预览和生成配置片段。要让所有访客看到这些改动，需要把导出的配置或 Markdown 写回仓库并重新部署。

如果以后需要真正的网页端发布、编辑文章、修改头像和背景，可以接入：

- GitHub OAuth + GitHub API：登录后提交 Markdown 到仓库，再由 GitHub Actions 部署。
- Cloudflare Workers + KV/D1/R2：静态前端继续放 GitHub Pages，后端和数据放 Cloudflare。
- Vercel/Netlify Functions：使用 Serverless API 做后台。
- Git-based CMS，例如 Decap CMS：通过 GitHub 登录管理内容。

不要把 GitHub Token、QQ 密钥或任何私密配置写进前端代码。

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
pnpm format
pnpm build
```

在 Windows PowerShell 如果 `pnpm` 被执行策略拦截，可以使用：

```powershell
pnpm.cmd dev
pnpm.cmd build
```

## 常用配置

- `src/config/siteConfig.ts`：站点名、域名、描述、主题色、页面开关
- `src/config/profileConfig.ts`：头像、昵称、简介、GitHub、RSS、QQ 或邮箱链接
- `src/config/backgroundWallpaper.ts`：桌面端/移动端背景、轮播、首页标题文案
- `src/config/musicConfig.ts`：播放器和歌单
- `src/config/navBarConfig.ts`：导航栏
- `src/content/posts`：文章 Markdown
- `src/content/dynamic`：动态 Markdown
- `public/CNAME`：GitHub Pages 自定义域名

## 发布

仓库已配置 GitHub Actions。推送到 GitHub 后会执行构建，并把 `dist` 发布到 Pages。

自定义域名 `kite1024.xyz` 还需要在 GitHub Pages 设置中绑定域名，并在 DNS 服务商处添加 GitHub Pages 需要的 DNS 记录。

## 版本回退

已经建立版本标签：

```bash
git checkout baseline-v1
```

返回当前开发分支：

```bash
git switch master
```

## 开源致谢

本项目由 Firefly 主题改造而来，Firefly 基于 fuwari 二次开发。请保留 MIT License 中的原作者版权声明。

- Firefly: <https://github.com/CuteLeaf/Firefly>
- fuwari: <https://github.com/saicaca/fuwari>
