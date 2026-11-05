# Agent Note: 容器发布资产命名

Status: implemented

[English](2026-08-16-birdcoder-container-assets.md) | 中文

## 问题

容器发布资产仍沿用 harness family 前缀：`dsh-container-<version>.tar.gz`、`dsh-container-image-<version>-linux-<arch>.tar.gz`，以及部署包目录 `dsh-container-<version>/`。桌面安装包已经按产品的产物前缀命名，因此 k8s 与 Docker 的下载名称是唯一与产品身份不符的发布资产。第一次改名解决了这个问题，却把一个字面前缀写进了五个位置；当仓库的出厂品牌改为 `daxuedazi` 时，这个字面量没有随之改变，于是发布把 `birdcoder-container-*` 文件与 `daxuedazi-*` 安装包并列发布。

## 决策

所有容器打包名称都取自当前品牌清单的 `desktop.artifactPrefix`：部署归档及其 checksum、两个镜像归档及其 checksum、Actions artifact 名称、staging 与解压目录 `<prefix>-container-<version>/`，以及安装文档中的本地归档名 `<prefix>-container-local.tar`。[container-artifacts](../../../../scripts/release/container-artifacts.ts) 是这些名称的唯一归属：[pack-container](../../../../scripts/release/pack-container.ts) 负责生成，[Release 汇总器](../../../../scripts/release/assemble-github-release.ts) 要求恰好这一套名称，[容器校验门禁](../../../../scripts/release/verify-container.ts) 断言工作流与指南仍然按这些名称书写，[容器工作流](../../../../.github/workflows/container-release.yml) 在其 `resolve` 作业中从同一清单解析前缀，并传给每个负责上传或解压资产的作业。当某个发布通道、工作流或指南重新写出他方容器前缀时，`verify-oem-identity` 会失败。

镜像仓库名 `localhost/deepseek-harness` 保持不变：它是 Compose 与 Kubernetes manifest 内部的镜像引用，属于由 manifest 拥有的部署身份，不是发布资产名。

## 备选方案

**保留字面前缀。** 第一次改名之后就是这样：`birdcoder-container-*` 比它所命名的品牌更长寿，于是发布同时带上了两套身份，而没有任何门禁发现。

**让每个通道各自书写名称。** 五个文件各自书写，改名时必须找齐五处，漏掉的一处直到发布才会暴露。共享归属让品牌清单成为前缀唯一的书写位置。

**同时把镜像仓库改名为品牌名。** 镜像引用是与源码构建和 registry 重新打标说明共享的部署身份，且同一应用在两种品牌下运行；改名应作为独立决策。

## 后果

下一个 `sdkwork-daxuedazi-v<version>` 发布将包含 `daxuedazi-container-<version>.tar.gz` 及其 checksum，以及带 checksum 的 `daxuedazi-container-image-<version>-linux-{amd64,arm64}.tar.gz`；使用其他清单的 OEM 构建会以该品牌的前缀发布同一组文件。旧的 `birdcoder-container-*` 资产仅在之前的 Release 上可读；新下载全部使用改名后的文件。
