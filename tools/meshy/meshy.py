#!/usr/bin/env python3
"""Meshy API ile düşman üretim hattı (yalnız stdlib).

Anahtar: MESHY_API_KEY ortam değişkeni ya da --key-file (depoya ASLA yazılmaz).
Durum ve indirmeler: --out klasörü (varsayılan ./meshy_out), her ad için <ad>/state.json.

Komutlar:
  balance                         kalan kredi
  preview <ad> <prompt-dosyası>   düşük poligonlu ağ (smart-topology, A-poz) + küçük resim
  refine  <ad>                    doku (2K) — prompt aynı dosyadan
  rig     <ad> [--height 1.7]     iskelet + hazır yürüme/koşu animasyonlu GLB'ler
  all     <ad> <prompt-dosyası>   preview → refine → rig
Her adım harcanan krediyi (consumed_credits) yazar.
"""
import argparse, json, os, sys, time, urllib.request, urllib.error

API = "https://api.meshy.ai"

def key(args):
    k = os.environ.get("MESHY_API_KEY", "")
    if not k and args.key_file:
        with open(args.key_file) as f: k = f.read().strip()
    if not k: sys.exit("MESHY_API_KEY yok")
    return k

def req(args, method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(API + path, data=data, method=method)
    r.add_header("Authorization", "Bearer " + key(args))
    if data: r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            return json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code} {path}: {e.read().decode()[:500]}")

def download(url, dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with urllib.request.urlopen(url, timeout=300) as r, open(dst, "wb") as f:
        f.write(r.read())
    return dst

def wait(args, path, tid):
    last = -1
    while True:
        t = req(args, "GET", f"{path}/{tid}")
        st, pr = t.get("status"), t.get("progress", 0)
        if pr != last:
            print(f"  {st} %{pr}", flush=True); last = pr
        if st in ("SUCCEEDED", "FAILED", "CANCELED"):
            if st != "SUCCEEDED": sys.exit(f"görev {st}: {t.get('task_error')}")
            return t
        time.sleep(6)

def state_path(args, name): return os.path.join(args.out, name, "state.json")
def load(args, name):
    p = state_path(args, name)
    return json.load(open(p)) if os.path.exists(p) else {}
def save(args, name, s):
    os.makedirs(os.path.join(args.out, name), exist_ok=True)
    json.dump(s, open(state_path(args, name), "w"), indent=1)

def prompt_of(path):
    with open(path) as f: return " ".join(f.read().split())[:800]

def cmd_balance(args):
    print(json.dumps(req(args, "GET", "/openapi/v1/balance")))

def cmd_preview(args):
    s = load(args, args.name)
    s["prompt"] = prompt_of(args.prompt)
    body = {"mode": "preview", "prompt": s["prompt"], "model_type": "smart-topology", "ai_model": args.model,
            "target_polycount": args.poly, "pose_mode": "a-pose", "target_formats": ["glb"], "origin_at": "bottom"}
    tid = req(args, "POST", "/openapi/v2/text-to-3d", body)["result"]
    print("preview", tid)
    t = wait(args, "/openapi/v2/text-to-3d", tid)
    s["preview"] = tid
    s["credits"] = s.get("credits", 0) + int(t.get("consumed_credits", 0))
    if t.get("thumbnail_url"): download(t["thumbnail_url"], os.path.join(args.out, args.name, "preview.png"))
    save(args, args.name, s)
    print("kredi:", t.get("consumed_credits"), "toplam:", s["credits"])

def cmd_refine(args):
    s = load(args, args.name)
    body = {"mode": "refine", "preview_task_id": s["preview"], "texture_prompt": s["prompt"],
            "texture_resolution": "2k", "target_formats": ["glb"], "origin_at": "bottom"}
    tid = req(args, "POST", "/openapi/v2/text-to-3d", body)["result"]
    print("refine", tid)
    t = wait(args, "/openapi/v2/text-to-3d", tid)
    s["refine"] = tid
    s["credits"] = s.get("credits", 0) + int(t.get("consumed_credits", 0))
    download(t["model_urls"]["glb"], os.path.join(args.out, args.name, "textured.glb"))
    if t.get("thumbnail_url"): download(t["thumbnail_url"], os.path.join(args.out, args.name, "textured.png"))
    save(args, args.name, s)
    print("kredi:", t.get("consumed_credits"), "toplam:", s["credits"])

def cmd_rig(args):
    s = load(args, args.name)
    body = {"input_task_id": s["refine"], "height_meters": args.height}
    tid = req(args, "POST", "/openapi/v1/rigging", body)["result"]
    print("rig", tid)
    t = wait(args, "/openapi/v1/rigging", tid)
    s["rig"] = tid
    s["credits"] = s.get("credits", 0) + int(t.get("consumed_credits", 0))
    res = t.get("result", {})
    d = os.path.join(args.out, args.name)
    if res.get("rigged_character_glb_url"): download(res["rigged_character_glb_url"], os.path.join(d, "rigged.glb"))
    an = res.get("basic_animations", {}) or {}
    for k in ("walking_glb_url", "running_glb_url"):
        if an.get(k): download(an[k], os.path.join(d, k.split("_")[0] + ".glb"))
    save(args, args.name, s)
    print("kredi:", t.get("consumed_credits"), "toplam:", s["credits"])

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--key-file")
    ap.add_argument("--out", default="meshy_out")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("balance")
    for c in ("preview", "all"):
        p = sub.add_parser(c); p.add_argument("name"); p.add_argument("prompt")
        p.add_argument("--model", default="meshy-t2.5"); p.add_argument("--poly", type=int, default=6000)
        p.add_argument("--height", type=float, default=1.7)
    p = sub.add_parser("refine"); p.add_argument("name")
    p = sub.add_parser("rig"); p.add_argument("name"); p.add_argument("--height", type=float, default=1.7)
    args = ap.parse_args()
    if args.cmd == "balance": cmd_balance(args)
    elif args.cmd == "preview": cmd_preview(args)
    elif args.cmd == "refine": cmd_refine(args)
    elif args.cmd == "rig": cmd_rig(args)
    elif args.cmd == "all":
        cmd_preview(args); cmd_refine(args); cmd_rig(args)

if __name__ == "__main__":
    main()
