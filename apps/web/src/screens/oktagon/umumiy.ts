import type { OktagonDaraja, OktagonNatija } from '../../api';
import { getLang } from '../../i18n';
import { latToCyr } from '../../translit';

export const MEDAL: Record<OktagonDaraja, string> = { Bronza: '🥉', Kumush: '🥈', Oltin: '🥇', Brilliant: '💎' };

export const NATIJA_MATN: Record<OktagonNatija, string> = {
  galaba: 'G‘alaba',
  durang: 'Durang',
  maglubiyat: 'Mag‘lubiyat',
  chiqdi: 'Chiqib ketdingiz',
};

export const harf = (ism: string) => (ism.trim()[0] || '?').toUpperCase();

export const ballMatn = (b: number) => (b > 0 ? `+${b}` : String(b)) + ' ball';

/** Savol/variant matni ilova tilida (kirill bo'lmasa — lotindan o'giriladi) */
export function tilda(x: { textLat: string; textCyr?: string; textRus?: string }) {
  const l = getLang();
  if (l === 'cyr') return x.textCyr?.trim() ? x.textCyr : latToCyr(x.textLat);
  if (l === 'rus') return x.textRus?.trim() ? x.textRus : x.textLat;
  return x.textLat;
}
