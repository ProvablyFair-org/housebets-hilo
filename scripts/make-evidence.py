#!/usr/bin/env python3
"""Builds evidence/ for the HouseBets hilo package from the HouseBets workshop (run once by the auditor; the outputs are
pinned in src/loader.ts and listed in MANIFEST.md#evidence). Sources (outside this package):
  W = housebets-new-deal-2026-10-09/, the HouseBets workshop folder two levels above the package (capture rigs, bundles, 12 Oct capture, 13 Oct full capture + ledger)
Every exhibit records its source path and the sha256 of the source bytes it was cut from."""
import hashlib, json, os, re, shutil
HERE = os.path.dirname(os.path.abspath(__file__)); PKG = os.path.dirname(HERE)
W = os.path.abspath(os.path.join(PKG, '..', '..', 'housebets-new-deal-2026-10-09'))
EV = os.path.join(PKG, 'evidence'); os.makedirs(EV, exist_ok=True)
sha = lambda b: hashlib.sha256(b).hexdigest()
def dump(name, obj):
    open(os.path.join(EV, name), 'w', encoding='utf-8').write(json.dumps(obj, indent=2, ensure_ascii=False) + '\n'); print('wrote', name)

A = 'housebets-hilo-phaseA-auto1-6500rounds.json'
prim_raw = open(os.path.join(PKG, 'data', A), 'rb').read(); prim = json.loads(prim_raw)
o_rel = 'supplementary/housebets-hilo-full-77rounds-withopen.json'
o_raw = open(os.path.join(PKG, 'data', o_rel), 'rb').read(); o12 = json.loads(o_raw)
sr13, sr12 = prim['meta']['staticReads'], o12['meta']['staticReads']
assert json.dumps(sr13['/hilo2/fairness'], sort_keys=True) == json.dumps(sr12['/hilo2/fairness'], sort_keys=True), 'fairness answer changed between 12 and 13 Oct'
assert json.dumps(sr13['/limits/hilo2'], sort_keys=True) == json.dumps(sr12['/limits/hilo2'], sort_keys=True), 'limits changed between 12 and 13 Oct'
src13 = {'file': 'data/' + A, 'sha256': sha(prim_raw), 'readBy': 'the 13 Oct Phase A capture before its first bet', 'captureCreatedAt': prim['meta']['createdAt']}
also12 = {'file': 'data/' + o_rel, 'sha256': sha(o_raw), 'readBy': 'the 12 Oct capture', 'identical': True}

# E01 the server's published hilo2 spec (GET /housegames/hilo2/fairness)
dump('E01-hilo2-fairness-spec-2026-10-13.json', {'exhibit': 'E01', 'what': "HouseBets House Games hilo: the server's published fairness spec (GET /housegames/hilo2/fairness)",
     'source': dict(src13, field="meta.staticReads['/hilo2/fairness']"), 'sameAnswerOn': dict(also12, field="meta.staticReads['/hilo2/fairness']"), 'answer': sr13['/hilo2/fairness']})
# E02 the limits answer
dump('E02-hilo2-limits-2026-10-13.json', {'exhibit': 'E02', 'what': 'HouseBets hilo limits (GET /housegames/limits/hilo2)',
     'source': dict(src13, field="meta.staticReads['/limits/hilo2']"), 'sameAnswerOn': dict(also12, field="meta.staticReads['/limits/hilo2']"), 'answer': sr13['/limits/hilo2']})

# E03 the platform bet history rows of every round in this package's datasets
lp = os.path.join(W, 'capture-full-2026-10-12', 'ledger', 'ledger-2026-10-13-final.json'); lraw = open(lp, 'rb').read(); L = json.loads(lraw)
led = {x['id']: x for x in L['items']}
files = [A, 'supplementary/housebets-hilo-phaseC-elevated-200rounds.json', 'supplementary/housebets-hilo-phaseC-elevated-10usd-200rounds.json',
         'supplementary/housebets-hilo-phaseD-playerseeds-200rounds.json', 'supplementary/housebets-hilo-phaseE-multistep-600rounds.json', o_rel]
rows, missing = [], []
for f in files:
    for r in json.load(open(os.path.join(PKG, 'data', f)))['rounds']:
        x = led.get(r['roundId'])
        if x is None: missing.append(r['roundId']); continue
        rows.append({k: x[k] for k in ('id', 'game', 'placed_at', 'stake', 'payout', 'currency', 'status')})
assert not missing, f'{len(missing)} rounds not in the ledger'
dump('E03-hilo-bet-history-2026-10-13.json', {'exhibit': 'E03', 'what': 'HouseBets bet history (GET /api/v1/transactions/bets?category=casino) rows of every hilo round in this package; fields id = roundId, stake, payout, status',
     'source': {'file': 'capture-full-2026-10-12/ledger/ledger-2026-10-13-final.json (HouseBets workshop)', 'sha256': sha(lraw), 'readAt': L['readAt'], 'entries': len(L['items'])},
     'rows': sorted(rows, key=lambda r: (r['placed_at'], r['id']))})

