# 技术文档

这份文档用于记录 KiteBlog 的站点结构、后台逻辑、部署方式和日常维护规则。
目标很简单：以后你再回到这个项目时，不需要重新猜每个页面是干什么的。

## 项目定位

KiteBlog 是一个基于 Astro 的个人博客系统，前台负责展示，后台负责写作和配置。
它支持：

- 文章新增、编辑、删除
- 本地 Markdown 导入
- 头像、背景、首页文案、链接配置
- 分类、友链、个人链接管理
- GitHub 仓库同步
- Cloudflare 自动部署

## 目录说明

- `src/pages/`：前台和后台页面
- `src/content/posts/`：文章内容
- `src/content/spec/`：站点说明、技术文档、关于页
- `src/config/`：站点配置
- `worker.ts`：Cloudflare Worker 后台 API
- `src/utils/`：前台通用逻辑

## 内容写入流程

### 文章

1. 在后台打开文章编辑页
2. 输入正文，或者拖拽本地 `md` 文件导入
3. 保存后写入 GitHub 仓库中的 `src/content/posts`
4. Cloudflare 重新部署后，前台、RSS、归档、搜索同步更新

### 站点配置

1. 在后台打开站点设置
2. 修改头像、统一背景、首页标题、副标题、链接等
3. 保存后写入仓库配置文件
4. Cloudflare 部署后全站生效

## 维护规则

- 文章和配置都以 GitHub 为唯一持久化来源
- 后台页面只是编辑入口，不是本地缓存
- 改完 GitHub 后，前台是否更新取决于 Cloudflare 是否已重新部署
- 手机和电脑共用同一套背景配置
- 背景、头像、首页文案都应该优先在后台改，不建议再手改配置文件

## 开发备注

- GitHub 登录只允许 `ciyuan1234` 账号进入后台
- 后台写操作依赖有写权限的 GitHub Token
- 如果删除文章后前台没变，先确认 Cloudflare 部署已经完成
- 如果后台内容不对，先确认 GitHub 仓库里的文件是否已经更新

## 当前约定

- 首页介绍写在 `src/content/spec/about.md`
- 技术文档写在 `src/content/spec/tech.md`
- 文章教程和说明写在 `src/content/posts`
- 以后如果再加维护说明，也优先放进 `spec` 目录
