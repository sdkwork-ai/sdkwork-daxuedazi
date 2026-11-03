# BirdCoder 更新日志

本文件只记录**当前版本**——`##` 标题就是本次发布打的 tag，不累积历史版本条目；往期条目随各自版本的提交保留在 git 历史里（`git log -p CHANGELOG.md`）。「上游变更」逐字摘自上游该 release 的官方 Release notes（中文部分，英文版见各 Release 页面）；「BirdCoder 本地修改」记录 fork 在该版本上的自有变更（SDKWork 组件、品牌、打包与部署等），不受上游发布节奏影响。

## 0.2.2-alpha.7（fork 发布 2026-11-04，本地同步 2026-11-04）

本版本打在 `birdcoder-v0.2.2-alpha.6`（`0f94a4dc9a`）之后。本地执行 `git merge upstream/main --no-ff`，把 `de5cdae77f`..`636cfbbc86` 的 696 个上游提交合入 `main`——真实双亲合并提交，上游作者、日期、commit message 与代码注释原样进入历史。窗口主体是 `7558dfeaa6`：上游 `deepseek-harness` `master` 前进到 `8bd073392e`（tag `dsh-v0.2.2-alpha.3`）的 666 个提交；其后是 `0.2.2-alpha.6` 与 `0.2.2-alpha.7` 两次 fork 发布（左侧栏滚动交接、面板启动器、客户端 inspect 清单与 Host 代次时序、网关精确路由 404 直通、变更摘要空内容、SDKWork pin 前进），以及 `alpha.7` 之后的需求大厅入口与客户端测试类型修复。

合并裁决：fork 自有 SDKWork 组件、OEM 品牌身份（学伴AI）与桌面壳用户可见文案保持 fork 版本；上游结构性改名（`packages/experimental/{agent-team,tool-agent-team,client-ui-agent-team,agent-team-profile}` → `packages/team/*` 与 `packages/client/ui-agent-team`）与 exa / perplexity 两个搜索行的下线随上游采纳。按「只记当前版本」策略，窗口内的上游 `alpha.6`、`alpha.7` 两段内容并入本小节，`alpha.5` 及更早条目随各自提交保留在 git 历史里。

### 上游变更（`dsh-v0.2.2-alpha.3`）

以下逐字摘自上游 `dsh-v0.2.2-alpha.3` 的官方 Release notes（中文部分，英文版见该 Release 页面）。

#### 新增功能

* 支持统一右键与键盘菜单，覆盖会话、工作区和侧边栏，并支持开发者扩展 @std4453
* 文件预览支持常驻目录树和文件定位功能。 @yudshj
* 实验性「变更请求与工作树」统一代码审查与工作树入口，支持通过可搜索文件树和逐文件导航查看本地及 PR 差异，将选中代码和评论交给 Agent，并跟踪检查与评审状态。 @LegGasai

#### 体验优化

* 改善手机端侧栏导航与窄屏布局，保持会话标题稳定，并让模型目录输入和插件发现页操作完整可见。 @Stevring @Saafo @EricMoin
* 菜单和浮窗优先保持在可见区域内，跟随浏览器缩放、平移和软键盘变化。 @Stevring
* Trajectory 支持独立折叠子调用，保留父调用和摘要；搜索或跨视图定位时可展开对应子调用。 @kermanx
* 优化对话中思考内容的展示，摘要、展开正文和翻译不再显示模型输出开头的签名前缀。 @LegGasai
* 减少会话状态更新时的重复发布和目录处理开销，并降低长回复流式组装的运行时成本。 @liukx0205 @imccyu
* 改善底部输入框的布局稳定性，减少输入、菜单展开和统计更新时的跳动。 @imccyu

#### 问题修复

