#!/bin/bash
set -e

APPLET_DIR="/app/applet"
WORK=/tmp/apk-build
rm -rf "$WORK"
mkdir -p "$WORK"/src/com/stocksync/app "$WORK"/res/values "$WORK"/res/mipmap-hdpi "$WORK"/bin "$WORK"/gen "$WORK"/assets

ANDROID_JAR=/usr/lib/android-sdk/platforms/android-23/android.jar
DX_JAR=/usr/share/java/com.android.dx.jar

echo "1. Building fresh web assets with Vite..."
cd "$APPLET_DIR"
npm run build

echo "2. Copying web dist to APK assets (offline bundled app)..."
cp -r "$APPLET_DIR"/dist/* "$WORK"/assets/
# Xóa file APK và server.cjs nếu có trong assets để tránh đệ quy và phình dung lượng
rm -f "$WORK"/assets/*.apk "$WORK"/assets/download/*.apk "$WORK"/assets/server.cjs* || true

echo "3. Creating strings.xml..."
cat << 'XML' > "$WORK"/res/values/strings.xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">StockSync</string>
</resources>
XML

echo "4. Copying app icon..."
cp "$APPLET_DIR"/public/pwa-192x192.png "$WORK"/res/mipmap-hdpi/ic_launcher.png

echo "5. Creating AndroidManifest.xml..."
cat << 'XML' > "$WORK"/AndroidManifest.xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.stocksync.app"
    android:versionCode="9"
    android:versionName="1.0.9">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="28" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />

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

echo "6. Creating MainActivity.java with local asset interceptor..."
cat << 'JAVA' > "$WORK"/src/com/stocksync/app/MainActivity.java
package com.stocksync.app;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.*;
import android.view.Window;
import android.content.pm.PackageManager;
import android.Manifest;
import android.os.Build;
import java.io.InputStream;
import java.io.IOException;

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

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith(LOCAL_ORIGIN)) {
                    view.loadUrl(url);
                    return true;
                }
                return false;
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith(LOCAL_ORIGIN)) {
                    String path = request.getUrl().getPath();
                    return getAssetResponse(path);
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                if (url.startsWith(LOCAL_ORIGIN)) {
                    String path = url.substring(LOCAL_ORIGIN.length());
                    int queryIdx = path.indexOf("?");
                    if (queryIdx != -1) path = path.substring(0, queryIdx);
                    int hashIdx = path.indexOf("#");
                    if (hashIdx != -1) path = path.substring(0, hashIdx);
                    return getAssetResponse(path);
                }
                return super.shouldInterceptRequest(view, url);
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
                    else if (path.endsWith(".json") || path.endsWith(".webmanifest")) mime = "application/json";
                    else if (path.endsWith(".woff")) mime = "font/woff";
                    else if (path.endsWith(".woff2")) mime = "font/woff2";
                    else if (path.endsWith(".ttf")) mime = "font/ttf";
                    
                    return new WebResourceResponse(mime, "UTF-8", is);
                } catch (IOException e) {
                    return null;
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                MainActivity.this.runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        request.grant(request.getResources());
                    }
                });
            }
        });

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_CODE);
            }
        }

        // Tải app trực tiếp từ asset đóng gói trong APK
        webView.loadUrl(LOCAL_ORIGIN + "/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
JAVA

echo "7. Generating R.java..."
aapt package -f -m -J "$WORK"/gen -M "$WORK"/AndroidManifest.xml -S "$WORK"/res -I "$ANDROID_JAR"

echo "8. Compiling Java..."
javac -source 1.8 -target 1.8 -bootclasspath "$ANDROID_JAR" -d "$WORK"/bin "$WORK"/gen/com/stocksync/app/R.java "$WORK"/src/com/stocksync/app/MainActivity.java

echo "9. DEXing..."
java -jar "$DX_JAR" --dex --output="$WORK"/bin/classes.dex "$WORK"/bin

echo "10. Packaging APK with embedded assets..."
aapt package -f -0 "" -M "$WORK"/AndroidManifest.xml -S "$WORK"/res -A "$WORK"/assets -I "$ANDROID_JAR" -F "$WORK"/bin/unaligned.apk
cd "$WORK"/bin
aapt add -0 dex unaligned.apk classes.dex

echo "11. Zipalign (before apksigner)..."
zipalign -f -p 4 "$WORK"/bin/unaligned.apk "$WORK"/bin/aligned.apk

echo "12. Preparing persistent release keystore..."
KEYSTORE="$APPLET_DIR/stocksync-release.keystore"
if [ ! -f "$KEYSTORE" ]; then
  echo "    Generating new persistent release keystore..."
  keytool -genkeypair -v -keystore "$KEYSTORE" -alias stocksync -keyalg RSA -keysize 2048 -validity 10000 -storepass stocksync123 -keypass stocksync123 -dname "CN=StockSync, OU=OPPO, O=Warehouse, L=HCM, ST=VN, C=VN"
else
  echo "    Using existing persistent release keystore..."
fi

echo "13. Signing with apksigner (v1, v2, v3 schemes)..."
apksigner sign --ks "$KEYSTORE" --ks-pass pass:stocksync123 --key-pass pass:stocksync123 --ks-key-alias stocksync --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true "$WORK"/bin/aligned.apk

echo "14. Verifying APK signature..."
apksigner verify --verbose "$WORK"/bin/aligned.apk

echo "15. Copying APK to public & dist..."
mkdir -p "$APPLET_DIR"/public/download
cp "$WORK"/bin/aligned.apk "$APPLET_DIR"/public/StockSync.apk
cp "$WORK"/bin/aligned.apk "$APPLET_DIR"/public/download/StockSync.apk
if [ -d "$APPLET_DIR"/dist ]; then
  cp "$WORK"/bin/aligned.apk "$APPLET_DIR"/dist/StockSync.apk
fi

echo "ALL DONE: Offline Standalone APK built successfully!"
ls -lh "$APPLET_DIR"/public/StockSync.apk
