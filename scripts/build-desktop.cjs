const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

console.log('========================================================');
console.log('   🔨 STOCKS YNC HUB - BIÊN DỊCH BỘ CÀI WINDOWS & LINUX  ');
console.log('========================================================');

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const BUILD_DIR = path.join(ROOT_DIR, 'dist-desktop');
const DOWNLOAD_DIR = path.join(ROOT_DIR, 'public', 'download');
const APP_VERSION = '1.2.9';

fs.mkdirSync(BUILD_DIR, { recursive: true });
fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

// BƯỚC 1: Build Web Frontend (Nếu chưa có dist)
if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  console.log('\n[1/5] Biên dịch Web Frontend (Vite)...');
  execSync('npm run build', { stdio: 'inherit' });
} else {
  console.log('\n[1/5] Thư mục dist đã có sẵn, tiếp tục đóng gói desktop...');
}

// BƯỚC 2: Thu thập và nhúng toàn bộ tài nguyên Web vào bộ nhớ
console.log('\n[2/5] Đóng gói tài nguyên giao diện vào bộ nhớ (Embedded VFS)...');
const mimeMap = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const embeddedAssets = {};

function scanDir(dir, prefix = '') {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const rel = path.join(prefix, f).replace(/\\/g, '/');
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      scanDir(full, rel);
    } else {
      const ext = path.extname(f).toLowerCase();
      const contentType = mimeMap[ext] || 'application/octet-stream';
      const isBinary = ['.png', '.ico', '.apk', '.jpg', '.deb', '.exe'].includes(ext);
      const urlKey = '/' + rel.replace(/^\//, '');

      if (stat.size < 5 * 1024 * 1024) { // Chỉ nhúng file web < 5MB
        if (isBinary) {
          const content = fs.readFileSync(full).toString('base64');
          embeddedAssets[urlKey] = { content, contentType, isBase64: true };
        } else {
          const content = fs.readFileSync(full, 'utf-8');
          embeddedAssets[urlKey] = { content, contentType, isBase64: false };
        }
      }
    }
  }
}

scanDir(DIST_DIR);
console.log(`  ✔ Đã mã hoá ${Object.keys(embeddedAssets).length} tệp tĩnh vào bộ nhớ ảo.`);

// BƯỚC 3: Bundle Desktop Server thành 1 file JS duy nhất bằng esbuild
console.log('\n[3/5] Đóng gói toàn bộ mã nguồn Desktop Server thành Single Bundle...');
const bundleOutputFile = path.join(BUILD_DIR, 'desktop-bundle.cjs');

const wrapperFile = path.join(BUILD_DIR, 'desktop-entry.ts');
const wrapperCode = `
global.__EMBEDDED_ASSETS__ = ${JSON.stringify(embeddedAssets)};
import '${path.join(ROOT_DIR, 'desktop-server.ts').replace(/\\/g, '/')}';
`;
fs.writeFileSync(wrapperFile, wrapperCode, 'utf-8');

execSync(`npx esbuild "${wrapperFile}" --bundle --platform=node --format=cjs --target=node20 --outfile="${bundleOutputFile}"`, {
  stdio: 'inherit'
});
console.log(`  ✔ Tạo thành công bundle độc lập: ${bundleOutputFile} (${(fs.statSync(bundleOutputFile).size / (1024*1024)).toFixed(2)} MB)`);

// Tạo SEA Preparation Blob cho cả Windows và Linux
console.log('\n[3.1] Tạo SEA Preparation Blob...');
const seaConfigFile = path.join(BUILD_DIR, 'sea-config.json');
const seaPrepBlob = path.join(BUILD_DIR, 'sea-prep.blob');
const seaConfig = {
  main: bundleOutputFile,
  output: seaPrepBlob,
  disableExperimentalSEAWarning: true
};
fs.writeFileSync(seaConfigFile, JSON.stringify(seaConfig, null, 2), 'utf-8');
execSync(`node --experimental-sea-config "${seaConfigFile}"`, { stdio: 'inherit' });
console.log(`  ✔ Đã tạo sea-prep.blob (${(fs.statSync(seaPrepBlob).size / (1024*1024)).toFixed(2)} MB)`);

