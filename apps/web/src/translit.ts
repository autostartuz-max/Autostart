// Lotinchadan kirillchaga transliteratsiya (o'zbek). Bir xil til — faqat yozuv o'zgaradi.
const CYR_MAP: Record<string, string> = {
  A: 'А', a: 'а', B: 'Б', b: 'б', V: 'В', v: 'в', G: 'Г', g: 'г', D: 'Д', d: 'д',
  E: 'Е', e: 'е', J: 'Ж', j: 'ж', Z: 'З', z: 'з', I: 'И', i: 'и', Y: 'Й', y: 'й',
  K: 'К', k: 'к', L: 'Л', l: 'л', M: 'М', m: 'м', N: 'Н', n: 'н', O: 'О', o: 'о',
  P: 'П', p: 'п', R: 'Р', r: 'р', S: 'С', s: 'с', T: 'Т', t: 'т', U: 'У', u: 'у',
  F: 'Ф', f: 'ф', X: 'Х', x: 'х', H: 'Ҳ', h: 'ҳ', Q: 'Қ', q: 'қ', C: 'К', c: 'к',
  W: 'В', w: 'в', "'": 'ъ', 'ʼ': 'ъ', 'ʻ': 'ъ',
};

export function latToCyr(s: string): string {
  if (!s) return s;
  let r = s;
  const dg: [RegExp, string][] = [
    [/O[`'ʻʼ‘’]/g, 'Ў'], [/o[`'ʻʼ‘’]/g, 'ў'], [/G[`'ʻʼ‘’]/g, 'Ғ'], [/g[`'ʻʼ‘’]/g, 'ғ'],
    [/SH/g, 'Ш'], [/Sh/g, 'Ш'], [/sh/g, 'ш'], [/CH/g, 'Ч'], [/Ch/g, 'Ч'], [/ch/g, 'ч'],
    [/YO/g, 'Ё'], [/Yo/g, 'Ё'], [/yo/g, 'ё'], [/YU/g, 'Ю'], [/Yu/g, 'Ю'], [/yu/g, 'ю'],
    [/YA/g, 'Я'], [/Ya/g, 'Я'], [/ya/g, 'я'], [/YE/g, 'Е'], [/Ye/g, 'Е'], [/ye/g, 'е'],
    [/TS/g, 'Ц'], [/Ts/g, 'Ц'], [/ts/g, 'ц'],
  ];
  for (const [re, v] of dg) r = r.replace(re, v);
  let out = '';
  for (const ch of r) out += CYR_MAP[ch] ?? ch;
  return out;
}
