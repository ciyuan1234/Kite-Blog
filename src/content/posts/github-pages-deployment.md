---
title: KiteBlog 的 GitHub Pages 部署记录
published: 2026-08-09
description: 记录 KiteBlog 如何通过 GitHub Actions 构建并部署到 GitHub Pages 和自定义域名。
tags: [GitHub, Astro, 部署]
category: 构建记录
image: ./images/github.avif
slug: github-pages-deployment
---

KiteBlog 的部署仓库是：

```txt
https://github.com/ciyuan1234/Kite-Blog.git
```

站点域名是：

```txt
https://kite1024.xyz
```

项目已经配置 GitHub Actions。推送到 `main` 或 `master` 后，工作流会运行
`pnpm build`，生成静态文件并发布到 GitHub Pages。

## 部署步骤

1. 把代码推送到 `ciyuan1234/Kite-Blog`。
2. 在 GitHub 仓库里打开 `Settings > Pages`。
3. Source 选择 `GitHub Actions`。
4. 在 Pages 里绑定自定义域名 `kite1024.xyz`。
5. 按 GitHub 提示配置 DNS。

`public/CNAME` 已经写入 `kite1024.xyz`，构建时会一起进入发布产物。

## 静态站点限制

GitHub Pages 托管的是静态网页。文章、配置、头像和背景如果要对所有访客生效，
最终都需要写回仓库并重新部署。