// BƯỚC 4: Tạo gói Linux Debian (.deb) Chuẩn 100% (Khắc phục triệt để lỗi Corrupted/Permission)
console.log('\n[4/5] Đóng gói file cài đặt Linux (.deb) chuẩn Debian/Ubuntu...');
try {
  const debRoot = path.join(BUILD_DIR, 'stocksync-deb');
  fs.rmSync(debRoot, { recursive: true, force: true });

  const debianDir = path.join(debRoot, 'DEBIAN');
  const binDir = path.join(debRoot, 'usr', 'bin');
  const optDir = path.join(debRoot, 'opt', 'stocksync-hub');
  const appsDir = path.join(debRoot, 'usr', 'share', 'applications');
  const iconsDir = path.join(debRoot, 'usr', 'share', 'icons', 'hicolor', '512x512', 'apps');
  const pixmapsDir = path.join(debRoot, 'usr', 'share', 'pixmaps');

  fs.mkdirSync(debianDir, { recursive: true, mode: 0o755 });
  fs.mkdirSync(binDir, { recursive: true, mode: 0o755 });
  fs.mkdirSync(optDir, { recursive: true, mode: 0o755 });
  fs.mkdirSync(appsDir, { recursive: true, mode: 0o755 });
  fs.mkdirSync(iconsDir, { recursive: true, mode: 0o755 });
  fs.mkdirSync(pixmapsDir, { recursive: true, mode: 0o755 });

  // 4.1 Tạo binary độc lập cho Linux bằng Node SEA (Không cần cài trước Node.js trên máy người dùng!)
  const linuxSeaBin = path.join(optDir, 'stocksync-hub-bin');
  const systemNode = execSync('which node').toString().trim() || '/usr/local/bin/node';
  console.log(`  ⚙ Đang nhúng SEA vào binary Linux: ${systemNode} -> ${linuxSeaBin}...`);
  fs.copyFileSync(systemNode, linuxSeaBin);
  execSync(`npx postject "${linuxSeaBin}" NODE_SEA_BLOB "${seaPrepBlob}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`, {
    stdio: 'ignore'
  });
  fs.chmodSync(linuxSeaBin, 0o755);

  // Copy thêm bundle cjs dự phòng
  fs.copyFileSync(bundleOutputFile, path.join(optDir, 'server.cjs'));
  fs.chmodSync(path.join(optDir, 'server.cjs'), 0o644);

  // Copy app icons
  const iconSrc = path.join(ROOT_DIR, 'public', 'pwa-512x512.png');
  if (fs.existsSync(iconSrc)) {
    fs.copyFileSync(iconSrc, path.join(iconsDir, 'stocksync-hub.png'));
    fs.copyFileSync(iconSrc, path.join(pixmapsDir, 'stocksync-hub.png'));
    fs.chmodSync(path.join(iconsDir, 'stocksync-hub.png'), 0o644);
    fs.chmodSync(path.join(pixmapsDir, 'stocksync-hub.png'), 0o644);
  }

  // 4.2 Script thực thi trong /usr/bin/stocksync-hub
  const launcherScript = `#!/bin/sh
set -e
# Khởi động StockSync Hub Desktop
if [ -x "/opt/stocksync-hub/stocksync-hub-bin" ]; then
  exec /opt/stocksync-hub/stocksync-hub-bin "$@"
elif command -v node >/dev/null 2>&1; then
  exec node /opt/stocksync-hub/server.cjs "$@"
else
  echo "Lỗi: Vui lòng cài đặt Node.js (sudo apt install nodejs)"
  exit 1
fi
`;
  const launcherPath = path.join(binDir, 'stocksync-hub');
  fs.writeFileSync(launcherPath, launcherScript, { mode: 0o755, encoding: 'utf-8' });
  fs.chmodSync(launcherPath, 0o755);

  // 4.3 Desktop file in /usr/share/applications/
  const desktopEntry = `[Desktop Entry]
Version=1.0
Type=Application
Name=StockSync Hub
GenericName=Warehouse Barcode Scanner & Sync Hub
Comment=Kiem tra xac linh kien & quet ma vach kho (OPPO VN001021)
Exec=/usr/bin/stocksync-hub
Icon=stocksync-hub
Terminal=true
Categories=Utility;Office;
Keywords=stocksync;warehouse;scanner;barcode;oppo;
StartupNotify=true
`;
  const desktopFilePath = path.join(appsDir, 'stocksync-hub.desktop');
  fs.writeFileSync(desktopFilePath, desktopEntry, { mode: 0o644, encoding: 'utf-8' });
  fs.chmodSync(desktopFilePath, 0o644);

  // 4.4 Tính toán Installed-Size chính xác
  let totalBytes = 0;
  function getTreeSize(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const p = path.join(dir, item);
      const s = fs.lstatSync(p);
      if (s.isDirectory()) {
        getTreeSize(p);
      } else {
        totalBytes += s.size;
      }
    }
  }
  getTreeSize(debRoot);
  const installedSizeKB = Math.ceil(totalBytes / 1024);

  // 4.5 Tạo DEBIAN/control chuẩn
  const controlContent = `Package: stocksync-hub
Version: ${APP_VERSION}
Section: utils
Priority: optional
Architecture: amd64
Installed-Size: ${installedSizeKB}
Maintainer: StockSync Logistics <philiptrinh30@gmail.com>
Homepage: https://github.com/Lio0307-Oanh-PhiLip/StockSync-Hub
Description: StockSync Hub - Ung dung kiem tra xac linh kien va may chu dong bo ma vach PC
 Ung dung desktop ho tro dong bo hai chieu giua may tinh PC va dien thoai di dong APK qua mang Wi-Fi LAN.
`;
  const controlFilePath = path.join(debianDir, 'control');
  fs.writeFileSync(controlFilePath, controlContent, { mode: 0o644, encoding: 'utf-8' });
  fs.chmodSync(controlFilePath, 0o644);

  // 4.6 Tạo DEBIAN/md5sums
  const md5Lines = [];
  function generateMd5(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const p = path.join(dir, item);
      const s = fs.lstatSync(p);
      if (s.isDirectory()) {
        if (p !== debianDir) generateMd5(p);
      } else {
        const rel = path.relative(debRoot, p);
        const data = fs.readFileSync(p);
        const md5 = crypto.createHash('md5').update(data).digest('hex');
        md5Lines.push(`${md5}  ${rel}`);
      }
    }
  }
  generateMd5(debRoot);
  const md5FilePath = path.join(debianDir, 'md5sums');
  fs.writeFileSync(md5FilePath, md5Lines.join('\n') + '\n', { mode: 0o644, encoding: 'utf-8' });
  fs.chmodSync(md5FilePath, 0o644);

  // 4.7 Chuẩn hoá phân quyền toàn bộ thư mục và tệp tin theo chuẩn Debian
  execSync(`find "${debRoot}" -type d -exec chmod 755 {} +`);
  execSync(`find "${debRoot}" -type f -exec chmod 644 {} +`);
  execSync(`chmod 755 "${launcherPath}"`);
  execSync(`chmod 755 "${linuxSeaBin}"`);
  execSync(`chmod 755 "${debianDir}"`);

  // 4.8 Đóng gói với -Zgzip (Tương thích 100% với GDebi, GNOME Software, Ubuntu Software Center)
  const debOutputFile = path.join(DOWNLOAD_DIR, `StockSync-Hub-v${APP_VERSION}-linux-amd64.deb`);
  execSync(`dpkg-deb --root-owner-group -Zgzip --build "${debRoot}" "${debOutputFile}"`, { stdio: 'inherit' });
  fs.copyFileSync(debOutputFile, path.join(DOWNLOAD_DIR, 'StockSync-Hub.deb'));
  fs.copyFileSync(debOutputFile, path.join(DOWNLOAD_DIR, 'StockSync-Hub-v1.2.9-linux-amd64.deb'));
  console.log(`  ✔ Đã đóng gói thành công file Linux .deb: ${debOutputFile} (${(fs.statSync(debOutputFile).size / (1024*1024)).toFixed(2)} MB)`);

  // 4.9 Đóng gói file AppImage chạy trực tiếp cho Linux (Khắc phục hoàn toàn lỗi Archive Manager)
  console.log('\n[4.9] Đóng gói file Linux Portable (.AppImage) - Chạy ngay không cần cài đặt...');
  const appDir = path.join(BUILD_DIR, 'StockSync-AppDir');
  fs.rmSync(appDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(appDir, 'usr', 'bin'), { recursive: true });

  fs.copyFileSync(linuxSeaBin, path.join(appDir, 'usr', 'bin', 'stocksync-hub-bin'));
  fs.chmodSync(path.join(appDir, 'usr', 'bin', 'stocksync-hub-bin'), 0o755);

  if (fs.existsSync(iconSrc)) {
    fs.copyFileSync(iconSrc, path.join(appDir, 'stocksync-hub.png'));
    fs.copyFileSync(iconSrc, path.join(appDir, '.DirIcon'));
  }

  fs.copyFileSync(desktopFilePath, path.join(appDir, 'stocksync-hub.desktop'));

  const appRunContent = `#!/bin/sh
HERE="\$(dirname "\$(readlink -f "\${0}")")"
exec "\${HERE}/usr/bin/stocksync-hub-bin" "\$@"
`;
  fs.writeFileSync(path.join(appDir, 'AppRun'), appRunContent, { mode: 0o755 });

  const appImageToolPath = path.join(BUILD_DIR, 'appimage-tool', 'squashfs-root', 'AppRun');
  if (fs.existsSync(appImageToolPath)) {
    fs.chmodSync(appImageToolPath, 0o755); // Add this line
    const appImageOut = path.join(DOWNLOAD_DIR, `StockSync-Hub-v${APP_VERSION}-linux-x64.AppImage`);
    execSync(`ARCH=x86_64 "${appImageToolPath}" "${appDir}" "${appImageOut}"`, { stdio: 'inherit' });
    fs.copyFileSync(appImageOut, path.join(DOWNLOAD_DIR, 'StockSync-Hub.AppImage'));
    fs.copyFileSync(appImageOut, path.join(DOWNLOAD_DIR, 'StockSync-Hub-v1.2.9-linux-x64.AppImage'));
    console.log(`  ✔ Đã đóng gói thành công file Linux .AppImage: ${appImageOut} (${(fs.statSync(appImageOut).size / (1024*1024)).toFixed(2)} MB)`);
  }

  // 4.10 Tạo script cài đặt nhanh Install-Linux.sh
  const installSh = `#!/bin/sh
set -e
echo "=========================================================="
echo "    CAI DAT STOCKS YNC HUB CHO LINUX (UBUNTU / DEBIAN)   "
echo "=========================================================="
DIR="\$(cd "\$(dirname "\$0")" && pwd)"
DEB_FILE="\$DIR/StockSync-Hub-v${APP_VERSION}-linux-amd64.deb"
[ -f "\$DEB_FILE" ] || DEB_FILE="\$DIR/StockSync-Hub.deb"

if [ -f "\$DEB_FILE" ]; then
  echo "Dang cai dat goi: \$DEB_FILE"
  sudo dpkg -i "\$DEB_FILE" || sudo apt-get install -f -y "\$DEB_FILE"
  echo "✔ Cai dat thanh cong! Mo StockSync Hub tu Menu ung dung hoac go 'stocksync-hub'."
else
  echo "Loi: Khong tim thay file .deb trong cung thu muc!"
  exit 1
fi
`;
  fs.writeFileSync(path.join(DOWNLOAD_DIR, 'Install-Linux.sh'), installSh, { mode: 0o755 });

} catch (err) {
  console.error('  ❌ Lỗi khi tạo .deb / AppImage:', err);
}

