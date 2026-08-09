---
title: Personalization Map
published: 2026-08-09
description: A quick map of the files that control identity, visuals, and optional features.
tags: [Config, Design]
category: Guide
image: ./images/both-grid.avif
slug: customization-map
---

This post is a map for future customization.

## Identity

Edit `src/config/profileConfig.ts` to change the avatar, name, bio, and social
links. Your GitHub profile is already configured as
`https://github.com/ciyuan1234`.

## Visuals

Edit `src/config/backgroundWallpaper.ts` to change the home background images.
Desktop and mobile images can be configured separately, and the carousel can be
turned on or off.

Edit `src/styles/polish.css` for the added visual layer: card shadows, hover
states, nav polish, banner readability, and mobile spacing.

## Features

Static features work well on GitHub Pages:

- Posts
- Tags and categories
- Archive
- Search
- Gallery
- Bookmarks
- RSS and sitemap
- Local music player
- Theme and wallpaper controls

Features that need an external service should stay disabled until configured:

- Comments
- Guestbook comments
- Remote dynamic feeds
- Sponsor payment methods
- Bangumi or Bilibili account sync

