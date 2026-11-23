---
kind: upgrade-guide
description: "Every packaged launch creates an empty ~/.<home.dirName> instead of renaming ~/.dsh into it, and home.adoptLegacyDshHome no longer exists."
---
# The desktop application starts on an empty brand home instead of taking over `~/.dsh`

English | [中文](guide.zh.md)

## Change

A packaged launch of the `birdcoder` brand renamed an existing `~/.dsh` to `~/.birdcoder` — a same-volume move of every session, credential, profile and workspace — or created a directory link when another process still held a file; `home.adoptLegacyDshHome` in a brand manifest decided which brands did that.

The launcher now resolves `~/.<home.dirName>` from `resources/brand.json`, creates it when it is missing, and exports it as `DSH_HOME`. It never reads, renames, links or writes `~/.dsh`, so an installed DeepSeek Harness and an npm `dsh` CLI keep every Session, credential and workspace they hold. The shipped `daxuedazi` brand already behaved this way; `birdcoder` is the brand whose first launch changes. A manifest that still carries `home.adoptLegacyDshHome` is accepted, and the key is ignored.

Two cases remain. An installation whose data already sits in its brand home continues with it. A build that lost the rename and kept using `~/.dsh` — the launch reported which home it kept — starts empty now: its own Sessions are still inside `~/.dsh` beside the DeepSeek Harness data, and step 2 moves them.

## Migration

1. Do nothing when the brand home already holds this installation's data, and when the application never ran on the machine: the next launch uses the brand home and leaves `~/.dsh` untouched.
2. To carry data out of `~/.dsh`, close the application and every `dsh` process first, then copy the entries you want — `sessions/`, `profiles/`, `.credentials.yaml`, and any other top-level entry you depend on — into `~/.<home.dirName>` and keep `~/.dsh` as it is. On macOS and Linux, with `$HOME/.daxuedazi` as the brand home: `mkdir -p ~/.daxuedazi && cp -a ~/.dsh/. ~/.daxuedazi/`. On Windows PowerShell: `New-Item -ItemType Directory -Force "$env:USERPROFILE\.daxuedazi"; Copy-Item -Recurse "$env:USERPROFILE\.dsh\*" "$env:USERPROFILE\.daxuedazi"`.
3. To share one home on purpose, set `DSH_HOME` before the launch. The launcher never overrides an explicit value.
4. Delete `home.adoptLegacyDshHome` from every `brands/<key>.json` you maintain; it has no effect.
5. After upgrading, confirm the application lists the expected Sessions and remembers sign-in, and that `~/.dsh` still contains the DeepSeek Harness data it had before.
