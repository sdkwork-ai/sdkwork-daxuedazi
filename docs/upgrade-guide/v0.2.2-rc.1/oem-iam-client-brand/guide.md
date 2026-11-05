---
kind: upgrade-guide
description: "The desktop browser login presents the installed brand's own OAuth client (`daxuedazi`) instead of the shared `birdcoder` client."
---
# Desktop browser login presents the brand's own OAuth client

English | [中文](guide.zh.md)

## Change

The hosted SDKWork IAM browser login now sends `client_id` = the shipped brand's URL scheme, and derives it from `sdkwork.iamRedirectUri` whenever the OEM profile does not declare `sdkwork.iamClientId`. The shipped 学伴AI profile therefore presents `daxuedazi` and returns through `daxuedazi://auth/callback`, where it used to present `birdcoder` with a `daxuedazi://` callback.

The two identities stay independent of the API tenant: `ui-sdkwork-env`'s app id still identifies API requests, and only the OAuth client plus its registered callback move.

## Migration

1. Register the public OAuth client `daxuedazi` with redirect URI `daxuedazi://auth/callback` for the tenant that serves this deployment — `agent.app.config.json` declares the same relying party. A tenant still registered as `birdcoder` answers `invalid_client`.
2. A deployment that must keep an already registered client id sets `sdkwork.iamClientId` in `$DSH_HOME/oem.json` or the packaged `resources/oem.json`; the callback keeps coming from `sdkwork.iamRedirectUri`.
3. A brand whose `desktop.protocol` is not a legal OAuth client id (lower-case letters, digits, `.`, `_`, `-`, at most 64 characters) must declare `sdkwork.iamClientId` explicitly, because the host rejects a profile that cannot name its client.
4. Rebuild the desktop application and confirm the hosted login opens and returns through the registered callback into a signed-in session.
