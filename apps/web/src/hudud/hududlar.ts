/**
 * O'zbekiston hududlari: 14 hudud (Qoraqalpog'iston Respublikasi, 12 viloyat, Toshkent shahri),
 * ularning tumanlari va viloyatga bo'ysunuvchi shaharlari. Profilda "Hudud" tanlash uchun.
 * Toshkent shahrining tumanlari (12 ta, Yangihayot bilan) ham shu yerda.
 * Ro'yxat 2024-yil holatidagi ma'muriy bo'linish bo'yicha; yangi tuman ochilsa — shu yerga qo'shiladi.
 */
export interface Hudud {
  nom: string;
  /** Viloyatga bo'ysunuvchi shaharlar */
  shaharlar: string[];
  tumanlar: string[];
}

const t = (...nomlar: string[]) => nomlar.map((n) => n + ' tumani');
const sh = (...nomlar: string[]) => nomlar.map((n) => n + ' shahri');

export const HUDUDLAR: Hudud[] = [
  {
    nom: 'Toshkent shahri',
    shaharlar: [],
    tumanlar: t('Bektemir', 'Chilonzor', 'Mirobod', 'Mirzo Ulug‘bek', 'Olmazor', 'Sergeli', 'Shayxontohur', 'Uchtepa',
      'Yakkasaroy', 'Yangihayot', 'Yashnobod', 'Yunusobod'),
  },
  {
    nom: 'Toshkent viloyati',
    shaharlar: sh('Nurafshon', 'Angren', 'Bekobod', 'Chirchiq', 'Olmaliq', 'Ohangaron', 'Yangiyo‘l'),
    tumanlar: t('Bekobod', 'Bo‘ka', 'Bo‘stonliq', 'Chinoz', 'O‘rtachirchiq', 'Ohangaron', 'Oqqo‘rg‘on', 'Parkent', 'Piskent',
      'Qibray', 'Quyichirchiq', 'Toshkent', 'Yangiyo‘l', 'Yuqorichirchiq', 'Zangiota'),
  },
  {
    nom: 'Andijon viloyati',
    shaharlar: sh('Andijon', 'Xonobod'),
    tumanlar: t('Andijon', 'Asaka', 'Baliqchi', 'Bo‘ston', 'Buloqboshi', 'Izboskan', 'Jalaquduq', 'Marhamat', 'Oltinko‘l',
      'Paxtaobod', 'Qo‘rg‘ontepa', 'Shahrixon', 'Ulug‘nor', 'Xo‘jaobod'),
  },
  {
    nom: 'Buxoro viloyati',
    shaharlar: sh('Buxoro', 'Kogon'),
    tumanlar: t('Buxoro', 'G‘ijduvon', 'Jondor', 'Kogon', 'Olot', 'Peshku', 'Qorako‘l', 'Qorovulbozor', 'Romitan', 'Shofirkon', 'Vobkent'),
  },
  {
    nom: 'Farg‘ona viloyati',
    shaharlar: sh('Farg‘ona', 'Marg‘ilon', 'Qo‘qon', 'Quvasoy'),
    tumanlar: t('Bag‘dod', 'Beshariq', 'Buvayda', 'Dang‘ara', 'Farg‘ona', 'Furqat', 'Oltiariq', 'O‘zbekiston', 'Qo‘shtepa', 'Quva',
      'Rishton', 'So‘x', 'Toshloq', 'Uchko‘prik', 'Yozyovon'),
  },
  {
    nom: 'Jizzax viloyati',
    shaharlar: sh('Jizzax'),
    tumanlar: t('Arnasoy', 'Baxmal', 'Do‘stlik', 'Forish', 'G‘allaorol', 'Mirzacho‘l', 'Paxtakor', 'Sharof Rashidov', 'Yangiobod',
      'Zafarobod', 'Zarbdor', 'Zomin'),
  },
  {
    nom: 'Namangan viloyati',
    shaharlar: sh('Namangan'),
    tumanlar: t('Chortoq', 'Chust', 'Davlatobod', 'Kosonsoy', 'Mingbuloq', 'Namangan', 'Norin', 'Pop', 'To‘raqo‘rg‘on', 'Uchqo‘rg‘on',
      'Uychi', 'Yangi Namangan', 'Yangiqo‘rg‘on'),
  },
  {
    nom: 'Navoiy viloyati',
    shaharlar: sh('Navoiy', 'Zarafshon', 'G‘ozg‘on'),
    tumanlar: t('Karmana', 'Konimex', 'Navbahor', 'Nurota', 'Qiziltepa', 'Tomdi', 'Uchquduq', 'Xatirchi'),
  },
  {
    nom: 'Qashqadaryo viloyati',
    shaharlar: sh('Qarshi', 'Shahrisabz'),
    tumanlar: t('Chiroqchi', 'Dehqonobod', 'G‘uzor', 'Kasbi', 'Kitob', 'Koson', 'Ko‘kdala', 'Mirishkor', 'Muborak', 'Nishon', 'Qamashi',
      'Qarshi', 'Shahrisabz', 'Yakkabog‘'),
  },
  {
    nom: 'Qoraqalpog‘iston Respublikasi',
    shaharlar: sh('Nukus'),
    tumanlar: t('Amudaryo', 'Beruniy', 'Bo‘zatov', 'Chimboy', 'Ellikqal‘a', 'Kegeyli', 'Mo‘ynoq', 'Nukus', 'Qanliko‘l', 'Qo‘ng‘irot',
      'Qorao‘zak', 'Shumanay', 'Taxiatosh', 'Taxtako‘pir', 'To‘rtko‘l', 'Xo‘jayli'),
  },
  {
    nom: 'Samarqand viloyati',
    shaharlar: sh('Samarqand', 'Kattaqo‘rg‘on'),
    tumanlar: t('Bulung‘ur', 'Ishtixon', 'Jomboy', 'Kattaqo‘rg‘on', 'Narpay', 'Nurobod', 'Oqdaryo', 'Pastdarg‘om', 'Paxtachi', 'Payariq',
      'Qo‘shrabot', 'Samarqand', 'Toyloq', 'Urgut'),
  },
  {
    nom: 'Sirdaryo viloyati',
    shaharlar: sh('Guliston', 'Shirin', 'Yangiyer'),
    tumanlar: t('Boyovut', 'Guliston', 'Mirzaobod', 'Oqoltin', 'Sardoba', 'Sayxunobod', 'Sirdaryo', 'Xovos'),
  },
  {
    nom: 'Surxondaryo viloyati',
    shaharlar: sh('Termiz'),
    tumanlar: t('Angor', 'Bandixon', 'Boysun', 'Denov', 'Jarqo‘rg‘on', 'Muzrabot', 'Oltinsoy', 'Qiziriq', 'Qumqo‘rg‘on', 'Sariosiyo',
      'Sherobod', 'Sho‘rchi', 'Termiz', 'Uzun'),
  },
  {
    nom: 'Xorazm viloyati',
    shaharlar: sh('Urganch', 'Xiva'),
    tumanlar: t('Bog‘ot', 'Gurlan', 'Hazorasp', 'Qo‘shko‘pir', 'Shovot', 'Tuproqqal‘a', 'Urganch', 'Xiva', 'Xonqa', 'Yangiariq', 'Yangibozor'),
  },
];

/** "Toshkent shahri · Chilonzor tumani" ko'rinishida qisqa yozuv */
export function hududMatn(viloyat?: string | null, tuman?: string | null) {
  if (!viloyat && !tuman) return '';
  if (viloyat && tuman) return `${viloyat}, ${tuman}`;
  return viloyat || tuman || '';
}