* 通过 pi-ai 接入的模型在会话图片超过请求数量上限时，自动省略最早的图片并继续请求，避免持续失败。 @turtle2099
* 修复 OpenCode 路由下自动审核在工具执行前失败的问题，审查请求携带对应会话的身份和用途。 @LegGasai
* 修复 alpha.2 引入的空会话恢复后被当作「未命名」会话持续显示的问题，并恢复按最后提示时间排序。 @imccyu
* 修复包含旧版子代理描述的历史会话无法打开，并导致会话搜索失败的问题。 @turtle2099
* 修复加载更早的已压缩会话历史后，聊天记录停止加载和更新的问题。 @turtle2099
* 聊天中的 Markdown 文件链接容忍无效行号，并支持行范围及行列后缀；无法定位时仍打开原文件，URL 保持为网页链接。 @kermanx
* 文本和 Markdown 文件预览在刷新后保留阅读位置，文件暂时变短时也保留原位置，避免跳回第一页。 @yudshj
* Trajectory 保留失败工具实际返回的文本，列表、详情和复制不再用合成错误信息替换它；原生工具和嵌套 PTC 调用使用相同规则。 @kermanx
* 修复部分历史 `run_code` 记录的代码页缺少 TypeScript 或 Python 语法高亮的问题。 @kermanx
* 打开既有定时任务时显示对应的日期、时间、间隔与星期控件，并按字段给出纠正提示；仅修改名称或指令时保留计时规则，超出控件精度的复杂规则保留原始文本。 @Magolor

#### 其他变更

* 同步 Cordis Core 至 4.0.0-rc.11、Loader 至 1.0.0-rc.8、Include 至 1.1.1，统一配置访问、条目变更和持久化行为。 @shigma @imccyu
* pi-ai 支持插件按会话和请求用途提供动态请求头；无效请求头在请求发出前报错。 @LegGasai
* 插件可为自己的设置页面提供导航图标，卸载后恢复默认图标。 @Magolor
* 插件安装失败时显示完整诊断与 Host 日志入口，并区分安装失败和安装后启用失败。 @kermanx
* 「Git 工作树」入口已合入「变更请求与工作树」，此前启用独立插件的用户需手动从 profile 的 dsh.profile.bundles 中移除 @deepseek-ai/dsh-experimental-tool-worktree
* 「自动化任务」改为统一的宿主级管理，支持手动创建、直接编辑和通过预填提示在会话中创建，保留编辑草稿并支持冲突复核，可选择复用或新建会话执行任务。 @ZiyaZhang @Magolor
* 新增默认关闭的 `apply_patch` 工具，一次完成多文件新增、编辑、删除和移动，并在 Review 中查看变更。 @sjw1231 @CreatixChu
* TypeScript 与 Python SDK 补齐原生命令和插件管理能力，支持计划审阅、目标续跑与操作审批；插件变更重启后生效。 @LogosVeritas @koalazf99
* macOS Computer Use 改用独立应用申请系统权限，打开对应系统设置并提供应用拖入引导，返回后刷新权限状态。 @CreatixChu
* 文件修改的先读和外部修改防护默认关闭，沙箱限制和 Review 保持不变；需要原防护的 profile 可显式恢复观察策略。 @sjw1231
* 回退 alpha.2 中引入的跨行 `$$` 数学块的不稳定兼容解析。 @yudshj

### 问题修复

* 左侧栏会话列表在滚动分页的交接处不再丢位置：滚动位置、加载哨兵与列表重排之间改为显式的滚动交接，切到别的页面再回来仍停在原处，窄屏与宽屏共用同一套交接逻辑。
* 面板启动器不会再被「更多」菜单吞掉：当没有可取消固定的菜单、也就没有任何入口能把启动器放回来时，启动器保持直接列出。
* 客户端 inspect 清单改为等 Host 代次就绪后再发布：Host 尚未产出代次时清单先挂起，不再注册到上一个代次，避免重启 Host 后读到过期条目。
* 网关不再把精确路由自己的 404 当成回落信号：路由声明了精确匹配且自身返回 404 时直接透传该响应，只有网关未命中才走回落。
* 变更请求没有登记摘要时，变更摘要视图回答「无内容」而不是抛错；打开变更（present-open）按同一口径处理空摘要。

### 测试与文档

