import subprocess, os, json

def git(*args):
    return subprocess.run(['git', *args], capture_output=True, text=True, encoding='utf-8', errors='replace').stdout

conf = [l for l in git('diff','--name-only','--diff-filter=U').splitlines() if l.strip()]

pkg = [p for p in conf if p.endswith('package.json')]
other = [p for p in conf if not p.endswith('package.json')]

print("TOTAL", len(conf), "PKG", len(pkg), "OTHER", len(other))

# classify package.json conflicts by conflict-hunk content
from collections import Counter
cat = Counter()
version_only = []
complex_pkg = []
detail = {}
for p in pkg:
    txt = open(p, encoding='utf-8', errors='replace').read()
    lines = txt.splitlines()
    # collect conflict regions between <<<<<<< and >>>>>>> (diff3 has |||||||)
    hunks = []
    cur = None
    for i,l in enumerate(lines):
        if l.startswith('<<<<<<<'):
            cur = {'start':i,'ours':[],'base':[],'theirs':[],'mode':'ours'}
        elif cur is not None and l.startswith('|||||||'):
            cur['mode']='base'
        elif cur is not None and l.startswith('======='):
            cur['mode']='theirs'
        elif cur is not None and l.startswith('>>>>>>>'):
            cur['end']=i
            hunks.append(cur); cur=None
        elif cur is not None:
            cur[cur['mode']].append(l)
    # classify each hunk
    kinds = []
    for h in hunks:
        ours = '\n'.join(h['ours']).strip()
        theirs = '\n'.join(h['theirs']).strip()
        if '"version"' in ours or '"version"' in theirs:
            kinds.append('version')
        else:
            kinds.append('other')
    if all(k=='version' for k in kinds) and len(kinds)>=1:
        cat['version_only']+=1
        version_only.append(p)
    else:
        cat['complex']+=1
        complex_pkg.append((p,kinds))
        detail[p]=kinds

print("CAT", dict(cat))
print("\n=== COMPLEX PACKAGE.JSON (first 60) ===")
for p,kinds in complex_pkg[:60]:
    print(p, kinds)
print("... total complex:", len(complex_pkg))
