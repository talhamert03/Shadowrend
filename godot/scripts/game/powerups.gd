class_name PowerupManager
extends RefCounted
## powerups.js — Düşmandan düşen güçler (MIKNATIS · CAN · KALKAN · DONDURMA).

const PU := {
	"magnet": {"col": "#5ad2ff", "dim": "rgba(90,210,255,0.28)", "glyph": "U", "dur": 10.0, "label": "MIKNATIS"},
	"heal":   {"col": "#ff5a72", "dim": "rgba(255,90,114,0.28)", "glyph": "+", "dur": 0.0, "label": "CAN"},
	"shield": {"col": "#ffd45a", "dim": "rgba(255,212,90,0.28)", "glyph": "O", "dur": 7.0, "label": "KALKAN"},
	"freeze": {"col": "#a8e8ff", "dim": "rgba(168,232,255,0.28)", "glyph": "*", "dur": 3.6, "label": "DONDURMA"},
}
const MAGNET_MUL := 4.5
const KINDS := ["magnet", "heal", "shield", "freeze"]
const WEIGHTS := [0.26, 0.34, 0.22, 0.18]
const MAX_LIVE := 7
const DROP_CHANCE := 0.021
const ELITE_CHANCE := 0.16

var game
var magnetT := 0.0
var shieldT := 0.0
var freezeT := 0.0

func _init(g) -> void:
	game = g

func reset() -> void:
	magnetT = 0; shieldT = 0; freezeT = 0

func roll(x: float, y: float, elite: bool) -> void:
	var pool = game.pools.powerups
	if pool == null or pool.count >= MAX_LIVE: return
	var ch := ELITE_CHANCE if elite else DROP_CHANCE
	if randf() > ch: return
	var r := randf()
	var k := 0
	for i in WEIGHTS.size():
		r -= WEIGHTS[i]
		if r <= 0:
			k = i
			break
	if KINDS[k] == "heal" and game.player.hp > game.player.maxHp * 0.92: k = 2
	pool.take().setup(x, y, KINDS[k])

func collect(kind: String) -> void:
	var g = game
	var p = g.player
	var d: Dictionary = PU[kind]
	if kind == "heal":
		p.heal(maxf(12.0, JS.round_js(p.maxHp * 0.26)))
	elif kind == "magnet":
		magnetT = maxf(magnetT, d.dur)
		for o in g.pools.gems.active: o.pull = true
		for o in g.pools.hearts.active: o.pull = true
	elif kind == "shield":
		shieldT = d.dur
	elif kind == "freeze":
		freezeT = d.dur
	g.spawn_burst(p.x, p.y, d.col, 20, 210, 3.4, 0.55, true)
	if g.renderer3d: g.renderer3d.spawn_hit(p.x, p.y, 0, 1, 1, 1, 1)
	g.audio.play("heal" if kind == "heal" else "levelup")
	g.ui.powerup_flash(kind)

func update(dt: float) -> void:
	if magnetT > 0:
		magnetT -= dt
		for o in game.pools.gems.active: o.pull = true
		for o in game.pools.hearts.active: o.pull = true
	if shieldT > 0: shieldT -= dt
	if freezeT > 0:
		freezeT -= dt
		if freezeT <= 0: game.audio.play("thaw")

func absorbs() -> bool: return shieldT > 0
func frozen() -> bool: return freezeT > 0
func magnet_mul() -> float: return MAGNET_MUL if magnetT > 0 else 1.0
