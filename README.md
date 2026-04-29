# MiMo Code

> 小米 MiMo 模型的专属 AI 编程助手，在终端里输入 `mimo` 即可使用。

```
███╗   ███╗ ██╗ ███╗   ███╗  ██████╗
████╗ ████║ ██║ ████╗ ████║ ██╔═══██╗
██╔████╔██║ ██║ ██╔████╔██║ ██║   ██║
██║╚██╔╝██║ ██║ ██║╚██╔╝██║ ██║   ██║
██║ ╚═╝ ██║ ██║ ██║ ╚═╝ ██║ ╚██████╔╝
╚═╝     ╚═╝ ╚═╝ ╚═╝     ╚═╝  ╚═════╝
```

---

## 这是什么？

MiMo Code 是一个运行在终端里的 AI 编程助手。你在终端输入 `mimo`，就可以用自然语言让 AI 帮你写代码、改 bug、读项目、跑命令。

它背后用的是小米的 MiMo 大模型（V2 / V2.5 系列），不是 ChatGPT，不是 Claude，是小米自研的通用智能基座。

**一句话总结**：把小米 MiMo 模型装进终端，变成你的编程搭档。

### 能做什么

- 🔧 **写代码** — "帮我写一个 Python 快速排序"
- 🐛 **修 bug** — "这个函数为什么报错，帮我修"
- 📖 **读项目** — "解释一下这个项目的架构"
- 🖥️ **跑命令** — "帮我部署到服务器上"
- 📝 **改文件** — 直接编辑你的代码文件，改完你确认
- 🔍 **搜代码** — 在整个项目里搜索函数、变量、文件

### 和 ChatGPT / Claude 的区别

| | ChatGPT | Claude Code | **MiMo Code** |
|---|---|---|---|
| 模型 | OpenAI GPT | Anthropic Claude | **小米 MiMo** |
| 使用方式 | 网页/App | 终端 CLI | **终端 CLI** |
| 能直接改代码吗 | ❌ 只能复制粘贴 | ✅ | **✅** |
| 能跑命令吗 | ❌ | ✅ | **✅** |
| 中文优化 | 一般 | 一般 | **好** |
| 价格 | $20/月起 | $20/月起 | **¥39/月起** |

---

## 快速开始

### 1. 准备

