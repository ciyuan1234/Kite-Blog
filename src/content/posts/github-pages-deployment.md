---
title: Deploying This Blog to GitHub Pages
published: 2026-08-09
description: Notes for deploying this Astro site to GitHub Pages through GitHub Actions.
tags: [GitHub, Astro, Deployment]
category: Build Log
image: ./images/github.avif
slug: github-pages-deployment
---

This site is configured for GitHub Pages deployment with GitHub Actions.

The workflow supports both user sites and project sites:

- `ciyuan1234.github.io` uses `/` as the base path.
- Any other repository uses `/<repository-name>/` as the base path.

After pushing the repository to GitHub, open the repository settings and enable
GitHub Pages with **GitHub Actions** as the source.

## Deployment Checklist

1. Push this repository to GitHub.
2. Confirm the default branch is `main` or `master`.
3. Open **Settings > Pages**.
4. Set the source to **GitHub Actions**.
5. Run the `Deploy to GitHub Pages` workflow.

The production build generates optimized images, RSS, sitemap, and Pagefind
search indexes.

