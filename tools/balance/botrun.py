#!/usr/bin/env python3
"""Denge botu matrisi: oyunu bot=1 ile hızlandırılmış oynatır, BOTRESULT satırlarını JSONL'e yazar.
Kullanım: botrun.py çıktı.jsonl hero1,hero2 dünyalar(1-10) bölümler(1,5,10) tohum_sayısı [beceri] [paralel] [ek argümanlar...]"""
import subprocess, sys, json, os, itertools
from concurrent.futures import ThreadPoolExecutor
G = os.environ.get("GODOT_BIN"); P = os.path.join(os.path.dirname(__file__), "..", "..", "godot")
# simülasyondan beklenen güç (dünya → kahraman seviyesi, ekipman nadirlik:seviye)
EXP = {1: (1, ""), 2: (3, "1:2"), 3: (4, "2:2"), 4: (5, "2:3"), 5: (6, "2.5:3"), 6: (6, "3:3"),
       7: (7, "3:4"), 8: (7, "3:4"), 9: (8, "4:3"), 10: (8, "4:4")}
def parse(s):
    out = []
    for part in s.split(","):
        if "-" in part: a, b = part.split("-"); out += list(range(int(a), int(b) + 1))
        else: out.append(part if not part.isdigit() else int(part))
    return out
def one(job):
    hero, w, m, seed, skill, extra = job
    lv, gear = EXP[w]
    args = ["autorun", "bot=1", f"char={hero}", f"world={w}", f"mission={m}", "speed=8", f"botskill={skill}", f"seed={seed}", f"lvl={lv}"]
    if gear: args.append(f"gear={gear}")
    args += extra
    env = dict(os.environ, DISPLAY=os.environ.get("DISPLAY", ":98"))
    try:
        r = subprocess.run([G, "--path", P, "--audio-driver", "Dummy", "--resolution", "270x480", "--"] + args,
                           capture_output=True, text=True, timeout=1500, env=env)
        for line in r.stdout.splitlines():
            if line.startswith("BOTRESULT "): return json.loads(line[10:])
    except Exception as e: return {"err": str(e), "char": hero, "world": w, "mission": m}
    return {"err": "noresult", "char": hero, "world": w, "mission": m}
if __name__ == "__main__":
    out, heroes, worlds, missions, seeds = sys.argv[1], sys.argv[2].split(","), parse(sys.argv[3]), parse(sys.argv[4]), int(sys.argv[5])
    skill = sys.argv[6] if len(sys.argv) > 6 else "0.5"; par = int(sys.argv[7]) if len(sys.argv) > 7 else 3; extra = sys.argv[8:]
    jobs = [(h, w, m, s, skill, extra) for s in range(seeds) for w in worlds for m in missions for h in heroes]
    with ThreadPoolExecutor(par) as ex, open(out, "a") as f:
        for res in ex.map(one, jobs):
            f.write(json.dumps(res, ensure_ascii=False) + "\n"); f.flush()
            print(res.get("char"), res.get("world"), res.get("mission"), "KAZANDI" if res.get("won") else "kaybetti", res.get("time"), "minHp", res.get("minHp"), flush=True)
