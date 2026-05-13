# MiMo Code 安装与配置指南

## 目录

- [环境要求](#环境要求)
- [安装步骤](#安装步骤)
- [配置 API Key](#配置-api-key)
- [配置模型](#配置模型)
- [配置集群](#配置集群)
- [验证安装](#验证安装)
- [常用命令](#常用命令)
- [高级配置](#高级配置)
- [故障排除](#故障排除)

---

## 环境要求

| 依赖 | 最低版本 | 安装方式 |
|---|---|---|
| Node.js | 18.0+ | [nodejs.org](https://nodejs.org/) |
| Bun | 1.3+ | `curl -fsSL https://bun.sh/install \| bash` |

验证：

```bash
node --version   # v18.0.0+
bun --version    # 1.3.0+
```

---

## 安装步骤

### 1. 克隆项目

```bash
git clone https://github.com/你的用户名/mimo-code.git
cd mimo-code
```

### 2. 安装依赖

```bash
bun install
```

> 如果下载慢，使用国内镜像：`bun install --registry https://registry.npmmirror.com`

### 3. 构建

```bash
bun run build
```

成功输出：

```
Bundled 607 files to dist/
Post-build: patched 5 dist files
```

### 4. 全局安装

```bash
npm link
```

安装后，终端输入 `mimo` 即可启动。如果提示找不到命令，需要将 npm 全局 bin 目录加入 PATH：

```bash
# 查看 npm 全局 bin 目录
npm prefix -g

# 加入 PATH（以 zsh 为例）
echo 'export PATH="$(npm prefix -g)/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

---

## 配置 API Key

MiMo Code 需要小米 MiMo Token Plan 的 API Key 才能使用。

### 第一步：订阅 Token Plan

前往 [MiMo Token Plan](https://platform.xiaomimimo.com/#/docs/tokenplan/subscription) 选择套餐：

| 套餐 | 价格 | Credits/月 |
|---|---|---|
| Lite | ¥39/月 或 $6/月 | 60M |
| Standard | ¥99/月 或 $16/月 | 200M |
| Pro | ¥329/月 或 $50/月 | 700M |
| Max | ¥659/月 或 $100/月 | 1.6B |

### 第二步：获取 API Key

订阅后，前往 [订阅管理](https://platform.xiaomimimo.com/#/console/subscription) 获取 API Key。

格式为 `tp-xxxxx`（Token Plan 专用，与按量付费的 `sk-xxxxx` 不同）。

### 第三步：配置 Key

有三种方式，选一种即可：

#### 方式一：环境变量（推荐）

```bash
# 加到 ~/.zshrc 或 ~/.bashrc
export MIMO_API_KEY="tp-你的key"
```

重启终端生效。

#### 方式二：启动时传入

```bash
MIMO_API_KEY="tp-你的key" mimo
```

#### 方式三：写入配置文件

编辑 `~/.mimo/settings.json`（首次运行 `mimo` 后自动创建）：

```json
{
  "env": {
    "MIMO_API_KEY": "tp-你的key"
  }
}
```

---

## 配置模型

### 默认模型

MiMo Code 默认使用 `mimo-v2.5` 模型。无需额外配置。

### 切换模型

**运行时切换**：在 MiMo Code 中输入 `/model`，选择模型：

```
1. Default (recommended)   MiMo V2.5
2. MiMo V2.5              256K context · Best for everyday coding
3. MiMo V2.5 Pro          1M context · Most capable for complex reasoning
4. MiMo V2 Pro            Previous generation flagship
5. MiMo V2 Omni           Multimodal: image, video, audio
```

**启动时指定**：

```bash
mimo --model mimo-v2.5-pro
```

### 可用模型

| 模型名称 | API 名称 | 上下文窗口 | Credit 倍率 | 适合场景 |
|---|---|---|---|---|
| MiMo V2.5 | `mimo-v2.5` | 256K | 1x | 日常编码、快速问答 |
| MiMo V2.5 Pro | `mimo-v2.5-pro` | 1M | 2x | 复杂推理、大型项目 |
| MiMo V2 Pro | `mimo-v2-pro` | 1M | 2x | 上代旗舰，兼容旧项目 |
| MiMo V2 Omni | `mimo-v2-omni` | - | 1x | 图像/视频/音频理解 |

> 注意：模型名称区分大小写，API 调用时使用全小写带点号的格式（如 `mimo-v2.5-pro`）。

### 修改默认模型

编辑 `src/entrypoints/mimo-bootstrap.ts`：

```typescript
// 修改这些行来更改默认模型
process.env.ANTHROPIC_DEFAULT_SONNET_MODEL = 'mimo-v2.5'      // 默认模型
process.env.ANTHROPIC_DEFAULT_OPUS_MODEL = 'mimo-v2.5-pro'    // 高级模型
```

修改后需要重新构建：`bun run build`

---

## 配置集群

MiMo Token Plan 提供三个集群，默认使用新加坡集群。

| 集群 | Base URL | 适合地区 |
|---|---|---|
| 新加坡（默认） | `https://token-plan-sgp.xiaomimimo.com/anthropic` | 全球 |
| 中国 | `https://token-plan-cn.xiaomimimo.com/anthropic` | 中国大陆 |
| 欧洲 | `https://token-plan-ams.xiaomimimo.com/anthropic` | 欧洲 |

### 切换集群

```bash
# 环境变量方式
export MIMO_BASE_URL="https://token-plan-cn.xiaomimimo.com/anthropic"

# 或启动时传入
MIMO_BASE_URL="https://token-plan-cn.xiaomimimo.com/anthropic" mimo
```

如需永久修改默认集群，编辑 `src/entrypoints/mimo-bootstrap.ts` 中的 `ANTHROPIC_BASE_URL` 行，然后重新构建。

---

## 验证安装

```bash
# 1. 检查版本
mimo --version
# 输出: 1.0.0 (MiMo Code)

# 2. 启动并测试
mimo

# 3. 在 MiMo Code 中输入
❯ 你好

# 4. 检查模型
❯ /model

# 5. 检查状态
❯ /status
```

---

## 常用命令

### 启动方式

```bash
mimo                          # 交互模式
mimo -p "写个快速排序"          # 非交互模式，输出后退出
mimo --model mimo-v2.5-pro    # 指定模型启动
mimo -c                       # 继续上次对话
```

### 会话内命令

| 命令 | 说明 |
|---|---|
| `/model` | 切换模型 |
| `/help` | 查看帮助 |
| `/clear` | 清空对话 |
| `/compact` | 压缩上下文（对话太长时用） |
| `/status` | 查看当前配置状态 |
| `/cost` | 查看本次会话消耗 |
| `/plan` | 进入规划模式（只分析不改代码） |
| `/config` | 打开配置菜单 |
| `Esc` × 2 | 退出 |

### 快捷键

| 快捷键 | 说明 |
|---|---|
| `Enter` | 发送消息 |
| `Shift+Tab` | 切换 Plan/Act 模式 |
| `Ctrl+C` | 中断当前操作 |
| `↑` / `↓` | 浏览历史消息 |

---

## 高级配置

### 环境变量一览

| 变量 | 说明 | 默认值 |
|---|---|---|
| `MIMO_API_KEY` | Token Plan API Key | （必填） |
| `MIMO_BASE_URL` | API 端点 | `https://token-plan-sgp.xiaomimimo.com/anthropic` |
| `API_TIMEOUT_MS` | API 超时时间（毫秒） | `3000000` |

### 配置文件

MiMo Code 的配置存储在 `~/.mimo/` 目录下（与 Claude Code 的 `~/.claude/` 完全独立）：

```
~/.mimo/
├── .claude.json      # 全局配置（启动次数、迁移状态等）
├── settings.json     # 用户设置（可选，手动创建）
├── sessions/         # 会话历史
├── plugins/          # 插件
└── backups/          # 配置备份
```

### 与 Claude Code 共存

MiMo Code 和 Claude Code 可以同时安装，互不干扰：

- `claude` 命令 → Claude Code → `~/.claude/`
- `mimo` 命令 → MiMo Code → `~/.mimo/`

两者的 socket、keychain、缓存、telemetry 路径全部独立。

---

## 故障排除

### MIMO_API_KEY not set

```
⚠ MIMO_API_KEY not set. Run with MIMO_API_KEY=tp-xxx mimo, or see docs/SETUP.md
```

**解决**：设置环境变量 `export MIMO_API_KEY="tp-你的key"`，参见 [配置 API Key](#配置-api-key)。

### 401 Invalid API Key

```
API Error: 401 {"error":{"message":"Invalid API Key"}}
```

**可能原因**：
1. Key 格式错误 — Token Plan key 以 `tp-` 开头，不是 `sk-`
2. Key 已过期 — 去 [订阅管理](https://platform.xiaomimimo.com/#/console/subscription) 检查
3. 集群不对 — 尝试切换集群（参见 [配置集群](#配置集群)）

### 400 Not supported model

```
API Error: 400 {"error":{"message":"Not supported model xxx"}}
```

**解决**：模型名必须全小写带点号，如 `mimo-v2.5-pro`，不是 `MiMo-V2.5-Pro`。

### bun install 卡住

**解决**：使用国内镜像 `bun install --registry https://registry.npmmirror.com`

### Auth conflict 警告

```
⚠ Auth conflict: Both a token and an API key are set
```

**解决**：MiMo Code 会自动处理。如果仍然出现，检查 `~/.mimo/settings.json` 中是否有残留的 `ANTHROPIC_API_KEY`，删除即可。

### 找不到 mimo 命令

**解决**：将 npm 全局 bin 目录加入 PATH：

```bash
echo 'export PATH="$(npm prefix -g)/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```
