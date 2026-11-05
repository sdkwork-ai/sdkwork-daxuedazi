/**
 * File and Actions-artifact names one container release produces.
 *
 * Every published container file starts with the selected brand's
 * `desktop.artifactPrefix`, the same stem the Desktop installers use, so an OEM
 * build never publishes a release asset named after another product. This module
 * is the only owner of those names: `pack-container.ts` writes them,
 * `assemble-github-release.ts` requires that exact set, `verify-container.ts`
 * asserts the guides and the workflow still ask for them, and
 * `container-release.yml` reads the prefix its `resolve` job resolved from the
 * same manifest.
 *
 * The container image *reference* inside Compose and Kubernetes manifests is not
 * a release asset: it is the application's deployment identity, owned by the
 * manifests, and it keeps its application name across brands.
 *
 * @module container-artifacts
 */

import { resolveBrand } from '../../apps/desktop/scripts/brand-manifest.mjs'

/** Architectures one release publishes a saved container image for. */
export type ContainerArch = 'amd64' | 'arm64'

/** Every architecture a release publishes an image archive for, in asset order. */
export const CONTAINER_RELEASE_ARCHES: readonly ContainerArch[] = ['amd64', 'arm64']

let prefix: string | undefined

/**
 * Artifact stem the selected brand manifest gives every container release file.
 * @returns The brand's `desktop.artifactPrefix`, resolved once per process.
 */
export function containerArtifactPrefix(): string {
  return prefix ??= resolveBrand().desktop.artifactPrefix
}

/**
 * Staged and extracted deployment-bundle directory name.
 * @param version - Release version.
 * @returns `<prefix>-container-<version>`.
 */
export function containerBundleDirectory(version: string): string {
  return `${containerArtifactPrefix()}-container-${version}`
}

/**
 * Deployment-bundle archive file name.
 * @param version - Release version.
 * @returns `<prefix>-container-<version>.tar.gz`.
 */
export function containerBundleArchive(version: string): string {
  return `${containerBundleDirectory(version)}.tar.gz`
}

/**
 * Saved container image archive file name.
 * @param version - Release version.
 * @param arch - Linux architecture the image was built for.
 * @returns `<prefix>-container-image-<version>-linux-<arch>.tar.gz`.
 */
export function containerImageArchive(version: string, arch: ContainerArch): string {
  return `${containerArtifactPrefix()}-container-image-${version}-linux-${arch}.tar.gz`
}

/**
 * Actions artifact that carries the deployment bundle to the release job.
 * @param version - Release version.
 * @returns `<prefix>-container-deployment-<version>`.
 */
export function containerBundleArtifact(version: string): string {
  return `${containerArtifactPrefix()}-container-deployment-${version}`
}

/**
 * Actions artifact that carries one architecture's image archive.
 * @param version - Release version.
 * @param arch - Linux architecture the image was built for.
 * @returns `<prefix>-container-image-<version>-linux-<arch>`.
 */
export function containerImageArtifact(version: string, arch: ContainerArch): string {
  return `${containerArtifactPrefix()}-container-image-${version}-linux-${arch}`
}

/**
 * The six container assets a release publishes, archive before its checksum.
 * @param version - Release version.
 * @returns Two files per bundle and saved image.
 */
export function containerReleaseAssets(version: string): string[] {
  const bundle = containerBundleArchive(version)
  const assets = [bundle, `${bundle}.sha256`]
  for (const arch of CONTAINER_RELEASE_ARCHES) {
    const image = containerImageArchive(version, arch)
    assets.push(image, `${image}.sha256`)
  }
  return assets
}

/**
 * The three Actions artifacts the container jobs hand to the release job.
 * @param version - Release version.
 * @returns The bundle artifact followed by one image artifact per architecture.
 */
export function containerReleaseArtifacts(version: string): string[] {
  return [
    containerBundleArtifact(version),
    ...CONTAINER_RELEASE_ARCHES.map(arch => containerImageArtifact(version, arch)),
  ]
}

/**
 * Local archive name the installation guides tell a source build to save.
 * @returns `<prefix>-container-local.tar` for the selected brand.
 */
export function containerLocalArchive(): string {
  return `${containerArtifactPrefix()}-container-local.tar`
}
