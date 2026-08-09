---
title: 欢迎来到 KiteBlog
published: 2026-08-09
pinned: true
description: 这是 KiteBlog 的起始文章，用来说明这个个人博客会记录什么，以及如何继续发布内容。
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
- 后台密码登录的网页端后台

## 如何发布文章

打开 `/admin/`，输入后台密码后即可新增、编辑和删除文章。后台会把文章提交到 GitHub 仓库中的 `src/content/posts`，Cloudflare 自动重新部署后，文章会进入首页、归档、RSS 和搜索索引。

图片请使用外链 URL，例如图床、GitHub raw 或 Cloudflare R2 的公开链接。

头像、背景和首页文案可以在 `/admin/settings/` 修改。保存后会提交到 GitHub 配置文件，等待 Cloudflare 重新部署完成后，手机和其他浏览器都会显示同一套设置。
