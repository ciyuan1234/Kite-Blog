---
title: "DevPilot AI 项目Day 1：使用 C++ + Drogon 搭建后端基础环境"
published: 2026-08-11
description: ""
tags: ["开发经验"]
category: "项目开发"
image: "https://w.wallhaven.cc/full/l8/wallhaven-l882yl.png"
slug: "devpilot-ai-day-1-使用-c-drogon-搭建后端基础环境"
---

# DevPilot AI Day 1：使用 C++ + Drogon 搭建后端基础环境

## 一、项目背景

DevPilot AI 的目标不是单纯开发一个 Agent，而是构建一个面向软件工程场景的 **AI Agent 平台**。

平台负责：

- 用户管理
- 项目管理
- 文件管理
- Agent 管理
- Agent Runtime
- AI Gateway
- 多模型 Provider 接入

而 Agent 本身作为平台上的一种可扩展能力存在。

因此，第一阶段并不急着开发大量 Agent，而是先把平台最基础的后端运行环境搭建起来。

本阶段选择：

- 后端：C++
- Web Framework：Drogon
- 构建系统：CMake
- 编译器：GCC 13
- 操作系统：Ubuntu 24.04

最终希望实现最小闭环：

```text
浏览器 / curl
       ↓
C++ Drogon
       ↓
GET /api/health
       ↓
{"status":"ok"}
```

---

# 二、项目目录

目前项目采用平台化的目录结构：

```text
project/
├── agents/
├── backend/
│   ├── CMakeLists.txt
│   ├── src/
│   │   └── main.cpp
│   └── build/
├── deploy/
├── docs/
│   ├── PRDv1.0.md
│   └── SDDv1.0.md
├── frontend/
└── README.md
```

其中：

```text
backend/
```

负责平台后端。

```text
agents/
```

预留未来 Agent 的实现。

```text
frontend/
```

负责未来的 Web / Desktop 用户界面。

```text
docs/
```

保存 PRD、SDD 等项目设计文档。

这种结构的一个重要意义是：

> **先建立平台，再让 Agent 成为平台上的扩展能力。**

---

# 三、为什么选择 C++ + Drogon？

DevPilot 的后端主要承担平台基础设施职责，包括：

- 用户请求处理
- 项目管理
- 文件管理
- Agent 管理
- Runtime 调度
- AI Gateway
- Provider 管理

因此后端并不等于 Agent。

Agent 未来甚至可以使用 Python、C++、Go 等不同语言实现。

平台只需要通过统一协议与 Agent Runtime 进行通信。

因此架构可以理解为：

```text
                 DevPilot Platform
                       │
              ┌────────┴────────┐
              │                 │
          Platform          AI System
              │                 │
       User / Project       Agent
       File / Auth            │
                          Runtime
                              │
                         AI Gateway
                              │
                          Provider
                              │
                            LLM
```

---

# 四、安装 Drogon

首先安装 Drogon 的开发包：

```bash
sudo apt install -y libdrogon-dev
```

这里遇到了一个容易误解的问题：

## `-dev` 是什么意思？

Linux 下很多 C/C++ 库会拆成两个部分。

例如：

```text
libxxx
```

通常主要用于运行程序。

而：

```text
libxxx-dev
```

通常用于开发和编译程序。

开发包里面一般包含：

- Header 文件
- 静态/动态库相关信息
- CMake 配置文件
- 编译和链接所需要的元数据

例如安装 Drogon 后：

```text
/usr/include/drogon/
```

里面就是 Drogon 的 C++ Header。

同时还可以看到：

```text
/usr/lib/x86_64-linux-gnu/cmake/Drogon/
```

其中包含：

```text
DrogonConfig.cmake
DrogonTargets.cmake
```

这些文件会被 CMake 用来寻找 Drogon。

---

# 五、创建 CMake 项目

最开始使用 CMake 配置项目。

核心结构如下：

```cmake
cmake_minimum_required(VERSION 3.20)

project(devpilot-backend
    VERSION 0.1.0
    DESCRIPTION "DevPilot backend"
    LANGUAGES CXX
)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_executable(devpilot-backend
    src/main.cpp
)

find_package(Drogon REQUIRED)

target_link_libraries(
    devpilot-backend
    PRIVATE Drogon::Drogon
)
```

这里暂时不需要把所有 CMake 语法全部学完。

当前阶段只需要理解四个核心命令。

### `project()`

定义项目：

```cmake
project(devpilot-backend)
```

### `add_executable()`

定义最终要生成的可执行程序：

```cmake
add_executable(devpilot-backend
    src/main.cpp
)
```

也就是说：

```text
main.cpp
   ↓
编译
   ↓
devpilot-backend
```

### `find_package()`

寻找外部依赖：

```cmake
find_package(Drogon REQUIRED)
```

### `target_link_libraries()`

把外部库连接到我们的程序：

```cmake
target_link_libraries(
    devpilot-backend
    PRIVATE Drogon::Drogon
)
```

---

# 六、第一次遇到 Drogon 依赖问题

运行：

```bash
cmake -S . -B build
```

最开始并没有成功。

Drogon 的 CMake 配置会继续检查它所依赖的其他库。

因此出现了一系列错误。

例如：

```text
Could NOT find Jsoncpp
```

于是安装：

```bash
sudo apt install -y libjsoncpp-dev
```

之后继续配置。

---

# 七、UUID 依赖

接下来：

```text
Could NOT find UUID
```

系统中需要 UUID 开发相关组件。

安装完成后继续配置。

最终：

```text
-- Found UUID:
/usr/lib/x86_64-linux-gnu/libuuid.so
```

说明已经找到。

---

# 八、PostgreSQL 依赖

之后出现：

```text
Could NOT find pg
```

