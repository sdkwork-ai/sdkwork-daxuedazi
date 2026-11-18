import subprocess

def git(*args, check=False):
    r = subprocess.run(['git', *args], capture_output=True, text=True, encoding='utf-8', errors='replace')
    if check and r.returncode != 0:
        raise RuntimeError(f"git {args} failed:\n{r.stderr}")
    return r

# Fork-owned SDKWork files: keep HEAD wholesale (fork keeps 3 storefronts incl. template-library)
fork_keep = [
    'packages/bundle/web-app/cordis.patch.yml',
    'packages/client/ui-sdkwork-demand-hall/README.i18n.yaml',
    'packages/client/ui-sdkwork-sidebar/README.i18n.yaml',
    'packages/client/ui-sdkwork-sidebar/README.md',
    'packages/client/ui-sdkwork-sidebar/README.zh.md',
    'packages/client/ui-sdkwork-sidebar/src/client/layout.ts',
    'packages/client/ui-sdkwork-sidebar/tests/layout.client.spec.ts',
]
for p in fork_keep:
    git('checkout','--ours','--',p,check=True)
    git('add','--',p,check=True)
    print("kept ours:", p)

# template-library README files: upstream deleted whole package; fork keeps it -> ours
for p in [
    'packages/client/ui-sdkwork-template-library/README.i18n.yaml',
    'packages/client/ui-sdkwork-template-library/README.md',
    'packages/client/ui-sdkwork-template-library/README.zh.md',
    'packages/client/ui-sdkwork-template-library/package.json',
]:
    git('checkout','--ours','--',p,check=True)
    git('add','--',p,check=True)
    print("kept ours (template-library):", p)

# Restore all source files upstream deleted from the fork-owned template-library package
deleted_tl = [l for l in git('diff','--name-only','--diff-filter=D','HEAD').stdout.splitlines()
              if 'ui-sdkwork-template-library' in l]
for p in deleted_tl:
    git('checkout','HEAD','--',p,check=True)
    print("restored template-library file:", p)

print("done. template-library files restored:", len(deleted_tl))
