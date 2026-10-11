class_name Pool
extends RefCounted
## pool.js — Nesne Havuzu (sıfır tahsis).
## Aktif liste "swap-remove" ile O(1) silinir; geriye doğru gezinirken
## silmek güvenlidir. `pi` alanı aktif dizideki indeksi tutar (çifte iade
## koruması). Nesne kurulumu (web'deki reset) nesnenin setup()'ındadır.

var name: String
var factory: Callable
var idle: Array = []
var active: Array = []
var created := 0

func _init(n: String, f: Callable, initial: int = 64) -> void:
	name = n
	factory = f
	for i in initial:
		idle.append(factory.call())
		created += 1

func prewarm(n: int) -> Pool:
	while created < n:
		idle.append(factory.call())
		created += 1
	return self

## Havuzdan al ve aktif listeye ekle. Kurulumu çağıran yapar (o.setup(...)).
func take() -> Object:
	var obj: Object
	if idle.size() > 0:
		obj = idle.pop_back()
	else:
		obj = factory.call()
		created += 1
	obj.pi = active.size()
	active.append(obj)
	return obj

func release(obj: Object) -> void:
	var idx: int = obj.pi
	if idx < 0 or idx >= active.size() or active[idx] != obj: return
	var last = active.pop_back()
	if last != obj:
		active[idx] = last
		last.pi = idx
	obj.pi = -1
	idle.append(obj)

func release_all() -> void:
	var i := active.size() - 1
	while i >= 0:
		release(active[i])
		i -= 1

var count: int:
	get: return active.size()
