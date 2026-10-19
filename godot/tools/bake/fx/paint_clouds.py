# Kullanım: python3 tools/bake/fx/paint_clouds.py godot/assets/fx/clouds
# Çizgi film bulut sprite'ları (ressam algoritması): puflar arkadan öne sırayla boyanır; her puf
# kendi içinde ışık tarafında parlak hilal, karşı yanında gölge hilali, kenarında mürekkep çizgi
# taşır → puflar arası doğal kıvrım çizgileri. 2× çözünürlükte boyanıp küçültülür (kenar yumuşar).
# Çıkış RGBA: R=ton (0 gölge · .5 gövde · 1 ışık) · G=mürekkep · B=1 · A=örtü.
import numpy as np, sys
from PIL import Image
S=1024
def ss(e0,e1,v):
    t=np.clip((v-e0)/(e1-e0),0,1); return t*t*(3-2*t)
def paint(seed, out, elong, n_core, n_rim):
    rng=np.random.default_rng(seed)
    y,x=np.mgrid[0:S,0:S].astype(np.float32)
    ax,ay=S*0.29*elong, S*0.29/elong*0.72
    P=[]
    for i in range(n_rim):
        a=2*np.pi*i/n_rim+rng.uniform(-0.2,0.2)
        P.append((S/2+np.cos(a)*ax*0.8, S/2+np.sin(a)*ay*0.8, S*rng.uniform(0.09,0.13)))
    for i in range(n_core):
        a=rng.uniform(0,2*np.pi); rr=np.sqrt(rng.uniform(0,1))*0.5
        P.append((S/2+np.cos(a)*rr*ax, S/2+np.sin(a)*rr*ay-S*0.03, S*rng.uniform(0.13,0.18)))
    # arkadan öne: üstteki (küçük y) önce; çekirdek puflar daha "yüksek" → sona
    P.sort(key=lambda p: p[1]+p[2]*1.6)
    L=np.array([-0.62,-0.78]); L/=np.linalg.norm(L)
    tone=np.zeros((S,S),np.float32); ink=np.zeros((S,S),np.float32); alpha=np.zeros((S,S),np.float32)
    lw=S*0.0045
    for (cx,cy,r) in P:
        d=np.hypot(x-cx,y-cy)
        inside=ss(r+1.5,r-1.5,d)
        # hilaller: puf ışığa doğru kaydırılınca dışarıda kalan → gölge; ters → ışık
        dsh=np.hypot(x-(cx+L[0]*r*0.26), y-(cy+L[1]*r*0.26))
        dhi=np.hypot(x-(cx-L[0]*r*0.09), y-(cy-L[1]*r*0.09))
        t=np.full((S,S),0.5,np.float32)
        t=np.where(dsh>r*0.99, 0.0, t)
        t=np.where((dhi>r*0.985)&(dsh<=r*0.99), 1.0, t)
        # arkadaki puflar biraz koyu (derinlik)
        t=np.where(t==0.5, 0.5-0.12*(1-(cy/S)), t)
        # yumuşat (keskin ama aliasingsiz: süper örnekleme halleder)
        tone=tone*(1-inside)+t*inside
        # iç çizgi yalnız gölge tarafında, uçlara doğru incelen yay
        face=((x-cx)*(-L[0])+(y-cy)*(-L[1]))/np.maximum(d,1e-3)
        wgt=ss(-0.35,0.45,face)
        e=1-ss(lw*0.5*(0.3+wgt),lw*1.2*(0.3+wgt),np.abs(d-r+lw*0.6))
        ink=ink*(1-inside)
        ink=np.maximum(ink, e*wgt*ss(r+lw*2,r-lw,d))
        alpha=np.maximum(alpha,inside)
    # dış kontur daha kalın
    sd=np.full((S,S),1e9,np.float32)
    for (cx,cy,r) in P: sd=np.minimum(sd,np.hypot(x-cx,y-cy)-r)
    outer=1-ss(lw*1.2,lw*2.6,np.abs(sd+lw*0.8))
    ink=np.maximum(ink,outer)
    alpha=np.maximum(alpha, outer*ss(lw*3,lw*1.5,sd))
    img=np.stack([tone,ink,np.ones_like(tone),alpha],-1)
    im=Image.fromarray((np.clip(img,0,1)*255).round().astype(np.uint8),'RGBA')
    im.resize((S//2,S//2),Image.LANCZOS).save(out)
specs=[(3,1.3,7,18),(8,1.0,6,16),(21,1.55,8,20),(34,0.95,5,14)]
for i,s in enumerate(specs): paint(s[0], sys.argv[1]+'/cloud%d.png'%i, s[1], s[2], s[3])
