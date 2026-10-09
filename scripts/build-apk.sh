#!/bin/bash
set -e

VERSION_CODE="129"
VERSION_NAME="1.2.9"

echo "=================================================="
echo "  StockSync Hub - APK Build Engine v$VERSION_NAME"
echo "  (Fix Play Protect & Package Installation Error)"
echo "=================================================="

APPLET_DIR="$(pwd)"
WORK="/tmp/apk-build"
rm -rf "$WORK"
mkdir -p "$WORK"/src/com/stocksync/app "$WORK"/res/values "$WORK"/res/xml "$WORK"/res/mipmap-hdpi "$WORK"/bin "$WORK"/gen "$WORK"/assets

# -----------------------------------------------------------------------------
# 1. Tự động phát hiện Android SDK, Build-Tools và Platforms
# -----------------------------------------------------------------------------
POSSIBLE_SDK_PATHS=(
  "$ANDROID_HOME"
  "$ANDROID_SDK_ROOT"
  "/usr/local/lib/android/sdk"
  "/usr/lib/android-sdk"
  "/opt/android-sdk"
  "$HOME/Android/Sdk"
)

ANDROID_SDK=""
for path in "${POSSIBLE_SDK_PATHS[@]}"; do
  if [ -n "$path" ] && [ -d "$path" ]; then
    ANDROID_SDK="$path"
    echo "✔ Phát hiện Android SDK tại: $ANDROID_SDK"
    break
  fi
done

ANDROID_JAR=""
if [ -n "$ANDROID_SDK" ] && [ -d "$ANDROID_SDK/platforms" ]; then
  ANDROID_JAR=$(ls -d "$ANDROID_SDK"/platforms/android-*/android.jar 2>/dev/null | sort -V | tail -n 1 || true)
fi

# Fallback nếu chưa tìm thấy android.jar
if [ -z "$ANDROID_JAR" ] || [ ! -f "$ANDROID_JAR" ]; then
  echo "🔍 Đang tìm kiếm android.jar trên toàn hệ thống..."
  ANDROID_JAR=$(find /usr -name "android.jar" 2>/dev/null | head -n 1 || true)
fi

if [ -z "$ANDROID_JAR" ] || [ ! -f "$ANDROID_JAR" ]; then
  echo "❌ LỖI: Không tìm thấy tệp android.jar. Vui lòng đảm bảo Android SDK Platform đã được cài đặt."
  exit 1
fi
echo "✔ Sử dụng android.jar: $ANDROID_JAR"

