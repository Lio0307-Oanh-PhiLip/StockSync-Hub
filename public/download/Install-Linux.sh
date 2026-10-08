#!/bin/sh
set -e
echo "=========================================================="
echo "    CAI DAT STOCKS YNC HUB CHO LINUX (UBUNTU / DEBIAN)   "
echo "=========================================================="
DIR="$(cd "$(dirname "$0")" && pwd)"
DEB_FILE="$DIR/StockSync-Hub-v1.2.9-linux-amd64.deb"
[ -f "$DEB_FILE" ] || DEB_FILE="$DIR/StockSync-Hub.deb"

if [ -f "$DEB_FILE" ]; then
  echo "Dang cai dat goi: $DEB_FILE"
  sudo dpkg -i "$DEB_FILE" || sudo apt-get install -f -y "$DEB_FILE"
  echo "✔ Cai dat thanh cong! Mo StockSync Hub tu Menu ung dung hoac go 'stocksync-hub'."
else
  echo "Loi: Khong tim thay file .deb trong cung thu muc!"
  exit 1
fi
