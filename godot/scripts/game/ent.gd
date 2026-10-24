class_name Ent
## Havuz nesneleri — main.js havuz fabrikaları + enemyManager düşman
## nesnesi. Her alan web'deki adıyla (camelCase) tutulur ki port edilen
## kod satır satır okunabilsin. setup() = web'deki havuz reset fonksiyonu.

class Particle:
	var pi := -1
	var x := 0.0; var y := 0.0; var vx := 0.0; var vy := 0.0
	var life := 0.0; var max := 1.0; var size := 2.0
	var color := Color.WHITE
	var drag := 1.0; var grav := 0.0; var add := false
	func setup(px, py, pvx, pvy, plife, psize, pcolor, pdrag, pgrav, padd) -> Particle:
		x = px; y = py; vx = pvx; vy = pvy
		life = plife; max = plife; size = psize; color = JS.col(pcolor)
		drag = pdrag; grav = pgrav; add = padd
		return self

class FloatText:
	var pi := -1
	var x := 0.0; var y := 0.0; var vx := 0.0; var vy := 0.0
	var life := 0.0; var max := 1.0
	var str := ""
	var color := Color.WHITE
	var size := 14.0
	var crit := false
	var pt := 0.0; var pk := 1.0
	var owner = null
	var val := 0.0
	var rot := 0.0
	var arc := false       # sayı: fırlar, yay çizip düşer (Borderlands); etiketler süzülür
	func setup(px, py, pstr, pcolor, psize, pcrit, ang, life_base: float) -> FloatText:
		x = px; y = py
		str = pstr; color = JS.col(pcolor); size = psize; crit = pcrit
		arc = String(pstr).is_valid_int()
		if arc:
			var side := (cos(ang) if ang != null else (randf() - 0.5) * 2.0)
			vx = side * (70.0 if pcrit else 46.0) + (randf() - 0.5) * 50.0
			vy = -250.0 if pcrit else -185.0
			rot = (randf() - 0.5) * (0.36 if pcrit else 0.14)
		else:
			vy = -64.0 if pcrit else -48.0
			vx = 0.0 if ang == null else cos(ang) * 34.0 + (randf() - 0.5) * 18.0
			rot = 0.0
		life = life_base * (1.25 if pcrit else 1.05); max = life
		pt = 0.0; pk = 2.2 if pcrit else 1.55
		owner = null; val = 0.0
		return self

class Gem:
	var pi := -1
	var x := 0.0; var y := 0.0; var vx := 0.0; var vy := 0.0
	var value := 1.0; var tier := 0
	var pull := false; var pt := 0.0; var bob := 0.0
	func setup(px, py, pvalue) -> Gem:
		x = px; y = py
		vx = (randf() - 0.5) * 90.0
		vy = (randf() - 0.5) * 90.0
		value = pvalue; pull = false; pt = 0.0
		bob = randf() * PI * 2.0
		tier = D.gem_tier_for(pvalue)
		return self

class Heart:
	var pi := -1
	var x := 0.0; var y := 0.0; var vx := 0.0; var vy := 0.0
	var amount := 0.0; var pull := false; var bob := 0.0; var life := 0.0
	func setup(px, py, pamount) -> Heart:
		x = px; y = py
		vx = (randf() - 0.5) * 70.0
		vy = (randf() - 0.5) * 70.0
		amount = pamount; pull = false
		bob = randf() * PI * 2.0
		life = 26.0
		return self

class PowerupDrop:
	var pi := -1
	var x := 0.0; var y := 0.0; var vx := 0.0; var vy := 0.0
	var kind := "heal"; var bob := 0.0; var life := 0.0; var pull := false
	func setup(px, py, pkind) -> PowerupDrop:
		x = px; y = py
		vx = (randf() - 0.5) * 60.0
		vy = (randf() - 0.5) * 60.0
		kind = pkind; pull = false
		bob = randf() * PI * 2.0
		life = 40.0
		return self

class PBullet:
	var pi := -1
	var x := 0.0; var y := 0.0; var vx := 0.0; var vy := 0.0
	var dmg := 0.0; var pierce := 0.0; var life := 0.0; var r := 5.0
	var angle := 0.0; var color := "#59e3c8"; var lastHit = null
	var isArrow := false; var bounce := 0; var flame := 0; var homing := 0
	var explode := 0; var split := 0; var frag := false; var smoke := 0; var metal := false
	var fireball := false; var ph := 0.0; var nova := 0; var burned := false; var critAdd := 0.0
	var stone := false; var shatter := 0
	var trT := 0.0
	func setup(px, py, pvx, pvy, pdmg, ppierce, plife, pr, pcolor) -> PBullet:
		x = px; y = py; vx = pvx; vy = pvy
		dmg = pdmg; pierce = ppierce; life = plife; r = pr
		angle = atan2(pvy, pvx)
		color = pcolor if pcolor else "#59e3c8"
		lastHit = null
		split = 0; frag = false; smoke = 0; metal = false
		fireball = false; ph = 0.0; burned = false; nova = 0
		return self