继续补充 PostgreSQL 开发依赖。

最终：

```text
-- Found PostgreSQL:
/usr/lib/x86_64-linux-gnu/libpq.so
```

说明 Drogon 已经可以找到 PostgreSQL 客户端库。

---

# 九、SQLite 依赖

随后遇到：

```text
Could NOT find SQLite3
```

补充 SQLite 开发依赖后：

```text
-- Found SQLite3:
/usr/lib/x86_64-linux-gnu/libsqlite3.so
```

---

# 十、MySQL 是这次最值得记录的问题

随后遇到：

```text
Cannot find MySQL
```

但实际上系统中已经存在：

```text
/usr/lib/x86_64-linux-gnu/libmysqlclient.so
```

通过：

```bash
ls -l /usr/lib/x86_64-linux-gnu/libmysql*
```

可以看到：

```text
libmysqlclient.so
libmysqlclient.so.21
libmysqlclient.so.21.2.46
```

也就是说：

> MySQL 实际存在，但 Drogon 自带的 `FindMySQL.cmake` 没有在正确的位置找到它。

进一步查看：

```bash
sed -n '1,130p' \
/usr/lib/x86_64-linux-gnu/cmake/Drogon/FindMySQL.cmake
```

发现它通过：

```cmake
find_library()
```

搜索 MySQL 库。

但它的搜索路径没有覆盖当前系统实际的：

```text
/usr/lib/x86_64-linux-gnu
```

因此在自己的 CMakeLists.txt 中显式指定：

```cmake
set(MYSQL_INCLUDE_DIRS "/usr/include/mysql")
set(MYSQL_LIBRARIES
    "/usr/lib/x86_64-linux-gnu/libmysqlclient.so"
)
```

然后重新运行：

```bash
cmake -S . -B build
```

最终出现：

```text
-- MySQL Include dir: /usr/include/mysql
-- MySQL client libraries:
/usr/lib/x86_64-linux-gnu/libmysqlclient.so

-- Found MySQL:
 /usr/lib/x86_64-linux-gnu/libmysqlclient.so
```

MySQL 问题解决。

---

# 十一、Brotli

随后遇到：

```text
Could NOT find BROTLI
```

通过：

```bash
apt-cache policy libbrotli-dev
```

确认系统仓库存在对应的开发包。

安装：

```bash
sudo apt install -y libbrotli-dev
```

之后：

```text
-- Found Brotli:
/usr/lib/x86_64-linux-gnu/libbrotlidec.so
```

Brotli 解决。

---

# 十二、Hiredis

接下来出现：

```text
Could NOT find Hiredis
```

Hiredis 是 Redis 的 C 客户端库。

安装对应开发包后，CMake 成功找到：

```text
-- Found Hiredis:
/usr/lib/x86_64-linux-gnu/libhiredis.so
```

---

# 十三、yaml-cpp

最后又遇到了：

```text
Could not find a package configuration file
provided by "yaml-cpp"
```

这里再次体现了 Linux 开发包和运行时包的区别。

安装：

```bash
sudo apt install -y libyaml-cpp-dev
```

之后重新配置。

---

# 十四、最终 CMake 配置成功

经过这些依赖处理后，最终运行：

```bash
cmake -S . -B build
```

成功得到：

```text
-- Configuring done
-- Generating done
-- Build files have been written to:
/home/dev/project/backend/build
```

这意味着：

```text
CMake 配置阶段
        ↓
成功
```

也就是说，CMake 已经知道：

- 项目叫什么
- 使用什么编译器
- C++ 标准是什么
- 源代码在哪里
- Drogon 在哪里
- Drogon 的依赖在哪里
- 最终应该如何生成构建文件

接下来才真正进入：

```text
C++ 编译阶段
```

---

# 十五、目前项目状态

现在整个后端的构建链路已经变成：

```text
main.cpp
   │
   ↓
CMakeLists.txt
   │
   ↓
CMake
   │
   ↓
Drogon
   │
   ├── Jsoncpp       ✅
   ├── UUID          ✅
   ├── PostgreSQL    ✅
   ├── SQLite        ✅
   ├── MySQL         ✅
   ├── Brotli        ✅
   ├── Hiredis       ✅
   └── yaml-cpp      ✅
   │
   ↓
build/
```

下一步就是：

```bash
cmake --build build
```

如果编译成功：

```text
[100%] Built target devpilot-backend
```

就说明我们的 C++ 后端已经真正编译出来了。

---

# 十六、这一天真正学到的东西

这一天表面上是在安装 Drogon。

但实际上解决的是三个问题。

### 1. 理解 C++ 项目的构建链

```text
源代码
 ↓
CMake
 ↓
编译器
 ↓
第三方库
 ↓
链接
 ↓
可执行文件
```

### 2. 理解 Linux 的开发依赖

例如：

```text
libdrogon-dev
libjsoncpp-dev
libbrotli-dev
libyaml-cpp-dev
```

这些不是“运行 Agent”需要的东西，而是**编译 DevPilot 后端所需要的开发环境**。

### 3. 理解平台开发和 Agent 开发的区别

现在我们还没有开发真正的 Agent。

我们正在做的是：

```text
DevPilot Platform
        ↓
Backend
        ↓
HTTP Server
        ↓
API
```

以后才会出现：

```text
Agent
   ↓
Agent Runtime
   ↓
AI Gateway
   ↓
LLM Provider
```

因此，当前阶段最重要的目标不是“做出一个很厉害的 Agent”，而是：

> **先把平台的骨架跑起来。**

等 `/api/health` 成功之后，再逐步加入用户、项目、文件、Agent Metadata、AI Gateway 等模块。

这才符合 DevPilot 当前 SDD 的设计思路。
