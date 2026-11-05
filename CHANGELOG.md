# BirdCoder 更新日志

本文件只记录**当前版本**——`##` 标题就是本次发布打的 tag，不累积历史版本条目；往期条目随各自版本的提交保留在 git 历史里（`git log -p CHANGELOG.md`）。「上游变更」逐字摘自上游该 release 的官方 Release notes（中文部分，英文版见各 Release 页面）；上游尚未发布 Release notes 时，按该 tag 内的实际提交归纳并注明来源。「BirdCoder 本地修改」记录 fork 在该版本上的自有变更（SDKWork 组件、品牌、打包与部署等），不受上游发布节奏影响。

## 0.2.2-rc.2（fork 发布 2026-11-05）

本版本完成两件事：一是把上游 `sdkwork-birdcoder2` `82bb8a137d..2f68255a1b` 的 3 个最新提交（IAM 内置登录链接与持久桌面会话、36 个兄弟仓 pin 前进、`dsh-mcp-connector` pin 到 v0.2.94）通过 `git merge upstream/main --no-ff` 合入 `main`——真实双亲合并提交 `c4204db`，上游作者、日期、commit message 与代码注释原样进入历史；二是全量文档对齐，把中英配对门禁拉到全绿。版本号从 `0.2.2-rc.1` 统一到 `0.2.2-rc.2`。冲突一律 fork-first 解决——SDKWork 组件、学伴AI 品牌与发布车道不被上游覆盖。

### 上游变更

* **登录与桌面端**：产品登录入口在「浏览器交接」状态下新增「内置弹窗登录」安静操作（`IamService.usesBrowserHandoff()` 单一判据控制可见性，复用共享 `LoginPanel` 排版）；桌面端 IAM 会话文件（`<DSH_HOME>/iam/session.json`)在系统提供密文存储（Electron `safeStorage`：DPAPI / Keychain / libsecret）时整体加密落盘，写入仍是临时文件 + 原子改名 + `0600`；IAM 回调（deep link）落到正在运行的工作区时把它带到前台；开发运行打开的独立 Renderer DevTools 重新贴回产品图标，Windows 任务栏分组不再退化成 `electron.exe` 默认图标。
* **依赖与打包**：36 个 SDKWork 兄弟仓 pin 整体前进到各自当前 `origin/main`；`plugins/dsh-mcp-connector` 子模块跟到 `v0.2.94`（`2057af5`，release 提交，只抬版本号与启动期工具发现，peer 与依赖集合未变）。

### BirdCoder 本地修改

#### 合并与冲突解决（fork-first）

* 10 个冲突全部按 fork 优先落地：`CHANGELOG.md`（fork 自有条目 + 上游新增条目取并集）、`agent.workflow.json` 与 `sdkwork-sources.manifest.json`（兄弟仓 pin 取上游更新的 ref）、`main.ts`（保留 fork 的 `resolveApplicationIcon` OEM 启动图标导入）、`welcome-window.ts` 与 `devtools-icon.ts`（保留 fork 的 AGENTS.md 注释引用）、`iam-deep-links.spec.ts`（保留 `daxuedazi://` scheme）、`iam-session.spec.ts`（采纳上游注释）、`ui-sdkwork-iam` 三份 README（保留 fork 文本，与 upstream 语义一致仅品牌改名）；无源码功能冲突、无文件删除。

#### 合并正确性回归（merge-tree 重算）

* 用 `git merge-tree` 无副作用重算合并，重算树与实际合并提交树的差异恰好是那 11 个手工裁决的冲突文件，其余 33 个自动合并文件与 git 自身合并算法逐字节一致——合并过程无误判。
* 上游窗口 44 个改动文件中 32 个与 upstream 逐字节一致；12 个有差异的全部为 fork 有意分歧（`daxuedazi://` scheme 改名、OEM 启动图标、学伴AI 品牌与 OemUiConfig 商城开关、CHANGELOG 并集），排除改名因素后零内容性分歧。
* 合并相对两个父提交的删除均为空（`git diff --diff-filter=D` 双向 0），无文件误删；品牌契约逐项复验通过（`FishLogo` 仅在 ui-primitives、`BirdLogo`/`BirdWordmark`/`LoginPanel` 落点正确、`createBootBrand()` 接管启动页、IAM 深链 scheme 保持 `daxuedazi://auth/callback`）。

