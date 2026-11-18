import subprocess, re, os, json, sys

def git(*args, check=False):
    r = subprocess.run(['git', *args], capture_output=True, text=True, encoding='utf-8', errors='replace')
    if check and r.returncode != 0:
        raise RuntimeError(f"git {args} failed: {r.stderr}")
    return r.stdout

MARK_OURS='<<<<<<<'; MARK_BASE='|||||||'; MARK_EQ='======='; MARK_THEIRS='>>>>>>>'

def parse_hunks(txt):
    lines = txt.splitlines(True)
    hunks=[]; i=0; n=len(lines)
    while i < n:
        if lines[i].startswith(MARK_OURS):
            ours=[]; base=[]; theirs=[]; mode='ours'; i+=1
            while i < n:
                l=lines[i]
                if l.startswith(MARK_BASE): mode='base'; i+=1; continue
                if l.startswith(MARK_EQ): mode='theirs'; i+=1; continue
                if l.startswith(MARK_THEIRS): i+=1; break
                {'ours':ours,'base':base,'theirs':theirs}[mode].append(l)
                i+=1
            hunks.append({'ours':ours,'base':base,'theirs':theirs})
        else:
            i+=1
    return hunks

def resolve_file(path, chooser):
    txt=open(path,encoding='utf-8',errors='replace').read()
    hunks=parse_hunks(txt)
    if not hunks:
        return False
    # rebuild: walk markers in order, replacing each block with chosen lines
    out=[]; i=0; n=len(txt.splitlines(True)); lines=txt.splitlines(True); hi=0
    while i < n:
        if lines[i].startswith(MARK_OURS):
            # skip to end marker
            while i < n and not lines[i].startswith(MARK_THEIRS): i+=1
            i+=1  # skip >>>>>>> line
            chosen=chooser(hunks[hi]); hi+=1
            out.extend(chosen)
        else:
            out.append(lines[i]); i+=1
    assert hi==len(hunks), f"{path}: consumed {hi}/{len(hunks)}"
    with open(path,'w',encoding='utf-8',newline='') as f:
        f.writelines(out)
    return True

# ---------- Gather unmerged paths ----------
conf=[l for l in git('diff','--name-only','--diff-filter=U').splitlines() if l.strip()]
pkg=[p for p in conf if p.endswith('package.json')]
nonpkg=[p for p in conf if not p.endswith('package.json')]

# ---------- Classify package.json ----------
version_only=[]; complex_pkg=[]
for p in pkg:
    txt=open(p,encoding='utf-8',errors='replace').read()
    hs=parse_hunks(txt)
    if hs and all(('"version"' in ''.join(h['ours']) or '"version"' in ''.join(h['theirs'])) for h in hs):
        version_only.append(p)
    else:
        complex_pkg.append(p)

print(f"version-only pkg: {len(version_only)}; complex pkg: {len(complex_pkg)}")
print("complex pkg:", complex_pkg)

# ---------- 1. version-only package.json -> ours ----------
for p in version_only:
    resolve_file(p, lambda h: h['ours'])

# ---------- 2. complex package.json ----------
# root package.json
def root_chooser(h):
    o=''.join(h['ours']); t=''.join(h['theirs'])
    if '"version"' in o or '"version"' in t:
        return h['ours']  # keep fork rc.6
    if 'verify-cordis-root' in t or 'verify-empty-catch' in t:
        # upstream hunk1: take only the NEW verify-cordis-root (fork keeps verify-empty-catch in its own position)
        lines=[l for l in h['theirs'] if 'verify-cordis-root' in l]
        return lines
    # hunk3 (release:publish / verify-empty-catch): take ours (fork's verify-empty-catch, no publish.ts)
    return h['ours']
resolve_file('package.json', root_chooser)

# official-accounts: add only upstream's new dsh-util-crypto dep
def oa_chooser(h):
    return [l for l in h['theirs'] if 'dsh-util-crypto' in l]
resolve_file('packages/client/ui-sdkwork-official-accounts/package.json', oa_chooser)

# client-ui-forge: version=ours, description=theirs, deps=ours (fork keeps extra deps, dsh-brand already dropped)
def forge_chooser(h):
    o=''.join(h['ours']); t=''.join(h['theirs'])
    if '"version"' in o or '"version"' in t:
        out=[]
        for l in h['ours']:
            if '"version"' in l:
                out.append(l)
        # description from upstream
        for l in h['theirs']:
            if '"description"' in l:
                out.append(l)
        return out
    return h['ours']  # deps: keep fork's declared deps
resolve_file('packages/experimental/client-ui-forge/package.json', forge_chooser)

# template-library package.json: upstream deleted package, fork keeps it -> ours
# (handled together with restoring deleted files below)
resolve_file('packages/client/ui-sdkwork-template-library/package.json', lambda h: h['ours'])

# tool-working-directory package.json: upstream deleted via real refactor -> accept deletion
subprocess.run(['git','rm','-f','packages/session/tool-working-directory/package.json'],check=True)

print("package.json conflicts resolved")
