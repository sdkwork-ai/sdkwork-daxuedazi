# Agent Note: The startup icon is explicit product identity, not OEM copy

Status: implemented

[English](2026-11-05-oem-startup-icon.md) | 中文

## Problem

桌面启动后显示的第一个表面是欢迎窗口，但它没有显式 `icon`，只有稍后创建的主窗口传入生成的位图；macOS 在未打包运行时 Dock 图标、Windows 的 AppUserModelID 也都交给平台默认值。同时 OEM 配置会接受未知字段，部署可以写入 `brand.icon` / `ui.icon` 期望换图，而运行期从不会替换图片。结果是用户启动时看到的图标取决于平台、外壳打包方式以及 profile 里碰巧写了什么，而不是唯一的产品标志。

## Decision

启动图标只从 `apps/desktop/build/icon.png` 解析（`resolveApplicationIcon`），`resolveWindowIcon` 保留 macOS 使用 bundle 图标的规则。外壳在未打包的 macOS 运行中设置 Dock 图像，在 Windows 上用所选品牌的 AppUserModelID 让运行进程与已安装快捷方式共享任务栏身份，并让欢迎窗口与主窗口拿到同一个显式图标。打包为 macOS、Windows、Linux 目标以及安装器图标命名同一批位图。`brand.icon` 与 `ui.icon` 在 OEM 配置加载时被拒绝：需要更换标志的部署应在构建中替换生成的位图。

`verify-oem-identity` 现在校验读取器、三个启动接线点、打包器条目、生成的位图、`brand.icon` / `ui.icon` 拒绝逻辑，以及 `AGENTS.md` 与 `brands/README.md` 中的契约文案；`apps/desktop/tests/app-icon.spec.ts` 与 `welcome-window.spec.ts` 锁定位图格式、打包接线与首窗口图标。

## Alternatives considered

**依赖打包后的可执行文件与 bundle 图标。** 不取：未打包的 macOS Dock 与欢迎窗口仍会落在 Electron 默认值上，这正是用户报告的状态；也没有任何正向断言证明正确位图已接线。

**允许 OEM profile 或品牌清单选择图片。** 不取：标志是所有部署共享的产品身份，按 profile 换图会让安装版应用与网页标签、安装器互相矛盾。配置本来就不能替换图片，静默接受该字段才是最令人困惑的部分。

**窗口构造完成后再复制图标。** 不取：首帧已经可能显示默认值；只有构造参数能保证窗口从不出现在错误标志下。

## Consequences

每个启动表面现在都使用学伴AI 橙色吉祥物：开发时的 Dock、Windows 任务栏身份、欢迎窗口、主窗口、托盘与安装器。试图在 profile 中指向另一张图片的部署会在加载时明确失败，而不是交付一个被静默忽略的字段。代价是确实需要不同标志的部署必须重建生成的位图，而不能只改一个 JSON 值——这与 logo 和安装器已经遵循的规则一致。

## Testing

`apps/desktop/tests/app-icon.spec.ts` 覆盖 `resolveApplicationIcon` / `resolveWindowIcon`、PNG/ICO/ICNS 格式、About 位图以及打包器的平台与安装器条目。`apps/desktop/tests/welcome-window.spec.ts` 断言启动窗口拿到位图路径。`packages/host/sdkwork-oem/tests/config.spec.ts` 断言 `brand.icon` / `ui.icon` 被拒绝。`scripts/verify-oem-identity.spec.ts` 逐个改动接线、位图与守卫并期待具名失败。