class EBullet:
	var pi := -1
	var x := 0.0; var y := 0.0; var vx := 0.0; var vy := 0.0
	var dmg := 0.0; var life := 0.0; var r := 5.0; var hue := 0; var ph := 0.0
	var kind := 0          # 0 yalım (varsayılan) · 1 ok · 2 büyü küresi (pal renginde)
	var pal := ""          # R3Fx.FIRE_PAL anahtarı (kind 2)
	func setup(px, py, pvx, pvy, pdmg, plife, pr, phue) -> EBullet:
		x = px; y = py; vx = pvx; vy = pvy
		dmg = pdmg; life = plife; r = pr
		hue = JS.i(phue)
		kind = 0; pal = ""
		ph = randf() * 6.283
		return self

class Zone:
	var pi := -1
	var x := 0.0; var y := 0.0; var r := 0.0; var dps := 0.0
	var life := 0.0; var max := 1.0; var tick := 0.0; var seed := 0.0; var blue := false
	func setup(px, py, pr, pdps, plife) -> Zone:
		x = px; y = py; r = pr; dps = pdps
		life = plife; max = plife; tick = 0.0
		seed = randf() * PI * 2.0
		blue = false
		return self

class Bomb:
	var pi := -1
	var x := 0.0; var y := 0.0; var sx := 0.0; var sy := 0.0; var tx := 0.0; var ty := 0.0
	var t := 0.0; var dur := 1.0; var h := 0.0; var spin := 0.0; var dmg := 0.0; var radius := 0.0; var dist := 0.0
	func setup(psx, psy, ptx, pty, pdur, pdmg, pradius) -> Bomb:
		sx = psx; sy = psy; tx = ptx; ty = pty
		x = psx; y = psy; t = 0.0; dur = pdur; h = 0.0
		spin = randf() * 6.283; dmg = pdmg; radius = pradius
		dist = JS.hypot(ptx - psx, pty - psy)
		return self

class Ring:
	var pi := -1
	var x := 0.0; var y := 0.0; var r := 0.0; var max := 1.0
	var life := 0.0; var maxLife := 1.0; var color := Color.WHITE
	func setup(px, py, pr, plife, pcolor) -> Ring:
		x = px; y = py; r = 0.0; max = pr
		life = plife; maxLife = plife; color = JS.col(pcolor)
		return self

class Hazard:
	var pi := -1
	var x := 0.0; var y := 0.0; var r := 0.0; var t := 0.0; var tell := 0.0; var dur := 1.0
	var dmg := 0.0; var kind := 0; var hit := false; var tick := 0.0; var seed := 0.0
	var hue := 0; var pdur := 0.0; var pdmg := 0.0
	func setup(px, py, pr, pdmg_, ptell, pdur_, pkind, phue, ppdur, ppdmg) -> Hazard:
		x = px; y = py; r = pr; dmg = pdmg_
		t = 0.0; tell = ptell; dur = pdur_; kind = JS.i(pkind)
		hit = false; tick = 0.28
		seed = randf() * 6.283
		hue = JS.i(phue)
		pdur = ppdur if ppdur else 0.0
		pdmg = ppdmg if ppdmg else 0.0
		return self

class Enemy:
	var pi := -1
	var x := 0.0; var y := 0.0; var hp := 0.0; var maxHp := 0.0; var speed := 0.0; var radius := 0.0
	var dmg := 0.0; var xp := 0.0
	var type := ""; var color := ""; var knockRes := 1.0; var flash := 0.0; var kx := 0.0; var ky := 0.0
	var atkAnim := 0.0; var mvAmt := 0.0
	var seed := 0.0; var bob := 0.0; var obCd := 0.0; var swordId := 0; var isBoss := false
	var hitT := 0.0; var hitD := 0.15; var stopT := 0.0; var stopCd := 0.0; var stopMv := false
	var thief := false; var thiefStep := 0; var duelTok := 0; var txt = null; var txtT := -9.0
	var fireCd := 0.0; var range := 0.0; var bulletDmg := 0.0; var bulletSpeed := 0.0; var elite := false
	var affix := 0; var shieldHp := 0.0; var shieldMax := 0.0; var regenT := 0.0; var enraged := false; var affixCol := ""
	var state := "chase"; var stateT := 0.0; var cdx := 0.0; var cdy := 0.0; var dirx := 0.0; var diry := 0.0
	var chargeCd := 0.0; var spitCd := 0.0; var standD := 0.0
	var tx := 0.0; var ty := 0.0
	var fuse := 0.0; var auraT := 0.0; var auraDmg := 0.0; var hurtAng := 0.0; var leapCd := 0.0; var bossKind := "lord"
	var hurtT := 0.0; var entryT := 0.0; var prey := false; var _ultN := 0
	var phase := 0; var weakT := 0.0; var _wkFx := 0.0
	var waveHit := 0; var lastCrit := false
	# render tarafının yazdığı alanlar (render3d: __mdlTok/__mdlTop/__aliveTok/__bound/__score)
	var mdlTok := 0; var mdlTop := 0.0; var aliveTok := 0; var bound = null; var score := 0.0