// BƯỚC 5: Tạo file Windows Desktop (.exe) bằng Node SEA (Không bị lỗi đóng cửa sổ)
console.log('\n[5/5] Đóng gói file cài đặt Windows (.exe)...');
try {
  const cacheNodeExe = path.join(BUILD_DIR, 'node.exe');
  if (!fs.existsSync(cacheNodeExe)) {
    console.log('  ⬇ Đang tải Node.js Official Windows Binary (node.exe)...');
    execSync(`curl -L -o "${cacheNodeExe}" https://nodejs.org/dist/v22.14.0/win-x64/node.exe`, { stdio: 'inherit' });
  }

  // 5.1 Sử dụng file node.exe nguyên bản (đảm bảo PE header và COFF table chuẩn 100%, không bị lỗi chớp tắt trên Windows)
  console.log('  ✔ Chuẩn bị file thực thi Windows nguyên bản...');
  const winExeOutputFile = path.join(DOWNLOAD_DIR, `StockSync-Hub-v${APP_VERSION}-windows-x64.exe`);
  fs.copyFileSync(cacheNodeExe, winExeOutputFile);

  // 5.2 Inject SEA blob vào PE file
  console.log('  💉 Đang inject mã nguồn và VFS vào file Windows PE (.exe)...');
  execSync(`npx postject "${winExeOutputFile}" NODE_SEA_BLOB "${seaPrepBlob}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`, {
    stdio: 'inherit'
  });

  fs.copyFileSync(winExeOutputFile, path.join(DOWNLOAD_DIR, 'StockSync-Hub.exe'));
  fs.copyFileSync(winExeOutputFile, path.join(DOWNLOAD_DIR, 'StockSync-Hub-v1.2.9-windows-x64.exe'));
  console.log(`  ✔ Đã đóng gói thành công file Windows .exe: ${winExeOutputFile} (${(fs.statSync(winExeOutputFile).size / (1024*1024)).toFixed(2)} MB)`);

  // 5.3 Tạo file chạy nhanh Chay-StockSync.bat cạnh file .exe
  const batContent = `@echo off
chcp 65001 >nul
title StockSync Hub - Máy Chủ Kho & Đồng Bộ Điện Thoại (v${APP_VERSION})
cls
echo ==============================================================
echo       STOCKS YNC HUB - HỆ THỐNG QUẢN LÝ KHO XÁC LINH KIỆN      
echo ==============================================================
echo.
echo  [1] Dang khoi dong may chu ket noi Wi-Fi...
echo  [2] Trinh duyet se tu dong mo trang: http://localhost:3000
echo.
echo  Luu y: Vui long giu cua so nay mo trong suot qua trinh quet kho!
echo  De tat ung dung, hay bam to hop phim Ctrl+C hoac dong cua so nay.
echo ==============================================================
echo.
"%~dp0StockSync-Hub.exe"
if %errorlevel% neq 0 (
  echo.
  echo  ==============================================================
  echo  Co loi xay ra trong khi chay. Ma loi: %errorlevel%
  echo  ==============================================================
  pause
)
`;
  fs.writeFileSync(path.join(DOWNLOAD_DIR, 'Chay-StockSync.bat'), batContent, 'utf-8');

  // 5.4 Tạo file cài đặt tự động 1 chạm Cai-Dat-StockSync.bat
  const installerBatContent = `@echo off
chcp 65001 >nul
title Cài Đặt StockSync Hub - Máy Tính PC (Windows 10 / 11)
cls
echo ==============================================================
echo       STOCKS YNC HUB - TRÌNH CÀI ĐẶT TỰ ĐỘNG MÁY CHỦ PC        
echo ==============================================================
echo.
echo  [1/3] Đang tạo thư mục cài đặt tại %%LOCALAPPDATA%\\StockSyncHub...
set "TARGET_DIR=%LOCALAPPDATA%\\StockSyncHub"
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo  [2/3] Đang sao chép các tệp thực thi vào hệ thống...
copy /Y "%~dp0StockSync-Hub.exe" "%TARGET_DIR%\\StockSync-Hub.exe" >nul
copy /Y "%~dp0Chay-StockSync.bat" "%TARGET_DIR%\\Chay-StockSync.bat" >nul 2>&1

echo  [3/3] Đang tạo Shortcut biểu tượng trên màn hình Desktop...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'StockSync Hub.lnk')); $s.TargetPath = '%TARGET_DIR%\\StockSync-Hub.exe'; $s.WorkingDirectory = '%TARGET_DIR%'; $s.Save()"

echo.
echo ==============================================================
echo  ✔ CÀI ĐẶT THÀNH CÔNG!
echo  ✔ Biểu tượng 'StockSync Hub' đã xuất hiện trên màn hình Desktop.
echo ==============================================================
echo.
echo  Đang khởi động ứng dụng ngay bây giờ...
start "" "%TARGET_DIR%\\StockSync-Hub.exe"
timeout /t 3 >nul
exit
`;
  fs.writeFileSync(path.join(DOWNLOAD_DIR, 'Cai-Dat-StockSync.bat'), installerBatContent, 'utf-8');

  // 5.5 Tạo gói Windows Portable ZIP hoàn chỉnh
  console.log('  📦 Đang đóng gói Windows Portable (.zip)...');
  const portableFolder = path.join(BUILD_DIR, 'StockSync-Hub-Windows-Portable');
  fs.rmSync(portableFolder, { recursive: true, force: true });
  fs.mkdirSync(portableFolder, { recursive: true });

  fs.copyFileSync(winExeOutputFile, path.join(portableFolder, 'StockSync-Hub.exe'));
  fs.writeFileSync(path.join(portableFolder, 'Chay-StockSync.bat'), batContent, 'utf-8');
  fs.writeFileSync(path.join(portableFolder, 'Cai-Dat-StockSync.bat'), installerBatContent, 'utf-8');

  const guideText = `========================================================================
     HƯỚNG DẪN SỬ DỤNG STOCKS YNC HUB DESKTOP (WINDOWS 10 / 11)
========================================================================

1. CÁCH KHỞI ĐỘNG:
   - Cách 1 (Khuyên dùng): Nhấp đúp vào file "StockSync-Hub.exe".
   - Cách 2: Nhấp đúp vào file "Chay-StockSync.bat".
   - Ứng dụng sẽ tự động mở trình duyệt web tại: http://localhost:3000

2. KẾT NỐI VỚI APP ĐIỆN THOẠI (APK) QUA MẠNG WI-FI:
   - Đảm bảo máy tính PC và điện thoại cùng kết nối vào một mạng Wi-Fi LAN.
   - Trên màn hình máy tính, mở mục "Kết Nối Mobile" -> Chọn tab "Wi-Fi LAN".
   - Mở App StockSync trên điện thoại, quét mã QR trên màn hình PC.
   - Khi quét mã linh kiện trên điện thoại, số lượng sẽ nhảy tức thì lên máy tính!

3. THÔNG TIN BẢN QUYỀN:
   - Phiên bản: v${APP_VERSION}
   - OPPO Experience & Service Store Phú Lâm (VN001021)
========================================================================
`;
  fs.writeFileSync(path.join(portableFolder, 'HUONG-DAN-SU-DUNG.txt'), guideText, 'utf-8');

  // Nén ZIP bằng Python nhanh (ZIP_STORED để tránh nghẽn CPU khi nén file 80MB)
  const zipOut1 = path.join(DOWNLOAD_DIR, `StockSync-Hub-v${APP_VERSION}-windows-portable.zip`);
  const zipOut2 = path.join(DOWNLOAD_DIR, 'StockSync-Hub-windows-portable.zip');
  execSync(`python3 -c "
import zipfile, os
def zipdir(path, ziph):
    for root, dirs, files in os.walk(path):
        for file in files:
            p = os.path.join(root, file)
            ziph.write(p, os.path.relpath(p, path))
with zipfile.ZipFile('${zipOut1}', 'w', zipfile.ZIP_STORED) as zipf:
    zipdir('${portableFolder}', zipf)
"`);
  fs.copyFileSync(zipOut1, zipOut2);
  console.log(`  ✔ Đã đóng gói thành công file Windows .zip: ${zipOut1} (${(fs.statSync(zipOut1).size / (1024*1024)).toFixed(2)} MB)`);

} catch (err) {
  console.error('  ❌ Lỗi khi tạo file Windows:', err);
}

console.log('\n========================================================');
console.log('       🎉 HOÀN THÀNH TẤT CẢ FILE CÀI ĐẶT DESKTOP!       ');
console.log('========================================================');
console.log('Các file cài đặt sẵn sàng tại /public/download/:');
execSync(`ls -lh "${DOWNLOAD_DIR}"`, { stdio: 'inherit' });