* 左侧栏滚动交接、inspect 清单代次、网关 404 直通与变更摘要空内容各自补齐契约测试；侧栏视口 spec 去掉与滚动交接重复的断言。
* sdkwork 选择器组合的 Host 测试补上 Connection 信任策略，使组合测试与真实装配一致。
* 左侧栏 README（中英双语与配对记录）同步到新的滚动交接行为。

### 依赖与发布

* 阻塞发布的根因是依赖 pin 落后，不是代码缺陷：`scripts/sdkwork-sources.manifest.json` 里 `sdkwork-appbase` 的 pin 停在 `2a44105f`（该提交的 `sdkwork-appbase-pc-react` 不声明 `@sdkwork/appbase-component-core`），而锁文件按已含该依赖的新树生成，于是发布车道克隆出的旧树在 `Install (immutable)` 上报 `ERR_PNPM_OUTDATED_LOCKFILE`。本版本把 36 个 SDKWork 兄弟仓 pin 一次性前进到各自已推送的 `origin/main`（`sdkwork-appbase` → `1fc30502`），两条 pin 记录逐字一致；锁文件与全部 pin 的 652 个 importer 重新对账为零失配，因此锁文件本身无需改动。
* `plugins/dsh-im` 子模块跟到 `v5.10.0`（`c826bfa4`）。

### BirdCoder 本地修改

#### 功能

* **OEM 品牌身份完整落地与 CLI 启动器改名**（`252d404ca9`）：`brand-manifest` 驱动的 OEM 品牌身份落地（桌面产物名按品牌 `desktop.artifactPrefix` 拼写），CLI 启动器随品牌改名；`package-target.ts` 保留 `resolveBrand` 装配路径。
* **品牌资产与桌面壳文案保持 fork 版本**：`apps/web/public/favicon.png` 单一母本生成全平台图标、安装器品牌图与欢迎窗锁标，`BirdLogo` / `BirdWordmark` 承担侧栏、官方品牌位与空态的品牌渲染，文档站 nav 仍是 `dsh-mark` 鸟标；桌面壳用户可见文案不随上游合并回退。
* **SDKWork 命名契约**：fork 新增面一律落在 `@deepseek-ai/dsh-client-ui-sdkwork-*` / `@deepseek-ai/dsh-sdkwork-*` 与同名 `sdkwork-*` 目录，上游 `ui-*` 与普通包名保持上游语义。
* **分层拓扑环境档位重物化**（`a3ac949250`，与上游 `ebd9468d26` 同源）：仓库根 `.env.cloud.*`、`.env.standalone.*` 与 `etc/topology/*.env`，以及 h5/pad/mini-program/flutter-mobile 四个应用族的环境面按 sdkwork-specs 的分层拓扑标准重新生成，cloud 为默认、standalone 保留为显式变体。

#### 问题修复

* **H5 选中页签字形**（`91cacc287d`）：修复 H5 端选中页签的字形填充。
* **Flutter TLS trust bootstrap 测试**（`cadc4388a5`）：补齐 Flutter 引导的 TLS 信任链测试。
* **CI 容器磁盘**（`67c512d9c7`）：容器打包车道把 Docker data-root 迁到 runner 大容量临时盘，`prebuilt` 上下文改为硬链接复制，避免 BuildKit 快照写满根盘。

#### 合并调整

* 本次合并 2855 个文件变更、仅 2 个冲突：`CHANGELOG.md` 按 fork「只记当前版本」策略把上游 `alpha.6`/`alpha.7` 两段内容并入当前小节；`apps/desktop/README.i18n.yaml` 的双语配对哈希按合并后的中英正文重新记录。
* 上游删除 111 个文件（`packages/experimental/{agent-team,agent-team-profile,tool-agent-team,client-ui-agent-team}`、`web-search-exa`、`web-search-perplexity`、`subagent/src/internal.ts` 与若干 notes/fixtures）：fork 未自用这些面，跟随上游删除；工作区没有 `sdkwork-*` 包被删除。
* 上游包路径搬迁（`packages/team/*`、`packages/client/ui-agent-team`）与本 fork 的 `packages/client/ui-sdkwork-*` 互不重叠，命名契约不受影响。
