class_name Txt
## Metin yardımcıları — JS'in toLocaleUpperCase('tr') / toLowerCase('tr')
## davranışını (i→İ, ı→I) birebir verir. Godot'un to_upper()'ı dil
## bağımsızdır ve "Kızıl şifa" → "KIZIL ŞIFA" yazar; oyun "ŞİFA" bekler.

static func upper_tr(s: String) -> String:
	return s.replace("i", "İ").replace("ı", "I").to_upper()

static func lower_tr(s: String) -> String:
	return s.replace("İ", "i").replace("I", "ı").to_lower()
