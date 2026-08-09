# Personalization Guide

This site is prepared for GitHub Pages and static hosting.

## Identity

Edit `src/config/profileConfig.ts`.

- `avatar`: author avatar
- `name`: profile name
- `bio`: short intro
- `links`: GitHub, QQ, email, RSS, or other social links

Your GitHub profile is already set to:

```ts
https://github.com/ciyuan1234
```

## Site Metadata

Edit `src/config/siteConfig.ts`.

- `title`
- `subtitle`
- `site_url`
- `description`
- `keywords`
- `themeColor.hue`
- page switches under `pages`

For GitHub Pages, `astro.config.mjs` also reads these environment variables:

- `PUBLIC_SITE_URL`
- `PUBLIC_BASE_PATH`

The GitHub Actions workflow sets them automatically.

## Backgrounds

Edit `src/config/backgroundWallpaper.ts`.

Desktop images are in `src/assets/images/DesktopWallpaper`.
Mobile images are in `src/assets/images/MobileWallpaper`.

You can use one image or an array of images. The carousel is enabled by default.

## Music

Edit `src/config/musicConfig.ts`.

The safest GitHub Pages setup is `mode: "local"` with audio files placed under
`public/assets/music`.

Remote music APIs can work in the browser, but they depend on third-party
availability and cross-origin behavior.

## Static Features

These features work well on GitHub Pages:

- Posts
- Archive
- Tags and categories
- Pagefind search
- Gallery
- Bookmarks
- RSS
- Sitemap
- Wallpaper and theme controls
- Local music player

## Features Requiring External Services

Keep these disabled until you configure the required service:

- Comments
- Guestbook comments
- Sponsor payment methods
- Bangumi or Bilibili sync
- Remote Memos feed

## Rollback

The imported original version is tagged as:

```sh
git checkout baseline-v1
```

To return from the tag back to the working branch:

```sh
git switch master
```
