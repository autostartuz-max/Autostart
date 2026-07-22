import {
  ChevronRight, Car, ClipboardCheck, BarChart3, TriangleAlert, Swords,
  Volume2, Send, CircleCheck, Bookmark, Star,
} from 'lucide-react';
import '../landing.css';

const FEATURES = [
  { Icon: ClipboardCheck, title: 'Real imtihon formati', text: 'Haqiqiy imtihondagidek — vaqt, savol soni va o‘tish chegarasi bilan mashq qiling.' },
  { Icon: BarChart3, title: 'Xatolar tahlili', text: 'Xato qilgan savollaringiz alohida yig‘iladi — belgilangan javob va to‘g‘risi ko‘rinadi.' },
  { Icon: TriangleAlert, title: 'Yo‘l belgilari', text: 'Barcha yo‘l belgilari izoh va misollar bilan — mavzu bo‘yicha o‘rganing.' },
  { Icon: Swords, title: 'Oktagon (PvP)', text: 'Boshqa foydalanuvchilar bilan real vaqtda bellashib, bilimingizni sinang.' },
  { Icon: Volume2, title: 'Ovozli tushuncha', text: 'Har savol javobi tabiiy o‘zbek ovozida tushuntiriladi — quloqda ham o‘rganing.' },
  { Icon: Send, title: 'Telegram’da ham', text: 'Ayni ilova Telegram ichida ham ishlaydi — istalgan joyda tayyorlaning.' },
];

export default function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="lp">
      {/* Nav */}
      <nav className="lp-nav">
        <div className="lp-logo"><span className="lp-logo-ic"><Car size={20} /></span> Autostart</div>
        <div className="lp-links">
          <a href="#imkoniyatlar">Imkoniyatlar</a>
          <a href="#tariflar">Tariflar</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="lp-nav-actions">
          <button className="lp-btn ghost" onClick={onStart}>Kirish</button>
          <button className="lp-btn primary" onClick={onStart}>Boshlash</button>
        </div>
      </nav>

      {/* Hero */}
      <header className="lp-hero">
        <div className="lp-glow" />
        <div className="lp-hero-left">
          <span className="lp-badge">YHQ testlariga zamonaviy tayyorgarlik</span>
          <h1 className="lp-title">Autostart</h1>
          <p className="lp-sub">
            Haydovchilik imtihoniga real testlar, biletlar va xato savollar tahlili orqali ishonchli tayyorlaning.
          </p>
          <div className="lp-cta">
            <button className="lp-btn primary lg" onClick={onStart}>Test boshlash <ChevronRight size={18} /></button>
            <a className="lp-btn outline lg" href="#tariflar">Tariflarni ko‘rish</a>
          </div>
          <div className="lp-stats">
            <div className="lp-stat"><b>1000+</b><span>savollar</span></div>
            <div className="lp-stat"><b>3</b><span>til</span></div>
            <div className="lp-stat"><b>24/7</b><span>onlayn</span></div>
          </div>
        </div>

        <div className="lp-hero-card">
          <span className="lp-card-badge"><Star size={14} /> Real imtihonga yaqin format</span>
          <div className="lp-card-label">Bugungi progress</div>
          <div className="lp-card-pct">84%</div>
          <div className="lp-card-sub">42 ta savol ishlangan</div>
          <div className="lp-card-bar"><span style={{ width: '84%' }} /></div>
          <div className="lp-card-item"><CircleCheck size={18} /> Yo‘l belgilari <em>Tayyor</em></div>
          <div className="lp-card-item"><BarChart3 size={18} /> Xato savollar <em>Qayta ishlash</em></div>
          <div className="lp-card-item"><Bookmark size={18} /> Saqlangan savollar <em>Qayta ko‘rish</em></div>
          <button className="lp-btn light block" onClick={onStart}>Platformaga o‘tish <ChevronRight size={18} /></button>
        </div>
      </header>

      {/* Features */}
      <section className="lp-section" id="imkoniyatlar">
        <h2 className="lp-h2">Imkoniyatlar</h2>
        <p className="lp-lead">Imtihonga to‘liq tayyorlanish uchun kerakli hamma narsa bitta joyda.</p>
        <div className="lp-fgrid">
          {FEATURES.map((f) => (
            <div className="lp-fcard" key={f.title}>
              <div className="lp-fic"><f.Icon size={22} /></div>
              <div className="lp-ft">{f.title}</div>
              <div className="lp-fx">{f.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Tariffs */}
      <section className="lp-section" id="tariflar">
        <h2 className="lp-h2">Tariflar</h2>
        <p className="lp-lead">Bepul boshlang — kerak bo‘lsa Premium’ga o‘ting.</p>
        <div className="lp-tariffs">
          <div className="lp-tcard">
            <div className="lp-tname">Bepul</div>
            <div className="lp-tprice">0 so‘m</div>
            <ul>
              <li><CircleCheck size={16} /> Barcha testlar va mavzular</li>
              <li><CircleCheck size={16} /> Xatolar ustida ishlash</li>
              <li><CircleCheck size={16} /> Yo‘l belgilari</li>
            </ul>
            <button className="lp-btn outline block" onClick={onStart}>Boshlash</button>
          </div>
          <div className="lp-tcard pro">
            <div className="lp-tbadge">Ommabop</div>
            <div className="lp-tname">Premium</div>
            <div className="lp-tprice">tez orada</div>
            <ul>
              <li><CircleCheck size={16} /> Reklama yo‘q</li>
              <li><CircleCheck size={16} /> Cheksiz Oktagon (PvP)</li>
              <li><CircleCheck size={16} /> Kengaytirilgan statistika</li>
            </ul>
            <button className="lp-btn primary block" onClick={onStart}>Sinab ko‘rish</button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lp-band">
        <h2>Bugun tayyorgarlikni boshlang</h2>
        <p>Ro‘yxatdan o‘tish shart emas — bir bosishda kirasiz.</p>
        <button className="lp-btn primary lg" onClick={onStart}>Bepul boshlash <ChevronRight size={18} /></button>
      </section>

      <footer className="lp-footer">
        <div className="lp-logo"><span className="lp-logo-ic"><Car size={18} /></span> Autostart</div>
        <div className="lp-fnote">© 2026 Autostart — YHQ imtihoniga tayyorlov</div>
        <a className="lp-flink" href="https://t.me/Autostartuzbot" target="_blank" rel="noreferrer">Telegram bot</a>
      </footer>
    </div>
  );
}
