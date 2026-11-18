import subprocess, re
from collections import Counter

def git(*args):
    return subprocess.run(['git', *args], capture_output=True, text=True, encoding='utf-8', errors='replace').stdout

conf = [l for l in git('diff','--name-only','--diff-filter=U').splitlines() if l.strip()]
pkg = [p for p in conf if p.endswith('package.json')]

def hunks_of(txt):
    lines = txt.splitlines(True)
    hunks=[]; cur=None
    for i,l in enumerate(lines):
        if l.startswith('<<<<<<<'):
            cur={'ours':[],'base':[],'theirs':[],'mode':'ours'}
        elif cur is not None and l.startswith('|||||||'):
            cur['mode']='base'
        elif cur is not None and l.startswith('======='):
            cur['mode']='theirs'
        elif cur is not None and l.startswith('>>>>>>>'):
            hunks.append(cur); cur=None
        elif cur is not None:
            cur[cur['mode']].append(l)
    return hunks

version_ours=Counter(); version_theirs=Counter(); version_base=Counter()
non_version_files=[]
for p in pkg:
    txt=open(p,encoding='utf-8',errors='replace').read()
    hs=hunks_of(txt)
    allver=True
    for h in hs:
        o=''.join(h['ours']); t=''.join(h['theirs'])
        if '"version"' in o or '"version"' in t:
            m=re.search(r'"version"\s*:\s*"([^"]+)"', o) or re.search(r'"version"\s*:\s*"([^"]+)"', t)
            version_ours[o.strip().replace('\n','|')[:80]]+=1
        else:
            allver=False
    if not allver:
        non_version_files.append(p)

print("=== version hunk shapes (ours side) ===")
for k,v in version_ours.most_common(10):
    print(v, k)
print("\n=== files with a non-version hunk ===", len(non_version_files))
for p in non_version_files: print("  ", p)
