# Agent Note: container release asset names

Status: implemented

English | [中文](2026-08-16-birdcoder-container-assets.zh.md)

## Problem

The container release assets kept the harness family prefix: `dsh-container-<version>.tar.gz`, `dsh-container-image-<version>-linux-<arch>.tar.gz`, and the deployment-bundle directory `dsh-container-<version>/`. The desktop installers were already named after the product's artifact stem, so the k8s and Docker download names were the only release assets that did not match the product identity. The first rename fixed that by writing one literal stem into five places; when the repository's shipped brand moved to `daxuedazi`, the literal did not move with it, and a release published `birdcoder-container-*` files beside `daxuedazi-*` installers.

## Decision

Every container packaging name carries the selected brand's `desktop.artifactPrefix`: the deployment archive and its checksum, both image archives and their checksums, the Actions artifact names, the staged and extracted directory `<prefix>-container-<version>/`, and the local archive `<prefix>-container-local.tar` in the installation docs. [container-artifacts](../../../../scripts/release/container-artifacts.ts) is the only owner of those names: [pack-container](../../../../scripts/release/pack-container.ts) writes them, the [release assembler](../../../../scripts/release/assemble-github-release.ts) requires exactly that set, the [container gate](../../../../scripts/release/verify-container.ts) asserts the workflow and the guides still name them, and the [container workflow](../../../../.github/workflows/container-release.yml) resolves the prefix from the same manifest in its `resolve` job and passes it to every job that uploads or extracts an asset. `verify-oem-identity` fails when a release lane, the workflow or a guide spells a foreign container stem again.

The image repository name `localhost/deepseek-harness` stays unchanged: it is the image reference inside Compose and Kubernetes manifests, deployment identity owned by the manifests, not a release asset name.

## Alternatives considered

**Keep a literal product stem.** This is what shipped after the first rename: `birdcoder-container-*` outlived the brand it named, so the release carried two identities and no gate noticed.

**Let each lane spell the name.** Five files spelled it independently, so a rename had to find all five and a missed one stayed invisible until publication. The shared owner makes the brand manifest the single place the stem is written.

**Rename the image repository to the brand too.** The image reference is deployment identity shared with source-build and registry-retag instructions, and the same application runs under either brand; renaming it belongs to a separate decision.

## Consequences

The next `sdkwork-daxuedazi-v<version>` release publishes `daxuedazi-container-<version>.tar.gz`, its checksum, and `daxuedazi-container-image-<version>-linux-{amd64,arm64}.tar.gz` with checksums; an OEM build with another manifest publishes the same files under that brand's stem. Old `birdcoder-container-*` assets remain readable on the previous release only; new downloads use the renamed files.
