# Agent Note: OEM builds hide the scene chrome through the profile

Status: implemented

[English](2026-11-05-oem-scene-chrome.md) | 中文

## Problem

出厂应用是面向学生的知识平台，但新建会话表面仍带着开发者工作台的两处场景外观：英雄区标题下方的代码 / 媒体 / 文档切换器，以及输入框下方按场景提供的 `birdcoder-*` 技能标签。它们宣传的是部署未必提供的场景与技能，而每个新用户都在写下第一条消息前先遇到它们。两者各自有用户级可见性偏好，因此部署无法从产品层面关掉：每个用户都得自己发现并关闭两个设置，而一次重置又会把它们带回来。

## Decision

决策由 OEM 配置拥有。`ui.sceneSwitcher` 与 `ui.skillTags` 加入解析后的配置，默认 `false`，并发布到 `__DSH_OEM__` 页面投影。`ui-primitives` 中的 `readOemSceneSwitcher` / `readOemSkillTags` 是唯一的读取入口；页面缺少投影或投影损坏时它们按「保留外观」处理，因此未挂载 OEM 的组合与组件测试仍会挂载它。false 是挂载决策而不是样式：`ui-sdkwork-app-modes` 不注册英雄区场景切换座位、两个技能标签条座位、提交观察者与通用设置中的场景切换行，`ui-sdkwork-skills` 也不显示标签条总开关。既有的 `heroSwitchVisible` / `showSceneTags` 偏好仍然控制部署重新开启的那一面；它们无法让配置未挂载的表面复活。

## Alternatives considered

**改为把两个用户设置默认设为 `false`。** 不取：这会改变包括第二品牌与任何未挂载 OEM 的构建在内的所有组合，而部署已存储的 `true` 仍会把外观带回来。这是部署配置的产品决策，而配置已经拥有其他所有 OEM 专属行为。

**用页面级 class 在 CSS 中隐藏座位。** 不取：座位仍会注册、设置行仍会写入，部署也无法区分「没有这个表面」与「把它藏起来了」。注册处是声明「这个构建不提供它」最便宜的位置，而客户端本来就要在那里做决定。

**为 OEM 构建从 bundle 中移除场景包。** 不取：模式栏、基础模式页与应用模式设置行共用这个包；为去掉两个座位而拆分 bundle 会让包分叉，并给 upstream 合并留下第二种组合需要协调。

## Consequences

出厂 OEM 构建既不渲染胶囊也不渲染标签条，设置里也不再出现指向死表面的开关。把 `ui.sceneSwitcher` 和/或 `ui.skillTags` 设为 `true` 的部署会分别拿回该表面及其持久用户偏好。隐藏默认值写在配置里，因此不读客户端代码也能审计这个决策。代价是出厂构建的用户无法自行重新开启外观；这正是产品要求。`verify-oem-identity` 会校验配置字段、两个读取器、两个客户端门禁与契约文案，因此无条件挂载外观的上游合并会让同步门禁失败。

## Testing

`packages/host/sdkwork-oem/tests/config.spec.ts` 覆盖默认值与按生命周期覆盖，以及布尔校验；`tests/plugin.spec.ts` 覆盖发布给浏览器的视图对象。`packages/client/ui-primitives/tests/oem-brand.client.spec.tsx` 覆盖读取器的显式 false 与回退行为。`packages/client/ui-sdkwork-app-modes/tests/apply.client.spec.ts` 断言投影隐藏时没有座位、没有场景切换行，且两个开关互相独立。`packages/client/ui-sdkwork-skills/tests/skills-section.client.spec.tsx` 断言标签条总开关不出现而逐技能开关保留。`scripts/verify-oem-identity.spec.ts` 逐个改动门禁表面并期待具名失败。
