class_name Combat
## combat.js — Hasar Hesabı ve Vuruş Hissi (birebir).
## Tüm silahlar düşmana buradan vurur; tüm düşmanlar oyuncuya buradan vurur.

const FEEL := {
	"stopHit": 0.045, "stopCrit": 0.085, "stopBoss": 0.03, "stopCd": 0.22,
	"squashHit": 0.15, "squashCrit": 0.21,
	"mergeWin": 0.42, "mergeMaxSize": 19,
	"kickCrit": 2.6, "kickHurt": 4.2,
}
const BLOOD := "#a31226"
const BLOOD_DARK := "#6e0b18"

static var last_stop := -10.0

static func reset_feel() -> void:
	last_stop = -10.0

## Kritik + varyans + küresel hasar çarpanı → {dmg, crit}
static func roll_damage(game, base: float, extra_crit: float = 0.0) -> Dictionary:
	var p = game.player
	var crit: bool = randf() < p.critChance + extra_crit
	var d: float = base * p.dmgMult * (0.92 + randf() * 0.16)
	if crit: d *= p.critMult
	return {"dmg": maxf(1.0, JS.round_js(d)), "crit": crit}

static func apply_hit(game, e: Ent.Enemy, base: float, angle: float = 0.0, knock: float = 0.0, extra_crit: float = 0.0, silent: bool = false):
	if e.hp <= 0: return null
	if e.entryT > 0: return null
	var r := roll_damage(game, base, extra_crit)
	e.lastCrit = r.crit
	if e.weakT > 0: r.dmg = JS.round_js(r.dmg * 1.5)
	if e.shieldHp > 0:
		var ab := minf(e.shieldHp, r.dmg * 0.7)
		e.shieldHp -= ab
		r.dmg = maxf(1.0, JS.round_js(r.dmg - ab))
		if e.shieldHp <= 0 and game.in_view(e.x, e.y, 40):
			game.spawn_burst(e.x, e.y, "#9fb4c9", 12, 220, 2.6, 0.45, true)
			game.spawn_text(e.x, e.y - e.radius - 20, "KALKAN KIRILDI", "#cfd6e2", 12, true)
			game.audio.play("shieldbreak")
	e.regenT = 0
	e.hp -= r.dmg
	e.flash = D.FX.hitFlashTime
	e.hurtAng = angle
	e.hitT = FEEL.squashCrit if r.crit else FEEL.squashHit
	e.hitD = e.hitT
	if not (e.hurtT > 0): e.hurtT = 0.26
	if knock > 0:
		var k := knock * e.knockRes
		e.kx += cos(angle) * k
		e.ky += sin(angle) * k
	if game.player.lifeSteal > 0: game.player.drain(r.dmg)
	if silent: return r

	if not (e.stopCd > 0):
		var wK := 1.4 if knock >= 220 else (0.6 if (knock > 0 and knock <= 60) else 1.0)
		e.stopT = FEEL.stopBoss if e.isBoss else (FEEL.stopCrit if r.crit else FEEL.stopHit) * wK
		e.stopMv = not e.isBoss and (r.crit or wK > 1)
		e.stopCd = FEEL.stopCd

	var tx := e.x + (randf() - 0.5) * 12.0
	var ty := e.y - e.radius - 6.0
	if r.crit:
		game.spawn_text(tx, ty, JS.s(r.dmg), D.COLORS.gold, 21, true, angle)
	else:
		var o = e.txt
		if o != null and o.owner == e and o.pi >= 0 and not o.crit and game.time - e.txtT < FEEL.mergeWin:
			o.val += r.dmg
			o.str = JS.s(o.val)
			o.pt = 0.0; o.pk = 1.3
			o.life = maxf(o.life, o.max * 0.8)
			if o.size < FEEL.mergeMaxSize: o.size += 0.7
			if o.y > ty: o.y = ty
		else:
			var t = game.spawn_text(tx, ty, JS.s(r.dmg), D.COLORS.bone, 13, false, angle)
			if t:
				t.owner = e
				t.val = r.dmg
			e.txt = t
		e.txtT = game.time

	if game.renderer3d and game.in_view(e.x, e.y, 60):
		if r.crit: game.renderer3d.spawn_hit(e.x, e.y, angle, 2 if e.isBoss else 1, 1, 0.80, 0.34)
		else: game.renderer3d.spawn_hit(e.x, e.y, angle, 0, 1, 0.90, 0.74)

	if not e.isBoss and game.in_view(e.x, e.y, 60):
		var n := 3 if r.crit else 2
		for i in n:
			var a := angle + (randf() - 0.5) * 0.7
			var sp := 150.0 + randf() * 190.0
			game.pools.particles.take().setup(e.x, e.y + 2, cos(a) * sp, sin(a) * sp - 40,
				0.16 + randf() * 0.1, 2.2 if r.crit else 1.7,
				"#ffe9a8" if r.crit else "#fff4dc", 0.86, 40, true)

	game.spawn_spray(e.x, e.y, angle, BLOOD, 10 if r.crit else 5, 250 if r.crit else 170)
	if r.crit:
		game.spawn_burst(e.x, e.y, "#ffe9a8", 6, 220, 2, 0.3, true)
		game.spawn_spray(e.x, e.y, angle, BLOOD_DARK, 5, 130)

	if r.crit:
		game.hit_stop(D.FX.bossHitStopMs if e.isBoss else D.FX.critStopMs)
		game.add_shake(D.FX.shakeCrit)
		game.add_kick(angle, FEEL.kickCrit)
		game.fx_impact(e.x, e.y, angle, 1)
		last_stop = game.time
		game.audio.play("crit")
		Quality.haptic("crit")
	else:
		if game.time - last_stop > 0.3:
			game.add_shake(D.FX.shakeHit)
			last_stop = game.time
		game.audio.play("hit")
	return r

## Oyuncuya hasar: zırh düşülür, dokunulmazlık açılır, kızıl vinyet çakar.
static func damage_player(game, raw: float, sx = null, sy = null) -> void:
	var p = game.player
	if p.invuln > 0 or game.state != "playing" or not (raw > 0): return
	if p.dodge > 0 and randf() < p.dodge:
		p.invuln = 0.25
		game.spawn_text(p.x, p.y - 26, "SIYRILDI", D.COLORS.spirit, 15, false)
		game.audio.play("dodge")
		return
	if game.powerups and game.powerups.absorbs():
		game.spawn_text(p.x, p.y - 26, "KALKAN", "#ffd45a", 15, false)
		game.spawn_burst(p.x, p.y, "#ffd45a", 8, 130, 2.6, 0.32, true)
		game.audio.play("block")
		return
	var dmg := maxf(1.0, JS.round_js(raw) - p.armor)
	p.hp -= dmg
	p.invuln = p.invulnTime
	p.hurtT = 0.34
	game.ui.hurt_flash()
	game.add_shake(D.FX.shakeHurt)
	var has_src := sx != null
	var src_a := atan2(float(sy) - p.y, float(sx) - p.x) if has_src else 0.0
	if has_src: game.ui.hurt_dir(src_a)
	game.add_kick(src_a + PI if has_src else p.facing + PI, FEEL.kickHurt)
	Quality.haptic("hurt")
	game.audio.play("hurt")
	game.spawn_text(p.x, p.y - 26, "-" + JS.s(dmg), D.COLORS.blood, 17, true)
	game.spawn_burst(p.x, p.y, BLOOD, 9, 170, 2.6, 0.4, false)
	if p.hp <= 0:
		p.hp = 0
		game.game_over()
