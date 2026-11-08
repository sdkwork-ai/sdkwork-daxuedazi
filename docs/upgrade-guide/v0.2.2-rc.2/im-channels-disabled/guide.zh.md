---
kind: upgrade-guide
description: "内置 dsh-im 插件已默认禁用，IM 机器人设置页与所有 IM 渠道连接不再随出厂构建提供。"
---

# 内置 IM 渠道已默认禁用

[English](guide.md) | 中文

## 变更

`packages/bundle/web-app/cordis.patch.yml` 中的 `xmanrui-dsh-im` 行现在带 `disabled: true`。此前所有出厂构建（Web 与桌面端、cloud 与 standalone）默认挂载 `@xmanrui/dsh-im`，提供 `设置 → IM机器人` 设置页以及飞书、微信、企业微信、钉钉、QQ、Slack、Telegram、Discord、WhatsApp、iMessage、Matrix 渠道连接。升级后，该设置页、其 `IM链接器` 侧栏快捷入口、所有渠道连接及后台收件实例都不再出现。SDKWork 自带的聊天与通讯录模式（`ui-sdkwork-im`、`ui-sdkwork-im-conversations`、`ui-sdkwork-im-chat`、`ui-sdkwork-im-contacts`）与此无关，保持启用。`plugins/dsh-im` 子模块及其 workspace 依赖仍保留。

## 迁移

1. 如需恢复 IM 表面，在更上层的 patch 中按 id 重新启用该行——profile 的 `$DSH_HOME/profiles/<name>/cordis.patch.yml`，或全局的 `$DSH_HOME/cordis.patch.yml`：

   ```yaml
   - id: xmanrui-dsh-im
     disabled: false
   ```

   不要再新增一条 `insert` 行：被禁用的行仍在组合里，按 id 覆盖即可。
2. 重启应用，确认 `设置 → IM机器人` 与 `IM链接器` 侧栏快捷入口重新出现。未加覆盖时，启动 `dsh web` 确认没有 IM 设置页；验收测试 `packages/bundle/web-app/tests/built-in-im.spec.ts` 现在断言该行默认禁用，请保持它通过，而不是把期望改回「默认启用」。
