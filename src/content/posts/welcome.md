---
title: 欢迎来到 KiteBlog
published: 2026-08-09
pinned: true
description: 这是 KiteBlog 的起始文章，用来说明这个个人博客会记录什么，以及如何继续自定义。
tags: [博客, 个人站]
category: 随笔
image: ./images/firefly1.avif
slug: welcome
---

欢迎来到 KiteBlog。

这个站点会用来记录技术实践、项目过程、生活想法，以及一些值得长期整理的问题。当前页面已经从原模板演示站清理成个人博客结构，你可以直接开始写自己的内容。

## 目前包含的功能

- 文章、归档、分类、标签
- Pagefind 静态搜索
- 相册、动态、书签导航
- RSS 和 Sitemap
- 背景轮播、主题切换、布局切换
- 音乐播放器
- 网页端外观控制台
- Cloudflare KV 草稿和云端文章发布

## 后续怎么自定义

常用配置集中在 `src/config`：

- `profileConfig.ts`：头像、昵称、简介、GitHub、QQ、邮箱等个人链接
- `siteConfig.ts`：站点名、域名、页面开关、文章布局
- `backgroundWallpaper.ts`：桌面端和移动端背景图、轮播效果
- `musicConfig.ts`：本地音乐列表或远程音乐 API

如果只是想在浏览器里预览头像、背景和文案，可以打开 `/studio/`。部署到 Cloudflare 后，保存到云端的外观配置会同步给所有访客；发布到云端的文章会显示在 `/live/`。
