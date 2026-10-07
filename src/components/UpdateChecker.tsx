import React, { useState, useEffect } from 'react';

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
  }>;
}

export const UpdateChecker: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState<GitHubRelease | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Hardcoded for the app's repo (should be updated by user or template)
  const GITHUB_REPO = "philiptrinh1990/stocksync-hub"; 
  const CURRENT_VERSION = "1.1.3";

  useEffect(() => {
    // Only check if running inside the Android APK (detect via bridge)
    if (typeof (window as any).AndroidBridge !== 'undefined') {
      checkForUpdates();
    }
  }, []);

  const checkForUpdates = async () => {
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
      if (!response.ok) return;
      
      const latestRelease: GitHubRelease = await response.json();
      const latestTag = latestRelease.tag_name.replace('v', '');
      
      if (isVersionNewer(latestTag, CURRENT_VERSION)) {
        setUpdateAvailable(latestRelease);
      }
    } catch (error) {
      console.error("Lỗi kiểm tra cập nhật:", error);
    }
  };

  const isVersionNewer = (latest: string, current: string) => {
    const l = latest.split('.').map(Number);
    const c = current.split('.').map(Number);
    for (let i = 0; i < Math.max(l.length, c.length); i++) {
      const lv = l[i] || 0;
      const cv = c[i] || 0;
      if (lv > cv) return true;
      if (lv < cv) return false;
    }
    return false;
  };

  const handleUpdate = async () => {
    if (!updateAvailable) return;
    
    const apkAsset = updateAvailable.assets.find(a => a.name.endsWith('.apk'));
    if (!apkAsset) {
      window.open(updateAvailable.html_url, '_blank');
      return;
    }

    setIsDownloading(true);
    // In a real implementation with flutter_downloader/dio it would be native.
    // Here in WebView, we'll simulate a download or use a bridge if we had a downloader in Java.
    // For now, we'll just open the URL which might trigger a browser download.
    // If the AndroidBridge had an 'installFromUrl' it would be better.
    
    window.location.href = apkAsset.browser_download_url;
    
    // Notify user
    alert("Đang tải xuống bản cập nhật mới... Vui lòng mở file APK sau khi tải xong để cài đặt.");
    setUpdateAvailable(null);
    setIsDownloading(false);
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[9999] animate-bounce">
      <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-2xl flex flex-col gap-3 border-2 border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm">🚀 Đã có phiên bản mới: {updateAvailable.tag_name}</h3>
            <p className="text-[10px] opacity-90">Bạn đang dùng v{CURRENT_VERSION}. Hãy cập nhật để sửa lỗi build APK!</p>
          </div>
          <button 
            onClick={() => setUpdateAvailable(null)}
            className="text-white/60 hover:text-white"
          >
            ✕
          </button>
        </div>
        <button 
          onClick={handleUpdate}
          disabled={isDownloading}
          className="bg-white text-blue-700 font-bold py-2 px-4 rounded-xl text-xs hover:bg-blue-50 transition-colors shadow-sm"
        >
          {isDownloading ? 'Đang tải...' : 'Cập nhật ngay'}
        </button>
      </div>
    </div>
  );
};
