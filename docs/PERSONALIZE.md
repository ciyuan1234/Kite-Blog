# KiteBlog 个性化说明

这个站点已经按 GitHub Pages 静态部署方式整理。

## 个人信息

编辑 `src/config/profileConfig.ts`：

- `avatar`：头像
- `name`：昵称
- `bio`：简介
- `links`：GitHub、QQ、邮箱、RSS 或其他社交链接

当前 GitHub 主页：

```ts
https://github.com/ciyuan1234
```

## 站点信息

编辑 `src/config/siteConfig.ts`：

- `title`
- `subtitle`
- `site_url`
- `description`
- `keywords`
- `themeColor.hue`
- `pages` 下的页面开关

GitHub Actions 会设置：

- `PUBLIC_SITE_URL=https://kite1024.xyz`
- `PUBLIC_BASE_PATH=/`

## 背景与首页文案

编辑 `src/config/backgroundWallpaper.ts`。

桌面背景放在 `src/assets/images/DesktopWallpaper`，移动端背景放在 `src/assets/images/MobileWallpaper`。可以配置一张图，也可以配置数组轮播。

## 网页端控制台

打开 `/studio/` 可以在浏览器端预览：

- 头像 URL
- 背景图 URL
- 站点标题
- 首页文案
- 玻璃卡片强度
- 文章 Markdown 草稿
- 云端配置同步
- 云端草稿保存、载入和删除

这些设置默认保存在当前浏览器的 `localStorage`。如果部署到 Cloudflare Pages，并配置 `KITEBLOG_KV` 和 `KITEBLOG_ADMIN_TOKEN`，可以保存到云端并对所有访客生效。

## 音乐

编辑 `src/config/musicConfig.ts`。

GitHub Pages 最稳妥的方式是使用本地音乐文件，把音频放在 `public/assets/music` 下。远程音乐 API 可能受跨域和第三方稳定性影响。

## 需要外部服务的功能

以下功能不能只靠 GitHub Pages 完成：

- 真正的网页端文章发布和编辑
- 所有访客共享的头像/背景设置
- 评论和留言
- 后台登录
- 私密数据存储

可选方案是 Cloudflare Workers、Vercel/Netlify Functions、GitHub OAuth + GitHub API，或 Decap CMS 这类 Git-based CMS。

Cloudflare 具体部署步骤见 `docs/CLOUDFLARE.md`。

## 回退

导入原始版本已经打标签：

```sh
git checkout baseline-v1
```

回到当前开发分支：

```sh
git switch master
```
