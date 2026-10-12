/* Pişirme sayfaları için ortak yardımcılar. */
export function b64(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
  return btoa(s);
}
export async function save(rel, data) {
  let buf = data;
  if (data instanceof Blob) buf = await data.arrayBuffer();
  else if (typeof data === 'string') buf = new TextEncoder().encode(data);
  await window.__save(rel, b64(buf));
}
export function saveJSON(rel, obj) { return save(rel, JSON.stringify(obj, null, 1)); }
export async function canvasPNG(cv) {
  if (cv.convertToBlob) return cv.convertToBlob({ type: 'image/png' });
  return new Promise((r) => cv.toBlob(r, 'image/png'));
}
export function done(err) {
  if (err) { window.__err = String(err && err.stack || err); console.error(window.__err); }
  window.__done = true;
}
/* Dışa aktarılmayan iç fonksiyonlara ulaşmak için: modül kaynağını getirir,
   göreli içe aktarmaları mutlak yola çevirir, sonuna `export { ... }` ekler
   ve Blob URL'den içe aktarır. Aynı ?v sorgusu korunduğu için bağımlılıklar
   oyunun kendi modül örnekleriyle PAYLAŞILIR. */
export async function importPatched(path, names) {
  let src = await (await fetch(path)).text();
  const base = path.slice(0, path.lastIndexOf('/') + 1);
  src = src.replace(/from\s+'\.\/([^']+)'/g, (_, p) => "from '" + location.origin + base + p + "'");
  src += '\nexport { ' + names.join(', ') + ' };\n';
  const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
  return import(url);
}