#### 文档配对全量对齐（1418 对全绿）

* 修复约 75 个合并前遗留的中英配对违规（合并零引入，已逐一验证不在合并窗口内）：16 对双侧同变者重录哈希；`ui-sdkwork-common-app-header` en 侧镜像 fork 的 Plugins 侧栏改名；`ui-theme` zh 侧补第九张样式表 `sdkwork-host-surface.css`；`apiproxy` 移除已上游删除的 remote-event 笔记死链；`sdkwork-builtin-skills` 修正 `skill-badge` 链接到 `packages/experimental`；两个 `template-install` 包 zh 侧补 `## 模型体验` 章节；根 `README.zh.md` 补桌面安装、容器部署、运行导语、应用根目录、仓库类型共 5 个缺失部分并把过期 clone URL 改指 fork；新增 `plugins/README.zh.md` 全文翻译（含语言切换器）。
* 配对治理：manifest 排除 `apps/sdkwork-birdcoder2-pad`（对齐其他兄弟应用口径）与 3 个插件子模块目录（外部仓库，本仓只读）；`dist/` 不排除，保留其重录配对。终态 `verify-translation-pairing` 报告 **1418 对全部一致**。

#### 依赖与版本

* 450 个发布清单版本从 `0.2.2-rc.1` 统一到 `0.2.2-rc.2`（`verify-version-sync` 报告一致），家族所有成员同版本，`pack-local-packages` 的版本校验在打包前即满足。
* `plugins/dsh-better-sidebar` 子模块跟到 `v0.30.1`（`0b6293f`）：settings 导航图标改走宿主插槽消除双图标；peer（`^0.2.2-rc.1`）与依赖集合未变，锁文件无需改动。其余三个子模块已在最新 release 处：`dsh-im` v5.10.0、`dsh-mcp-connector` v0.2.94、`dsh-skill-market` v2.0.7。
* 外部依赖遵循 sdkwork-specs 管理规范：本地开发由 `pnpm-workspace.yaml` 以 `../sdkwork-*` 相对路径解析兄弟仓（跟踪各自 `main`），发布车道由 `scripts/sdkwork-sources.manifest.json` 的 pin 克隆同名兄弟仓，两条 pin 记录（manifest 与 `agent.workflow.json`）逐字一致，`verify-sdkwork-dependencies` 校验通过。
* 容器部署的安装期配置延续上一版的环境变量可覆盖设计：`DSH_WEB_PORT` 同时决定容器内监听端口与发布端口（健康检查读同一变量），`DSH_PUBLISH_HOST`/`DSH_PUBLISH_PORT` 调整宿主机侧，`DSH_DATA_DIR`/`DSH_WORKSPACE_DIR` 把 `/data`、`/workspace` 改为绑定挂载；`verify-container` 逐项断言，`release:verify-container-bundle` 在发布包上复核同一套定义。

### 校验

* 上游 3 个提交全部落地（`git rev-list --count HEAD..upstream/main` 为 0），`sdkwork-*` 包与 `ui-sdkwork-*` 目录无删除。
* 三个子模块均在各自上游最新处（`dsh-better-sidebar` v0.30.1、`dsh-im` v5.10.0、`dsh-mcp-connector` v0.2.94、`dsh-skill-market` v2.0.7）。
* 版本线复验：`verify-version-sync` 报告 450 个发布清单携带 `0.2.2-rc.2`。
* 文档配对复验：`verify-translation-pairing` 全量 1418 对一致。