# E04 the whole-account reconciliation: the full output of the workshop's reconcile-full.py over the final ledger (every
# captured round of every game against the platform history and the wallet). The workshop's RECONCILE-…-final.txt holds
# only the last 8 lines of that output, so the script is run here and its whole stdout kept.
import subprocess
rc = subprocess.run(['python3', '-I', 'reconcile-full.py', '--ledger', 'ledger/ledger-2026-10-13-final.json', '--before', '986.84718000'], cwd=os.path.join(W, 'capture-full-2026-10-12'), capture_output=True, text=True)
assert rc.returncode == 0, rc.stdout[-400:] + rc.stderr[-400:]
open(os.path.join(EV, 'E04-account-reconcile-2026-10-13.txt'), 'w', encoding='utf-8').write(rc.stdout); print('wrote E04')

# E05 the empty-client-seed control of Phase D (POST /change_seed with clientSeed "")
dp = os.path.join(PKG, 'data', 'supplementary', 'housebets-hilo-phaseD-playerseeds-200rounds.json'); draw = open(dp, 'rb').read()
dump('E05-hilo-empty-seed-control-2026-10-13.json', {'exhibit': 'E05', 'what': "Phase D empty-seed control: the server's answer to POST /change_seed {gameType: hilo2, clientSeed: \"\"}",
     'source': {'file': 'data/supplementary/housebets-hilo-phaseD-playerseeds-200rounds.json', 'sha256': sha(draw), 'field': 'meta.emptySeedControl'}, 'record': json.loads(draw)['meta']['emptySeedControl']})

# E06 the start card in the live hilo2 bundle: the page draws it, carries it over, and sends it in the bet body; and
# the rules panel's return and start-card texts (English), the fairness request whose
# answer the page keeps as its settings, and the button gate that offers hi / lo only when the served button is allowed
bp = os.path.join(W, 'bundles', 'platform-housegames-hilo2-game.js'); braw = open(bp, 'rb').read(); bt = braw.decode('utf-8', 'replace')
pats = {
    'draw (li): a card id drawn as crypto Uint32 mod 52 (2^32 mod 52 = 48, so within about 1e-8 of uniform, not exactly), Math.random if crypto throws': r'function li\(\)\{try\{var q=new Uint32Array\(1\);return window\.crypto\.getRandomValues\(q\),q\[0\]%52\}catch\{return Math\.floor\(Math\.random\(\)\*52\)\}\}',
    'set (ui): the start card is page state, persisted in local storage': r'function ui\(q,e\)\{return Ft\(q\)&&\(S\.startCard=q,Dt\(Le,"startCard",String\(q\),"hh-start"\),vq\("start:card",\{card:q,from:e\|\|"carry"\}\),vq\("state",S\)\),S\}',
    'free skip (ip): a new drawn card, different from the current one, before a bet': r'function ip\(\)\{if\(S\.busy\|\|S\.round&&S\.round\.active\|\|Hn\(\)\)return!1;for\(var q=li\(\);q===S\.startCard;\)q=li\(\);return ui\(q,"skip"\),!0\}',
    'first load: the stored start card, else a drawn one': r'\(function\(\)\{var q=parseInt\(It\(Le,"startCard","hh-start",null\),10\);S\.startCard=Ft\(q\)\?q:li\(\)\}\)\(\)',
    'carry-over: after a round, its last card becomes the next start card': r'var r=q\.cards\[q\.cards\.length-1\];Ft\(r\)&&r!==S\.startCard&&ui\(r,"carry"\)',
    'bet body: the page sends the start card': r'h=\{amount:e,startCard:S\.startCard,currency:S\.currency\}',
    'rules panel, return (rulesHiloReturn, English)': r'rulesHiloReturn:"Every way of playing returns[^"]*"',
    'rules panel, start card (rulesHiloStart, English)': r'rulesHiloStart:"A round starts on the card on top[^"]*"',
    'fairness request (th): the page fetches /<game>/fairness and keeps the answer as its settings (setFairnessSpec)': r'function th\(q,e\)\{At\("/"\+ae\+"/fairness",\{deadlineMs:qh\}\)\.then\(function\(t\)\{if\(!Pt\(t\)\)throw _r\(0,null,"fairness answer unreadable"\);yq\.epoch===q&&typeof G\.setFairnessSpec=="function"&&G\.setFairnessSpec\(t\)\}\)',
    'button gate (iu): the page offers hi / lo only when the served button is allowed': r'function iu\(q,e\)\{if\(!q\|\|!q\.active\|\|!q\.options\)return!1;var t=q\.options\[e\];return e==="hi"\|\|e==="lo"\?!!\(t&&t\.allowed\):!!t\}',
}
found = {}
for k, p in pats.items():
    m = re.search(p, bt); assert m, f'bundle text moved: {k}'; found[k] = m.group(0)
dump('E06-hilo2-bundle-start-card-2026-10-10.json', {'exhibit': 'E06', 'what': 'HouseBets hilo2 game page, as shipped in the bundle the live page loads: how the start card is chosen and sent (the server is not shown choosing it); the rules panel return and start-card texts (English); the fairness request; the hi / lo button gate',
     'source': {'file': 'bundles/platform-housegames-hilo2-game.js (HouseBets workshop)', 'sha256': sha(braw), 'bytes': len(braw), 'checkedOnLivePage': '2026-10-10 (bundles/LIVE-BUNDLES.md: script tag on the hilo page)'},
     'excerpts': found})
