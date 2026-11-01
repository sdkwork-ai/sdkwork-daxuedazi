# BirdCoder 更新日志

本文件只记录**当前版本**——`##` 标题就是本次发布打的 tag，不累积历史版本条目；往期条目随各自版本的提交保留在 git 历史里（`git log -p CHANGELOG.md`）。「上游变更」逐字摘自上游该 release 的官方 Release notes（中文部分，英文版见各 Release 页面）；「BirdCoder 本地修改」记录 fork 在该版本上的自有变更（SDKWork 组件、品牌、打包与部署等），不受上游发布节奏影响。

## 0.2.2-alpha.4（上游发布 2026-11-02，本地同步 2026-11-02）

Fork 同步：merge `upstream/main`（`82ff44c26aa`）到本地 `main`，窗口 `d3d3b1a4aa..82ff44c26aa`，382 个上游提交、2519 个文件（合并前差量 +111420 / −27318）。本次为真实双亲合并提交（`git merge --no-ff`，非 squash / rebase / cherry-pick），上游提交的作者、日期、commit message 与代码注释原样进入历史。上游 Release：[v0.2.2-alpha.4](https://github.com/sdkwork-ai/sdkwork-birdcoder2/releases/tag/birdcoder-v0.2.2-alpha.4)。合并裁决保留 fork 自有 SDKWork 组件、学伴AI 品牌资产与「当前版本 changelog」策略；环境、凭据与打包口径取 upstream 最新实现。

本版本打在 `birdcoder-v0.2.2-alpha.3`（`e5a6ba8640`）之后：包含该 tag 之后到 `a7b478f0b2` 的全部 fork 自有变更——IAM 账号模型供给、persona 账号资料、内置 MCP 连接器与技能市场插件、打包凭据投影修复，以及本轮同步带入的上游 `apply_patch`、可扩展右键菜单、Forge 评审、CUA 按需投递、SDK 原生命令、独立 Schedule 任务等能力；`plugins/dsh-im` 前进到 `dd500d24`（v5.9.1）。

### 上游变更

#### 新增功能

* **`apply_patch` 工具链**：新增纯解析器、按序补丁预检与执行、LF 规范化、受保护的删除/移动、补丁根缓存与工作区变更全路径捕获；Web 标准预设默认开启，`dsh-base` 可 opt-in。
* **可扩展右键菜单**：资源动作与共享弹窗生命周期、工作区/目录上下文菜单、键盘快捷键展示，客户端菜单统一走 `context-menu` 容器。
* **Forge 工作树与评审**：文件树、内联评审评论、diff 文件横向方向键导航、按 PR 按需加载检查、会话列表状态恢复、Git 检查遵循会话权限。
* **CUA 桌面投递**：经公证的 helper 通过按需插件安装下发、复用已校验的打包产物、macOS helper 独立权限身份与权限引导、启动诊断保留。
* **SDK 能力对齐**：原生 goal / plan / permission / compact slash 命令、内容块与原生命令统一走 `run`、插件管理与 Desktop 工具对齐。
* **独立 Schedule 任务**接入 WebUI，并新增基于目标（target）的调度契约、硬删除与有界历史、分数 Proxy 索引调度。
* **Trajectory**：子调用折叠、`run_code` 语法高亮、失败输出展示、窄面板折叠控件可用。
* **LLM**：插件可为 pi-ai 请求准备请求头。
* **Pad 应用族与客户端页面注册表**（`fb38f66cef`）：新增 `apps/sdkwork-birdcoder2-pad`、插件市场生成器与桌面端信任链。

#### 体验优化

* 侧栏按分栏保留文件树、文件菜单可在侧栏或浮窗中打开并移动已有标签；标签闪烁与柔光反馈、停靠展开和焦点交接修正。
* 手机/平板侧栏改为抽屉导航，修正标题栏布局、macOS 抽屉拖拽与关闭热区、窄屏导航与页面对齐。
* 轨迹与设置页窄屏布局、模型目录输入框、插件发现页工具栏溢出修复。
* 插件安装失败时保留步骤与完整日志，诊断信息流式显示，授权与重试选项明确。

#### 问题修复

* 修复工作区变更、文件菜单、会话恢复后的右键菜单焦点与刷新图片上下文丢失。
* 修复 `apply_patch` 观察策略与删除/移动守卫、可选参数歧义、跨行补丁与路径规范化。
* 修复 Web Worker 实时导入绑定、客户端模块枚举失败隔离、移动端标题与抽屉回归。
* 修复 release/packaging 车道：容器车道不再要求 npm 解析仓库内 `dsh-better-sidebar`，markets 客户端 bundle 跟上发布车道兄弟仓布局，Wine heap 与发布工作流测试修复。
* 修复 fork 自有 spec 与 context-menu 契约、inject 类型收窄，Pad 应用族补齐 `@sdkwork` 路径映射。

#### 其他变更

* 上游 release 提交 `release(dsh): 0.2.2-alpha.3`、`chore(release): 0.2.2-alpha.4` 进入历史，版本、SDKWork pins 与文档同步推进。
* 17 个 sdkwork 兄弟仓 pin 前进到各自 `origin/main`；`plugins/dsh-im` 前进至 v5.9.1，`dsh-better-sidebar` 前进至 dev `bd6cfa5`。
* 文档、i18n 与架构笔记补齐（context-menu、standalone schedules、OEM brand home、review/prose 规范等）。

### BirdCoder 本地修改

#### 功能

* **IAM 账号模型供给（birdcoder-account）**：新增 `packages/credentials/birdcoder-account` 凭据包——按账号维度供给模型访问，配套插件注册、设置集成与运行时单测；`apps/desktop` 侧补齐 IAM 深链与会话协议（`iam-deep-links.ts`、`iam-session.ts`、`iam-preload.ts`），桌面主进程、preload 菜单与平台抽象跟进。
* **persona 账号资料与角色个性化**：persona 角色与兴趣个性化进入客户端，账号资料面与 IAM 运行时打通（`iam-runtime` 的 token 存储同步、persona profile 读写复用同一传输层，不建第二套 client）。
* **内置 MCP 连接器**：`plugins/dsh-mcp-connector`（v0.2.92，自带 `lib/` 构建产物）作为 submodule 进入 fork，内置连接器面接入。
* **技能市场插件接入 skills 页签**：`plugins/dsh-skill-market`（v2.0.7）作为 submodule 进入，skills 页签内嵌技能市场。
* **Linux 桌面标题栏（caption）单实例绘制**（`30f9f2e46c`）：Linux 平台由主进程统一绘制单一桌面 caption，`preload-platform`/`preload-windows`/`update-overlay`/welcome 窗口跟进平台化抽象，配套测试更新。
* **relay 模型改从 SDKWork 目录中继**：新增 `scripts/generate-sdkwork-relay-models.mjs`，`llm-pi-ai` 的 `relay-models.generated.ts` 改由 SDKWork 模型目录生成。

#### 修复

* **打包凭据投影**（`f88df427dc`）：打包只投影已配置的 SDKWork 凭据，按分发类别（`deployment` / `public`）决定是否携带，不再在打包窗口内顺手签发令牌。
* **引导凭据私有化**（`62cbdce890`）：bootstrap 凭据收进用户私有 bundle，不再落在检出目录。
* **签名缓存 fixture 隔离**（`48ee68039a`）：把签名缓存 fixture 移出检出目录，避免打包窗口内检出被污染。
* **菜单快照跟上 BirdCoder 产品名**（`0117f15874`）。

#### 环境与凭据

* **引导令牌私有化**（`45d4f46556`）：`sdkwork-env-bootstrap` 的 bootstrap token 从仓库 overlay 迁到用户私有凭据包 `~/.sdkwork/<application-code>/credentials/<profile-id>.json`，`env:token:ensure` 与启动流程只读取该 bundle；旧 `.env.*.local` 组合名退化为只读忽略项。
* **宿主 PostgreSQL 配置**（`f63f7d6b50`）：`.env.postgres.example` 迁为受跟踪的 `config/host/postgres.env.example`，本地 profile 落 `config/host/postgres.env`（gitignore）。
* **桌面打包设置**（`57484bf714`）：打包环境文件统一到 `apps/desktop/packaging/<platform>.env`，模板同目录，不再使用组合式 `.env.<platform>` 名称。
* **环境命名治理**（`80e0220b42`、`b1f6c59b15`、`79563944a8`、`edbb383b80`）：同步工作区改动，补齐已退役环境名的分类器测试、凭据包提示与忽略清单说明。

#### 品牌与合并策略

* **品牌资产刷新**（`13a415da35`）：更新桌面图标、安装器品牌图、欢迎页与托盘图标；显示品牌保持 **学伴AI**，应用标识、协议与 IAM 客户端保持 `birdcoder`。
* **合并保留面**：本次 merge 不覆盖 fork 的 SDKWork 组件（`packages/client/ui-sdkwork-*` 等）、品牌文案与 changelog 的「仅当前版本」策略；上游对 `ui-sdkwork-demand-hall` 的组件收敛按上游提交跟随（`DemandHallAction` 移除、`index.ts` 与测试更新）。
* **冲突裁决**：26 个冲突文件逐项处理——环境/凭据/打包代码取 upstream 最新实现（`sdkwork-env-bootstrap`、桌面打包脚本与测试、`config/host/postgres.env.example`、`scripts/sdkwork-app-bootstrap.mjs`）；文档与品牌文案（`AGENTS.md` OEM 段、`apps/README.md`、打包 README 双语）保留当前仓库的 学伴AI 口径并叠加 upstream 新增段落；`.gitignore` 合并上游新条目并保留 fork 的 `config/host/postgres.env.local`。

#### 依赖与版本

* `plugins/dsh-im`：`4ef05eb`（v5.9.0+10）→ `dd500d24`（v5.9.1）——DS Bot 绑定模型变更后默认推理档位上报修复、提示词交接去重、Telegram 动作卡 429 重试与共享按钮文案净化、非 IM 轮次投递到绑定会话、DS Bot 会话同步回复去重（自带重建后的包产物）。
* `plugins/dsh-better-sidebar` 维持 dev `bd6cfa5`、`plugins/dsh-skill-market` 维持 `4cda930`（v2.0.7）、`plugins/dsh-mcp-connector` 维持 `0aaf140`（v0.2.92），均已是各自跟踪分支的最新提交。
* SDKWork 发布车道依赖维持 `scripts/sdkwork-sources.manifest.json` 与 `agent.workflow.json` 的双记录 pin（本地相对路径工作区、发布按 pin 克隆 git 仓库）。
* 版本号同步推进到 `0.2.2-alpha.4`（450 个 released manifest，`verify-version-sync` 通过）。
