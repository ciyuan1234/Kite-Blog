---
title: KiteBlog 自定义地图
published: 2026-08-09
description: 快速了解 KiteBlog 的头像、背景、音乐、页面开关和视觉效果应该在哪里修改。
tags: [配置, 设计]
category: 指南
image: ./images/both-grid.avif
slug: customization-map
---

这篇文章是一张自定义地图。

## 身份信息

修改 `src/config/profileConfig.ts`：

- 名称
- 简介
- 头像
- GitHub 链接
- QQ、邮箱、RSS 或其他社交链接

当前 GitHub 主页已经配置为：

```txt
https://github.com/ciyuan1234
```

## 视觉效果

修改 `src/config/backgroundWallpaper.ts` 配置首页背景。
桌面端和移动端可以使用不同图片，也可以使用多张图片轮播。

新增的视觉美化主要在：

```txt
src/styles/polish.css
```

这里控制卡片阴影、玻璃效果、导航栏层次、横幅文字可读性和移动端间距。

## 网页端控制台

打开 `/studio/` 可以在浏览器里临时修改：

- 头像 URL
- 昵称和简介
- 首页标题和副标题
- 背景图片 URL
- 玻璃卡片强度
- 文章 Markdown 草稿

这些设置默认只保存在当前浏览器。要发布给所有人，需要把导出的配置写回代码。
