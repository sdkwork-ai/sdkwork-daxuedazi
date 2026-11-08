---
kind: upgrade-guide
description: "The built-in dsh-im plugin is disabled by default, so the IM robot settings page and every IM channel connection no longer ship."
---

# Built-in IM channels are disabled

English | [中文](guide.zh.md)

## Change

The `xmanrui-dsh-im` row in `packages/bundle/web-app/cordis.patch.yml` now carries `disabled: true`. Previously every shipped build — Web and Desktop, cloud and standalone — mounted `@xmanrui/dsh-im` by default and offered the `设置 → IM机器人` settings page plus Feishu, WeChat, WeCom, DingTalk, QQ, Slack, Telegram, Discord, WhatsApp, iMessage and Matrix channel connections. After upgrading, that settings page, its `IM链接器` rail shortcut, and all channel connections and their background receivers are absent. The SDKWork chat and contacts modes (`ui-sdkwork-im`, `ui-sdkwork-im-conversations`, `ui-sdkwork-im-chat`, `ui-sdkwork-im-contacts`) are unrelated and remain enabled. The `plugins/dsh-im` submodule and its workspace dependency are still present.

## Migration

1. To restore the IM surface, add a later patch layer that re-enables the row by id — a profile's `$DSH_HOME/profiles/<name>/cordis.patch.yml` or the machine-wide `$DSH_HOME/cordis.patch.yml`:

   ```yaml
   - id: xmanrui-dsh-im
     disabled: false
   ```

   Do not add a second `insert` row: the disabled row is still in the composition, so an id override is enough.
2. Restart the app and confirm `设置 → IM机器人` and the `IM链接器` rail shortcut reappear. With no override, boot `dsh web` and confirm no IM settings page renders; the acceptance spec `packages/bundle/web-app/tests/built-in-im.spec.ts` now asserts the row is disabled by default, so keep that test passing rather than restoring the old "enabled by default" expectation.