# Tìm kiếm thư mục build-tools mới nhất
BUILD_TOOLS_DIR=""
if [ -n "$ANDROID_SDK" ] && [ -d "$ANDROID_SDK/build-tools" ]; then
  BUILD_TOOLS_DIR=$(ls -d "$ANDROID_SDK"/build-tools/* 2>/dev/null | sort -V | tail -n 1 || true)
fi

# Định vị aapt
AAPT_BIN=""
if [ -n "$BUILD_TOOLS_DIR" ] && [ -x "$BUILD_TOOLS_DIR/aapt" ]; then
  AAPT_BIN="$BUILD_TOOLS_DIR/aapt"
elif command -v aapt >/dev/null 2>&1; then
  AAPT_BIN="$(command -v aapt)"
fi

if [ -z "$AAPT_BIN" ]; then
  echo "❌ LỖI: Không tìm thấy công cụ aapt!"
  exit 1
fi
echo "✔ Sử dụng aapt: $AAPT_BIN"

# Định vị zipalign
ZIPALIGN_BIN=""
if [ -n "$BUILD_TOOLS_DIR" ] && [ -x "$BUILD_TOOLS_DIR/zipalign" ]; then
  ZIPALIGN_BIN="$BUILD_TOOLS_DIR/zipalign"
elif command -v zipalign >/dev/null 2>&1; then
  ZIPALIGN_BIN="$(command -v zipalign)"
fi

if [ -z "$ZIPALIGN_BIN" ]; then
  echo "❌ LỖI: Không tìm thấy công cụ zipalign!"
  exit 1
fi
echo "✔ Sử dụng zipalign: $ZIPALIGN_BIN"

# Định vị apksigner
APKSIGNER_BIN=""
if [ -n "$BUILD_TOOLS_DIR" ] && [ -x "$BUILD_TOOLS_DIR/apksigner" ]; then
  APKSIGNER_BIN="$BUILD_TOOLS_DIR/apksigner"
elif command -v apksigner >/dev/null 2>&1; then
  APKSIGNER_BIN="$(command -v apksigner)"
fi

if [ -z "$APKSIGNER_BIN" ]; then
  echo "❌ LỖI: Không tìm thấy công cụ apksigner!"
  exit 1
fi
echo "✔ Sử dụng apksigner: $APKSIGNER_BIN"

# Định vị d8 hoặc dx
D8_BIN=""
DX_BIN=""
DX_JAR=""

if [ -n "$BUILD_TOOLS_DIR" ] && [ -x "$BUILD_TOOLS_DIR/d8" ]; then
  D8_BIN="$BUILD_TOOLS_DIR/d8"
elif command -v d8 >/dev/null 2>&1; then
  D8_BIN="$(command -v d8)"
fi

if [ -n "$BUILD_TOOLS_DIR" ] && [ -x "$BUILD_TOOLS_DIR/dx" ]; then
  DX_BIN="$BUILD_TOOLS_DIR/dx"
elif command -v dx >/dev/null 2>&1; then
  DX_BIN="$(command -v dx)"
fi

if [ -n "$BUILD_TOOLS_DIR" ] && [ -f "$BUILD_TOOLS_DIR/lib/dx.jar" ]; then
  DX_JAR="$BUILD_TOOLS_DIR/lib/dx.jar"
fi

if [ -n "$D8_BIN" ]; then
  echo "✔ Sử dụng bộ chuyển đổi mã byte D8: $D8_BIN"
elif [ -n "$DX_BIN" ]; then
  echo "✔ Sử dụng bộ chuyển đổi mã byte DX: $DX_BIN"
elif [ -n "$DX_JAR" ]; then
  echo "✔ Sử dụng dx.jar: $DX_JAR"
else
  echo "❌ LỖI: Không tìm thấy công cụ chuyển đổi bytecode (d8 hoặc dx)!"
  exit 1
fi

# -----------------------------------------------------------------------------
# 2. Xây dựng gói Web Assets bằng Vite
# -----------------------------------------------------------------------------
echo "[1/8] Build gói giao diện Web bằng Vite..."
cd "$APPLET_DIR"
rm -rf dist
./node_modules/.bin/vite build

echo "[2/8] Sao chép Web dist vào assets của ứng dụng Android..."
cp -r "$APPLET_DIR"/dist/* "$WORK"/assets/
rm -f "$WORK"/assets/*.apk "$WORK"/assets/server.cjs* || true

# -----------------------------------------------------------------------------
# 3. Tạo cấu hình AndroidManifest và Resource
# -----------------------------------------------------------------------------
echo "[3/8] Thiết lập AndroidManifest.xml, FileProvider & strings.xml..."
cat << XML > "$WORK"/res/values/strings.xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">StockSync</string>
</resources>
XML

cat << XML > "$WORK"/res/xml/file_paths.xml
<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-path name="external_files" path="." />
    <cache-path name="cache_files" path="." />
    <files-path name="internal_files" path="." />
</paths>
XML

if [ -f "$APPLET_DIR"/public/pwa-192x192.png ]; then
  cp "$APPLET_DIR"/public/pwa-192x192.png "$WORK"/res/mipmap-hdpi/ic_launcher.png
else
  touch "$WORK"/res/mipmap-hdpi/ic_launcher.png
fi

cat << XML > "$WORK"/AndroidManifest.xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.stocksync.warehouse.scanner"
    android:versionCode="$VERSION_CODE"
    android:versionName="$VERSION_NAME">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="34" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@android:style/Theme.NoTitleBar"
        android:usesCleartextTraffic="true"
        android:requestLegacyExternalStorage="true">
        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|screenSize|keyboardHidden|screenLayout"
            android:exported="true"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
XML

# -----------------------------------------------------------------------------
# 4. Tạo mã nguồn Java MainActivity với Bridge Auto-update và Camera Scanner
# -----------------------------------------------------------------------------
echo "[4/8] Tạo MainActivity.java và Java Bridge..."
cat << 'JAVA' > "$WORK"/src/com/stocksync/app/MainActivity.java
package com.stocksync.warehouse.scanner;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.*;
import android.view.Window;
import android.content.pm.PackageManager;
import android.Manifest;
import android.os.Build;
import android.content.Intent;
import android.net.Uri;
import android.content.Context;
import java.io.InputStream;
import java.io.IOException;
import java.io.File;

public class MainActivity extends Activity {
    private WebView webView;
    private static final int CAMERA_PERMISSION_CODE = 1001;
    private static final String LOCAL_ORIGIN = "https://stocksync.local";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.addJavascriptInterface(new WebAppInterface(this), "AndroidBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith(LOCAL_ORIGIN)) {
                    String path = request.getUrl().getPath();
                    return getAssetResponse(path);
                }
                return super.shouldInterceptRequest(view, request);
            }

            private WebResourceResponse getAssetResponse(String path) {
                if (path == null || path.equals("/") || path.isEmpty()) {
                    path = "index.html";
                } else if (path.startsWith("/")) {
                    path = path.substring(1);
                }

                try {
                    InputStream is = getAssets().open(path);
                    String mime = "application/octet-stream";
                    if (path.endsWith(".html")) mime = "text/html";
                    else if (path.endsWith(".js") || path.endsWith(".mjs")) mime = "application/javascript";
                    else if (path.endsWith(".css")) mime = "text/css";
                    else if (path.endsWith(".svg")) mime = "image/svg+xml";
                    else if (path.endsWith(".png")) mime = "image/png";
                    else if (path.endsWith(".jpg") || path.endsWith(".jpeg")) mime = "image/jpeg";
                    else if (path.endsWith(".json")) mime = "application/json";
                    
                    return new WebResourceResponse(mime, "UTF-8", is);
                } catch (IOException e) {
                    return null;
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                request.grant(request.getResources());
            }
        });

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_CODE);
            }
        }

        webView.loadUrl(LOCAL_ORIGIN + "/index.html");
    }

    public class WebAppInterface {
        Context mContext;
        WebAppInterface(Context c) { mContext = c; }

        @JavascriptInterface
        public void installApk(String filePath) {
            File file = new File(filePath);
            if (file.exists()) {
                Intent intent = new Intent(Intent.ACTION_VIEW);
                Uri uri = Uri.fromFile(file);
                intent.setDataAndType(uri, "application/vnd.android.package-archive");
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                mContext.startActivity(intent);
            }
        }
        
        @JavascriptInterface
        public String getAppVersion() {
            return "1.1.6";
        }
    }
}
JAVA

# -----------------------------------------------------------------------------
# 5. Biên dịch R.java và Java Class
# -----------------------------------------------------------------------------
echo "[5/8] Tạo R.java và biên dịch Java bytecode..."
mkdir -p "$WORK"/gen "$WORK"/bin
"$AAPT_BIN" package -f -m -J "$WORK"/gen -M "$WORK"/AndroidManifest.xml -S "$WORK"/res -I "$ANDROID_JAR"

javac -source 1.8 -target 1.8 -cp "$ANDROID_JAR" -d "$WORK"/bin "$WORK"/gen/com/stocksync/warehouse/scanner/R.java "$WORK"/src/com/stocksync/app/MainActivity.java

# -----------------------------------------------------------------------------
# 6. Chuyển đổi sang Dalvik Executable (classes.dex)
# -----------------------------------------------------------------------------
echo "[6/8] Tạo classes.dex bằng bộ biên dịch bytecode..."
if [ -n "$D8_BIN" ]; then
    CLASS_FILES=$(find "$WORK"/bin -name "*.class")
    "$D8_BIN" --output "$WORK"/bin/ $CLASS_FILES
elif [ -n "$DX_BIN" ]; then
    "$DX_BIN" --dex --output="$WORK"/bin/classes.dex "$WORK"/bin
elif [ -n "$DX_JAR" ]; then
    java -Xmx512m -jar "$DX_JAR" --dex --output="$WORK"/bin/classes.dex "$WORK"/bin
fi

if [ ! -f "$WORK"/bin/classes.dex ]; then
  echo "❌ LỖI: File classes.dex không được tạo thành công!"
  exit 1
fi
echo "✔ Đã tạo thành công classes.dex"

# -----------------------------------------------------------------------------
# 7. Đóng gói, Zipalign và Ký APK với Keystore Chuẩn
# -----------------------------------------------------------------------------
echo "[7/8] Đóng gói APK và Zipalign..."
"$AAPT_BIN" package -f -0 "" -M "$WORK"/AndroidManifest.xml -S "$WORK"/res -A "$WORK"/assets -I "$ANDROID_JAR" -F "$WORK"/bin/unaligned.apk
cd "$WORK"/bin
"$AAPT_BIN" add -0 dex unaligned.apk classes.dex

"$ZIPALIGN_BIN" -f -p 4 "$WORK"/bin/unaligned.apk "$WORK"/bin/aligned.apk

echo "[8/8] Ký số APK bằng apksigner & keystore doanh nghiệp..."
KEYSTORE="$APPLET_DIR/stocksync-release.keystore"
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -v \
    -keystore "$KEYSTORE" \
    -alias stocksync_enterprise \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass stocksync123 \
    -keypass stocksync123 \
    -dname "CN=StockSync Warehouse Manager, OU=Logistics Warehouse, O=StockSync Hub, L=Ho Chi Minh, ST=SG, C=VN"
fi

"$APKSIGNER_BIN" sign \
  --ks "$KEYSTORE" \
  --ks-pass pass:stocksync123 \
  --key-pass pass:stocksync123 \
  --ks-key-alias stocksync_enterprise \
  --v1-signing-enabled true \
  --v2-signing-enabled true \
  --v3-signing-enabled true \
  "$WORK"/bin/aligned.apk

# -----------------------------------------------------------------------------
# Hoàn tất xuất xưởng
# -----------------------------------------------------------------------------
mkdir -p "$APPLET_DIR"/public/download
cp "$WORK"/bin/aligned.apk "$APPLET_DIR"/public/StockSync.apk
cp "$WORK"/bin/aligned.apk "$APPLET_DIR"/public/STOCKSYNC-HUB-Android.apk
cp "$WORK"/bin/aligned.apk "$APPLET_DIR"/public/download/StockSync.apk
cp "$WORK"/bin/aligned.apk "$APPLET_DIR"/public/download/STOCKSYNC-HUB-Android.apk

echo "=================================================="
echo "🎉 BUILD APK THÀNH CÔNG: public/download/STOCKSYNC-HUB-Android.apk (v$VERSION_NAME)"
echo "=================================================="
