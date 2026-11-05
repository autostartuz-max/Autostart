import { useState } from 'react';
import { Sun, Moon, MonitorSmartphone } from 'lucide-react';
import { getLang, setLang, rusBor, type Lang } from '../i18n';
import { getTheme, setTheme, type Theme } from '../theme';

// Ilovada rus tili yo'q — faqat Uzbek va Kiril
const LANGS: [Lang, string][] = ([['uz', 'Uzbek'], ['cyr', 'Kiril'], ['rus', 'Rus']] as [Lang, string][])
  .filter(([v]) => v !== 'rus' || rusBor());
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