- [Node.js](https://nodejs.org/) 18 或更高版本
- [Bun](https://bun.sh/) 1.3 或更高版本
- 一个 MiMo Token Plan（[去订阅](https://platform.xiaomimimo.com/#/docs/tokenplan/subscription)）

### 2. 安装

```bash
# 克隆项目
git clone https://github.com/你的用户名/mimo-code.git
cd mimo-code

# 安装依赖
bun install

# 构建
bun run build

# 全局安装
npm link
```

### 3. 配置 API Key

去 [MiMo 订阅管理](https://platform.xiaomimimo.com/#/console/subscription) 获取你的 API Key（`tp-` 开头）。

```bash
# 加到你的 ~/.zshrc 或 ~/.bashrc
export MIMO_API_KEY="tp-你的key"
```

> 详细配置说明（模型选择、集群切换、故障排除等）请参见 [docs/SETUP.md](docs/SETUP.md)

### 4. 使用

```bash
mimo                    # 启动
mimo --version          # 查看版本
mimo -p "写个快速排序"    # 非交互模式，直接输出结果
```

进入后：
- 直接打字提问
- `/model` 切换模型
- `/help` 查看帮助
- `/clear` 清空对话
- `Esc` 两次退出

### 可用模型

| 模型 | 说明 | 适合场景 |
|---|---|---|
| `mimo-v2.5` | 默认模型，快速高效 | 日常编码 |
| `mimo-v2.5-pro` | 旗舰模型，1M 上下文 | 复杂推理、大项目 |
| `mimo-v2-pro` | 上代旗舰 | 兼容旧项目 |
| `mimo-v2-omni` | 多模态 | 图像/视频/音频理解 |

---

## 技术细节

> 以下内容面向开发者和技术贡献者。

### 架构

MiMo Code 基于 [CCB（Claude Code Best）](https://github.com/claude-code-best/claude-code) 改造——一个 Anthropic Claude Code CLI 的开源逆向还原项目。技术栈：

- **语言**：TypeScript
- **终端 UI**：React Ink（React 的终端渲染器）
- **构建**：Bun bundler（code splitting，607 个 chunk）
- **运行时**：Node.js 或 Bun
- **API 协议**：Anthropic Messages API 兼容（MiMo Token Plan 提供）

### 改造范围

在 CCB 基础上做了 6 个层面的改造：

**1. API 层** — 对接 MiMo Token Plan API
- Base URL：`https://token-plan-sgp.xiaomimimo.com/anthropic`
- 认证：`api-key` header（不是 `x-api-key`，不是 `Authorization: Bearer`）
- 模型名：`mimo-v2.5`、`mimo-v2.5-pro` 等（全小写，带点号）

**2. 配置隔离** — 与 Claude Code 完全独立

| 资源 | Claude Code | MiMo Code |
|---|---|---|
| 配置目录 | `~/.claude/` | `~/.mimo/` |
| 缓存 | `~/Library/Caches/claude-cli/` | `~/Library/Caches/mimo-code/` |
| UDS socket | `/tmp/claude-code-socks/` | `/tmp/mimo-code-socks/` |
| Windows pipe | `\\.\pipe\claude-code-*` | `\\.\pipe\mimo-code-*` |
| macOS Keychain | `claude-code-user` | `mimo-code-user` |
| Telemetry | `claude-code` | `mimo-code` |

两个工具可以同时安装、同时使用，互不干扰。

**3. 模型列表** — `/model` 只显示 MiMo 模型，不会出现 Opus/Sonnet/Haiku

**4. 系统提示词** — 针对 MiMo 模型重写身份描述，注入小米宗旨

**5. 品牌 UI** — Logo、主题色（蓝色）、所有用户可见文本

**6. Post-build** — `scripts/post-build-mimo.cjs` 自动修补预编译包中的残留文本

### 关键设计决策

**为什么不直接用 Claude Code + 环境变量？**

虽然可以通过 `ANTHROPIC_BASE_URL` 和 `ANTHROPIC_AUTH_TOKEN` 让 Claude Code 连接 MiMo API，但这种方式有根本性问题：

1. 系统提示词写着 "You are Claude"，模型自我认知混乱
2. `/model` 列表混着 Claude 模型，用户困惑
3. 共享 `~/.claude/` 配置目录，和本地 Claude Code 互相干扰
4. 无法针对 MiMo 模型优化提示词和 UI

**为什么不做一个通用的多模型 CLI？**

1. 每个模型对系统提示词的响应方式不同，通用 prompt 效果打折
2. 配置隔离是刚需，多 profile 管理复杂度高
3. 专属 CLI 可以独立演进，添加模型特有功能
4. `mimo` 比 `claude --model mimo-v2.5-pro` 更简洁

### 环境变量

| 变量 | 说明 | 默认值 |
|---|---|---|
| `MIMO_API_KEY` | MiMo Token Plan API Key | 内置 |
| `MIMO_BASE_URL` | 自定义 API 端点 | `https://token-plan-sgp.xiaomimimo.com/anthropic` |
| `CLAUDE_CONFIG_DIR` | 配置目录（高级） | `~/.mimo` |

### 项目结构

```
src/
├── entrypoints/
│   ├── mimo-bootstrap.ts   # 环境变量隔离（最先执行）
│   └── cli.tsx             # CLI 入口
├── constants/
│   ├── system.ts           # 系统提示词前缀
│   └── prompts.ts          # 完整系统提示词
├── utils/
│   ├── managedEnv.ts       # 环境变量管理（含 MiMo 覆盖）
│   ├── model/
│   │   └── modelOptions.ts # /model 命令的模型列表
│   ├── cachePaths.ts       # 缓存路径（mimo-code）
│   ├── udsMessaging.ts     # UDS socket 路径
│   └── theme.ts            # 主题色定义
├── components/
│   └── LogoV2/
│       └── Clawd.tsx       # MiMo ASCII art logo
scripts/
└── post-build-mimo.cjs     # 构建后自动修补
```

### 构建

```bash
bun run build
# 等价于：bun run build.ts && node scripts/post-build-mimo.cjs
```

构建产物在 `dist/`，入口是 `dist/cli-node.js`（Node）和 `dist/cli-bun.js`（Bun）。

### 开发模式

```bash
bun run dev
# 版本号显示为 1.0.0，说明是开发模式
```

---

## 常见问题

**Q: 和 Claude Code 会冲突吗？**
A: 不会。MiMo Code 使用完全独立的配置目录（`~/.mimo`）、socket 路径、Keychain 条目。两个工具可以同时安装使用。

**Q: 需要 Anthropic 账号吗？**
A: 不需要。只需要 MiMo Token Plan 的 API Key。

**Q: 支持哪些操作系统？**
A: macOS、Linux、Windows（WSL）。

**Q: 模型回答质量怎么样？**
A: MiMo V2.5 Pro 在 SWE-Bench、ClawEval 等编码基准测试中接近 Claude Sonnet 4.6 水平，价格低很多。

**Q: 可以切换到其他集群吗？**
A: 可以。设置 `MIMO_BASE_URL` 环境变量：
- 中国集群：`https://token-plan-cn.xiaomimimo.com/anthropic`
- 新加坡集群：`https://token-plan-sgp.xiaomimimo.com/anthropic`（默认）
- 欧洲集群：`https://token-plan-ams.xiaomimimo.com/anthropic`

---

## 致谢

- [CCB (Claude Code Best)](https://github.com/claude-code-best/claude-code) — 本项目基于 CCB 改造
- [Anthropic](https://www.anthropic.com/) — Claude Code 原始设计
- [Xiaomi MiMo](https://platform.xiaomimimo.com/) — MiMo 大模型平台

## 许可证

本项目仅供学习研究用途。Claude Code 的所有权利归 Anthropic 所有，MiMo 模型的所有权利归小米所有。
