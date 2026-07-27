import { useState } from 'react';
import { Sun, Moon, MonitorSmartphone } from 'lucide-react';
import { getLang, setLang, type Lang } from '../i18n';
import { getTheme, setTheme, type Theme } from '../theme';

const LANGS: [Lang, string][] = [['uz', 'Uzbek'], ['cyr', 'Kiril'], ['rus', 'Rus']];
const THEMES: [Theme, string, any][] = [
  ['light', 'Light', Sun],
  ['system', 'System', MonitorSmartphone],
  ['dark', 'Dark', Moon],
];

export default function LangTheme() {
  const [lang, setL] = useState<Lang>(getLang());
  const [theme, setT] = useState<Theme>(getTheme());
  return (
    <div className="lt" data-notr>
      <div className="lt-seg">
        {LANGS.map(([v, label]) => (
          <button key={v} className={'lt-b' + (lang === v ? ' on' : '')} onClick={() => { setLang(v); setL(v); }}>
            {label}
          </button>
        ))}
      </div>
      <div className="lt-seg">
        {THEMES.map(([v, label, Icon]) => (
          <button key={v} className={'lt-b' + (theme === v ? ' on' : '')} onClick={() => { setTheme(v); setT(v); }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>
    </div>
  );
}
