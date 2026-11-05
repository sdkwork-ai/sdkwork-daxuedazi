---
kind: upgrade-guide
description: "桌面浏览器登录改用当前安装品牌自己的 OAuth 客户端（`daxuedazi`），不再共用 `birdcoder` 客户端。"
---
# 桌面浏览器登录改用品牌自己的 OAuth 客户端

[English](guide.md) | 中文

## 变更

托管 SDKWork IAM 浏览器登录现在发送 `client_id` = 出厂品牌的 URL scheme；OEM profile 未声明 `sdkwork.iamClientId` 时由 `sdkwork.iamRedirectUri` 派生。因此学伴AI profile 发送 `daxuedazi` 并通过 `daxuedazi://auth/callback` 返回，而不是过去用 `birdcoder` 搭配 `daxuedazi://` 回调。

这两个标识仍与 API 租户相互独立：`ui-sdkwork-env` 的 app id 依旧标识 API 请求，只有 OAuth 客户端及其已注册回调发生变化。

## 迁移

1. 在为本部署服务的租户下注册公共 OAuth 客户端 `daxuedazi`，回调为 `daxuedazi://auth/callback`——`agent.app.config.json` 声明了同一份 relying party。仍注册为 `birdcoder` 的租户会返回 `invalid_client`。
2. 若部署需要保留已注册的客户端 id，请在 `$DSH_HOME/oem.json` 或随包发布的 `resources/oem.json` 中设置 `sdkwork.iamClientId`；回调仍取 `sdkwork.iamRedirectUri`。
3. 品牌若把 `desktop.protocol` 改成不能作为 OAuth 客户端 id 的 scheme（仅允许小写字母、数字、`.`、`_`、`-`，最多 64 字符），必须显式声明 `sdkwork.iamClientId`，否则 host 会拒绝该 profile。
4. 重新打包桌面应用，确认托管登录页打开并通过已注册回调返回为已登录会话。
