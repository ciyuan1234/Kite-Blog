---
title: "Linux 常用命令"
published: 2026-08-12
description: ""
tags: ["linux"]
category: "运维"
image: "/uploads/2026/08/linux-常用命令个人笔记-分类细化-极简干货版/cover.jpg"
slug: "linux-常用命令个人笔记-分类细化-极简干货版"
---

# Linux 常用命令个人笔记（分类细化·极简干货版）

个人日常高频 Linux 命令汇总，分类精细、标题精准，无冗余话术，纯实操自用，方便快速查阅、复习。

## 目录

## 一、前置基础：命令通用规则

- 严格区分大小写，所有命令、文件名大小写敏感

- 标准格式：`命令 + [可选参数] + [操作对象]`

- `man 命令` / `命令 --help`：查看官方帮助文档

- `Tab` 键：命令/路径自动补全，高效操作必备

- `Ctrl + C`：终止当前执行的命令

---

## 二、目录层级操作命令（路径导航\+目录管理）

### pwd：查看当前工作目录绝对路径

```Plain Text
pwd
```

### cd：切换工作目录

```Plain Text
cd /home    # 绝对路径跳转
cd test     # 相对路径跳转
cd ..       # 返回上一级目录
cd ../..    # 返回上两级目录
cd ~        # 切换至当前用户家目录
cd /        # 切换至系统根目录
cd -        # 返回上一次操作目录
```

### ls：列出目录文件/文件夹信息

```Plain Text
ls          # 极简展示文件、目录名
ls -l       # 详细信息（权限、所有者、大小、修改时间）
ls -a       # 展示所有文件（含隐藏文件 .xxx）
ls -lh      # 人性化单位展示文件大小（KB/MB/GB）
```

### mkdir / rmdir：创建/删除空目录

```Plain Text
mkdir test          # 创建单个空目录
mkdir -p a/b/c      # 递归创建多级嵌套目录
rmdir 空目录名      # 删除空目录（仅空白目录，安全无风险）
```

---

## 三、文件日常操作命令（增删改移）

### touch：创建空白普通文件

```Plain Text
touch test.txt
touch app.log
```

### rm：删除文件/目录（高危命令）

禁止执行 `rm -rf /`，会清空系统所有数据，操作前务必确认路径

```Plain Text
rm 文件名        # 删除文件（交互式确认）
rm -f 文件名     # 强制删除文件（无确认）
rm -r 目录       # 递归删除目录及内部内容
rm -rf 目录      # 强制递归删除（日常清理常用）
```

### cp：复制文件/目录

```Plain Text
cp test.txt /home    # 复制单个文件到指定目录
cp -r folder /home   # 递归复制整个文件夹及内部文件
```

### mv：移动文件/目录 \+ 重命名

```Plain Text
mv test.txt /home    # 移动文件到指定路径
mv old.txt new.txt   # 同路径下操作即为重命名
```

---

## 四、文件内容查看命令（日志/文本读取）

### cat：查看小文件完整内容

```Plain Text
cat test.txt
```

### less：分页查看大文件（灵活翻阅）

操作：上下键翻页，`q` 退出

```Plain Text
less app.log
```

### head：查看文件头部内容

```Plain Text
head -20 app.log     # 查看文件前20行（默认10行）
```

### tail：查看文件尾部/实时监控日志

```Plain Text
tail -20 app.log     # 查看文件后20行
tail -f app.log      # 实时监听文件新增内容（日志排查刚需）
```

---

## 五、文本编辑工具（Vim 极简操作）

服务器内置编辑器，用于修改配置文件、编辑文本

### 基础启动命令

```Plain Text
vim test.txt         # 打开/新建文件
```

### 核心模式操作

- `i`：进入编辑插入模式

- `Esc`：退出编辑模式，进入命令模式

- `:wq`：保存修改并退出

- `:q!`：放弃修改，强制退出

- `:set nu`：显示文本行号

---

## 六、文件权限与归属管理命令

### chmod：修改文件/目录访问权限

```Plain Text
chmod 755 文件名     # 常规权限（所有者可读写执行，其他只读执行，生产常用）
chmod 777 文件名     # 全权限开放（仅测试环境使用，生产禁用）
```

### chown：修改文件/目录所有者与所属组

```Plain Text
chown 用户:用户组 文件名
chown ubuntu:ubuntu test.txt
```

---

## 七、文件检索与内容过滤命令

### find：全盘/指定路径查找文件

```Plain Text
find / -name "test.txt"   # 全局精准匹配查找文件
find ./ -name "*.log"     # 模糊匹配，查找当前目录所有日志文件
```

### grep：文本内容关键词过滤

```Plain Text
grep "error" app.log      # 单文件检索指定关键词
grep -r "关键词" ./       # 递归检索目录下所有文件的匹配内容
```

---

## 八、文件压缩与解压命令

### tar：Linux 标准压缩解压（\.tar\.gz）

```Plain Text
tar -zcvf test.tar.gz test/  # 打包并压缩目录
tar -zxvf test.tar.gz        # 解压 tar.gz 压缩包
```

### zip/unzip：通用兼容压缩解压（\.zip）

```Plain Text
zip -r test.zip test/    # 压缩文件夹为zip包
unzip test.zip           # 解压zip压缩包
```

---

## 九、系统资源与进程管理命令

```Plain Text
top          # 实时监控系统进程、CPU、内存占用
df -h        # 查看磁盘分区占用情况
free -h      # 查看系统内存、缓存使用状态
ps -ef       # 查看系统所有运行进程
kill -9 PID  # 根据进程ID强制终止卡死进程
```

---

## 十、网络状态检测命令

```Plain Text
ping 域名/IP      # 测试主机网络连通性
ip addr / ifconfig # 查看服务器本机IP地址
curl 网址         # 测试网络访问、接口连通性
```

> （注：部分内容可能由 AI 生成）
