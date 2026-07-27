#!/usr/bin/env bash
# AUTOSTART — VPS (Ubuntu 22.04) o'rnatish skripti.
# Ishga tushirish: bash vps-setup.sh
set -e

DOMAIN="autostart.uz"
IP="82.115.50.118"
APPDIR="/opt/autostart"
REPO="https://github.com/autostartuz-max/Autostart.git"

echo "=========================================="
echo "  AUTOSTART VPS o'rnatish"
echo "=========================================="

# 1) Tizim paketlari
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git nginx ufw ca-certificates

# 2) Node.js 22
if ! command -v node >/dev/null 2>&1 || [ "$(node -v 2>/dev/null | tr -d 'v' | cut -d. -f1)" -lt 20 ]; then
  echo "-- Node.js 22 o'rnatilmoqda..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
echo "-- Node: $(node -v), npm: $(npm -v)"

# 3) Kod (GitHub)
if [ -d "$APPDIR/.git" ]; then
  echo "-- Kod yangilanmoqda..."
  cd "$APPDIR" && git fetch --all && git reset --hard origin/main
else
  echo "-- Kod klonlanmoqda..."
  git clone "$REPO" "$APPDIR"
  cd "$APPDIR"
fi

# 4) Muhit o'zgaruvchilari (.env)
echo ""
echo ">>> Env qiymatlari kerak:"
read -rp "DATABASE_URL (Neon ulanish satri): " DBURL
read -rp "BOT_TOKEN (Telegram bot tokeni): " BTOKEN
JWT=$(head -c 40 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 40)
mkdir -p "$APPDIR/apps/api"
cat > "$APPDIR/apps/api/.env" <<EOF
DATABASE_URL=${DBURL}
BOT_TOKEN=${BTOKEN}
JWT_SECRET=${JWT}
DEV_AUTH=1
PORT=4000
EOF
echo "-- .env yaratildi"

# 5) O'rnatish + build (web + admin + prisma + db push + seed)
echo "-- npm install (bir necha daqiqa)..."
npm install --include=dev
echo "-- build (web/admin/prisma)..."
npm run build

# 6) PM2 — ilovani doimiy ishlatish
npm install -g pm2
pm2 delete autostart >/dev/null 2>&1 || true
cd "$APPDIR"
pm2 start npm --name autostart -- start
pm2 save
env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root | tail -1 | bash || true

# 7) Nginx (80 -> 4000)
cat > /etc/nginx/sites-available/autostart <<EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN} ${IP};
    client_max_body_size 25m;
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
EOF
ln -sf /etc/nginx/sites-available/autostart /etc/nginx/sites-enabled/autostart
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 8) Firewall
ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 'Nginx Full' >/dev/null 2>&1 || true
yes | ufw enable >/dev/null 2>&1 || true

echo ""
echo "=========================================="
echo "  ✅ TAYYOR! Ilova ishlayapti:"
echo "     http://${IP}"
echo ""
echo "  Keyingi qadamlar:"
echo "  1) Eskiz DNS: A-record  ${DOMAIN} -> ${IP}"
echo "  2) DNS tarqalgach SSL (https):"
echo "     apt-get install -y certbot python3-certbot-nginx"
echo "     certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --agree-tos -m admin@${DOMAIN} --redirect -n"
echo "=========================================="
echo "  Foydali: pm2 logs autostart   |   pm2 restart autostart"
echo "=========================================="
