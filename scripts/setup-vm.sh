#!/usr/bin/env bash
set -euo pipefail

NODE_VERSION="20"
APP_DIR="/opt/https-test"
REPO_URL="${REPO_URL:-https://github.com/your-org/https-test.git}"
BASE_URL="${BASE_URL:-https://your-site.example}"
SEARCH_TERM="${SEARCH_TERM:-synthetic traffic}"

apt-get update
apt-get install -y curl ca-certificates git

curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt-get install -y nodejs

mkdir -p "$APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only || true
else
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
npm install
npx playwright install --with-deps chromium

cat > /etc/systemd/system/synthetic-playwright.service <<EOF
[Unit]
Description=Run synthetic browser web traffic transaction
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=$APP_DIR
Environment=BASE_URL=$BASE_URL
Environment=SEARCH_TERM=$SEARCH_TERM
ExecStart=/usr/bin/node $APP_DIR/synthetic-transaction-playwright.js
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/synthetic-playwright.timer <<EOF
[Unit]
Description=Run synthetic web traffic every 5 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
Persistent=true
Unit=synthetic-playwright.service

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now synthetic-playwright.timer
systemctl status synthetic-playwright.timer --no-pager
