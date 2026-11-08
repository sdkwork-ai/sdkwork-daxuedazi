---
description: "OEM 品牌客户端插件：把 Host 发布的显示名、品牌清单的逐语言名称映射与生命周期应用到 locale 文案、文档标题与诊断信息。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-sdkwork-oem

[English](README.md) | 中文

## 摘要

OEM 配置的浏览器半边。启动时读取 [`@deepseek-ai/dsh-sdkwork-oem`](../../host/sdkwork-oem/README.zh.md) 发布的 `__DSH_OEM__` 页面投影，以及 Web 构建按[品牌清单](../../../brands/README.zh.md)注入的 `__DSH_APP_NAMES__` 名称映射，把逐语言的应用名交给 locale 注册表（`setBrandNames`），让文档标题始终等于当前界面语言对应的名称，并把解析出的生命周期记录到 `documentElement.dataset.dshEnvironment` 以便诊断。所有拼写 `BirdCoder` 的客户端字典文案随后渲染为该语言下的部署品牌（出厂八种语言统一为学伴AI）；真正重命名产品的 OEM 配置在每种语言下都优先，未挂载 OEM 配置的组合仍回落到字典里的 `BirdCoder` 拼写。

侧栏字标通过 [`ui-primitives`](../ui-primitives/README.zh.md) 的 `readOemBrandNameForLocale()` 直接读取同一名称映射，并跟随 `<html lang>`（locale 注册表会随界面语言同步该属性），而不是浏览器首选语言；名称是实时 SVG 文本，较长的 OEM 名称会在上游字标框内缩小字号，而不是撑开槽位。

## 模型体验

无。该插件只改变显示文案与文档标题。

#### KV Cache 影响

无；本包不组装任何 provider 请求。

## 已知限制与后续工作

- Web manifest 与 `index.html` 标题是构建期文本：manifest 的 `name`/`short_name` 使用默认名称，文档标题则在运行期重新本地化（先由内联引导脚本按浏览器语言设置，再由本插件按界面语言校正）。逐语言名称不同的部署需在构建中一并更新 manifest。
- Logo 仍是构建期的 BirdCoder 标识。采用其他品牌的部署需要在构建中替换 Logo 位图（应用图标、安装器品牌图与欢迎页标识）；配置只承载显示名称。
- locale 替换只匹配 `BirdCoder` 这一确切拼写；品牌名若在不相关单词中包含该拼写，应改用其他品牌名。
- H5 与小程序是独立外壳，拥有自己的产品标签，本配置不会触达。
