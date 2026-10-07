#!/bin/bash
set -e

# Tăng version lên 1.1.3
VERSION_CODE="13"
VERSION_NAME="1.1.3"

echo "=== STARTING APK BUILD v$VERSION_NAME ==="

# Tự động xác định thư mục gốc của applet
APPLET_DIR="$(pwd)"
WORK="/tmp/apk-build"
rm -rf "$WORK"
mkdir -p "$WORK"/src/com/stocksync/app "$WORK"/res/values "$WORK"/res/mipmap-hdpi "$WORK"/bin "$WORK"/gen "$WORK"/assets

# Tìm kiếm Android SDK và android.jar
# Ưu tiên các đường dẫn chuẩn trên GitHub Actions runner
POSSIBLE_SDK_PATHS=(
  "$ANDROID_HOME"
  "$ANDROID_SDK_ROOT"
  "/usr/local/lib/android/sdk"
  "/usr/lib/android-sdk"
  "/opt/android-sdk"
)

ANDROID_JAR=""
DX_JAR=""

for sdk_path in "${POSSIBLE_SDK_PATHS[@]}"; do
  if [ -n "$sdk_path" ] && [ -d "$sdk_path" ]; then
    echo "Checking SDK path: $sdk_path"
    # Tìm android.jar trong platforms
    for ver in 34 33 32 31 30 29 28 27 26 25 24 23; do
      JAR="$sdk_path/platforms/android-$ver/android.jar"
      if [ -f "$JAR" ]; then
        ANDROID_JAR="$JAR"
        echo "Found android.jar: $ANDROID_JAR"
        break 2
      fi
    done
  fi
done

# Fallback tìm kiếm sâu hơn nếu không thấy trong các đường dẫn mặc định
if [ -z "$ANDROID_JAR" ]; then
  echo "Searching for android.jar globally (this might take a while)..."
  ANDROID_JAR=$(find /usr -name "android.jar" | head -n 1 || true)
fi

if [ -z "$ANDROID_JAR" ]; then
  echo "ERROR: android.jar not found. APK build cannot continue."
  exit 1
fi

# Tìm DX_JAR
# Trên GitHub runner, dx thường nằm trong build-tools
for sdk_path in "${POSSIBLE_SDK_PATHS[@]}"; do
  if [ -n "$sdk_path" ] && [ -d "$sdk_path" ]; then
    DX_PATH=$(find "$sdk_path/build-tools" -name "dx.jar" | head -n 1 || true)
    if [ -n "$DX_PATH" ] && [ -f "$DX_PATH" ]; then
      DX_JAR="$DX_PATH"
      echo "Found dx.jar: $DX_JAR"
      break
    fi
  fi
done

# Nếu không thấy dx.jar, thử dùng lệnh dx trực tiếp (từ apt-get install dx)
if [ -z "$DX_JAR" ]; then
  if command -v dx >/dev/null 2>&1; then
    echo "Using system 'dx' command."
  else
    echo "ERROR: dx not found. Please ensure 'dx' or 'android-sdk-build-tools' is installed."
    exit 1
  fi
fi

echo "1. Building fresh web assets with Vite..."
cd "$APPLET_DIR"
rm -rf dist
./node_modules/.bin/vite build

echo "2. Copying web dist to APK assets..."
cp -r "$APPLET_DIR"/dist/* "$WORK"/assets/
rm -f "$WORK"/assets/*.apk "$WORK"/assets/server.cjs* || true

echo "3. Creating strings.xml..."
cat << XML > "$WORK"/res/values/strings.xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">StockSync</string>
</resources>
XML

echo "4. Copying app icon..."
if [ -f "$APPLET_DIR"/public/pwa-192x192.png ]; then
  cp "$APPLET_DIR"/public/pwa-192x192.png "$WORK"/res/mipmap-hdpi/ic_launcher.png
else
  touch "$WORK"/res/mipmap-hdpi/ic_launcher.png
fi

echo "5. Creating AndroidManifest.xml..."
cat << XML > "$WORK"/AndroidManifest.xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.stocksync.app"
    android:versionCode="$VERSION_CODE"
    android:versionName="$VERSION_NAME">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="33" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
    
    <uses-feature android:name="android.hardware.camera" android:required="false" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@android:style/Theme.NoTitleBar"
        android:usesCleartextTraffic="true">
        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:exported="true"
            android:hardwareAccelerated="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
XML

echo "6. Creating MainActivity.java..."
cat << 'JAVA' > "$WORK"/src/com/stocksync/app/MainActivity.java
package com.stocksync.app;

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
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                mContext.startActivity(intent);
            }
        }
        
        @JavascriptInterface
        public String getAppVersion() {
            return "1.1.3";
        }
    }
}
JAVA

echo "7. Generating R.java..."
aapt package -f -m -J "$WORK"/gen -M "$WORK"/AndroidManifest.xml -S "$WORK"/res -I "$ANDROID_JAR"

echo "8. Compiling Java..."
javac -source 1.8 -target 1.8 -bootclasspath "$ANDROID_JAR" -d "$WORK"/bin "$WORK"/gen/com/stocksync/app/R.java "$WORK"/src/com/stocksync/app/MainActivity.java

echo "9. DEXing..."
if [ -n "$DX_JAR" ]; then
    java -Xmx512m -jar "$DX_JAR" --dex --output="$WORK"/bin/classes.dex "$WORK"/bin
else
    dx --dex --output="$WORK"/bin/classes.dex "$WORK"/bin
fi

echo "10. Packaging unaligned APK..."
aapt package -f -0 "" -M "$WORK"/AndroidManifest.xml -S "$WORK"/res -A "$WORK"/assets -I "$ANDROID_JAR" -F "$WORK"/bin/unaligned.apk
cd "$WORK"/bin
aapt add -0 dex unaligned.apk classes.dex

echo "11. Zipalign..."
zipalign -f -p 4 "$WORK"/bin/unaligned.apk "$WORK"/bin/aligned.apk

echo "12. Signing APK..."
KEYSTORE="$APPLET_DIR/stocksync-release.keystore"
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -v -keystore "$KEYSTORE" -alias stocksync -keyalg RSA -keysize 2048 -validity 10000 -storepass stocksync123 -keypass stocksync123 -dname "CN=StockSync"
fi

apksigner sign --ks "$KEYSTORE" --ks-pass pass:stocksync123 --key-pass pass:stocksync123 --ks-key-alias stocksync "$WORK"/bin/aligned.apk

echo "13. Finalizing..."
mkdir -p "$APPLET_DIR"/public
cp "$WORK"/bin/aligned.apk "$APPLET_DIR"/public/StockSync.apk

echo "=== BUILD SUCCESSFUL: v$VERSION_NAME ==="
