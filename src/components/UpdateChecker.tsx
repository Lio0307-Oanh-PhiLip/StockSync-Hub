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
  const [showPlayProtectGuide, setShowPlayProtectGuide] = useState(false);

  // GitHub Repository Configuration
  const GITHUB_REPO = "philiptrinh1990/stocksync-hub"; 
  const CURRENT_VERSION = "1.2.6";

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
      if (!response.ok) return;
      
      const latestRelease: GitHubRelease = await response.json();
      const latestTag = (latestRelease.tag_name || '').replace('v', '').trim();
      
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
    
    const apkAsset = updateAvailable.assets.find(a => a.name.toLowerCase().endsWith('.apk'));
    if (!apkAsset) {
      window.open(updateAvailable.html_url, '_blank');
      return;
    }

    setIsDownloading(true);
    window.location.href = apkAsset.browser_download_url;
    
    setTimeout(() => {
      setIsDownloading(false);
      setShowPlayProtectGuide(true);
    }, 1500);
  };

  return (
    <>
      {updateAvailable && (
        <div className="fixed bottom-20 left-4 right-4 z-[9999]">
          <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-4 rounded-2xl shadow-2xl flex flex-col gap-3 border border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                <div>
                  <h3 className="font-bold text-sm">🚀 Đã có phiên bản mới: {updateAvailable.tag_name}</h3>
                  <p className="text-[11px] opacity-90">Hiện tại: v{CURRENT_VERSION} → Khắc phục tối ưu cài đặt Android</p>
                </div>
              </div>
              <button 
                onClick={() => setUpdateAvailable(null)}
                className="text-white/70 hover:text-white text-lg p-1"
                title="Đóng"
              >
                ✕
              </button>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={handleUpdate}
                disabled={isDownloading}
                className="flex-1 bg-white text-blue-800 font-bold py-2.5 px-4 rounded-xl text-xs hover:bg-blue-50 transition-colors shadow-md flex items-center justify-center gap-1.5"
              >
                {isDownloading ? '⏳ Đang chuyển hướng tải...' : '📥 Tải và Cập nhật ngay'}
              </button>
              <button
                onClick={() => setShowPlayProtectGuide(true)}
                className="bg-blue-900/60 hover:bg-blue-900 text-white font-medium py-2.5 px-3 rounded-xl text-xs border border-white/20 transition-colors"
                title="Hướng dẫn vượt Play Protect"
              >
                🛡️ Hướng dẫn cài đặt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hướng dẫn cài đặt và xử lý Play Protect */}
      {showPlayProtectGuide && (
        <div className="fixed inset-0 bg-black/70 z-[10000] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 text-slate-100 rounded-2xl max-w-md w-full p-5 border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <h3 className="font-bold text-base text-amber-400">Khắc phục lỗi Google Play Protect</h3>
              </div>
              <button 
                onClick={() => setShowPlayProtectGuide(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
                <p className="font-semibold text-amber-300">⚠️ Tại sao Play Protect chặn cài APK nội bộ?</p>
                <p>Google Play Protect tự động cảnh báo với mọi ứng dụng cài ngoài kho CH Play (Sideload APK nội bộ doanh nghiệp).</p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-white text-sm">👉 3 bước cài đặt thành công 100%:</p>
                <ol className="list-decimal list-inside space-y-1.5 pl-1">
                  <li>Khi màn hình hiện <b className="text-red-400">"Bị chặn bởi Play Protect"</b>:</li>
                  <li>Bấm vào dòng chữ <b className="text-blue-400 underline">"Chi tiết khác" (More details)</b> ở dưới cùng.</li>
                  <li>Bấm chọn <b className="text-emerald-400 font-bold">"Vẫn cài đặt" (Install anyway)</b>.</li>
                </ol>
              </div>

              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 text-[11px] space-y-1">
                <p className="font-semibold text-slate-200">💡 Mẹo cho máy báo "Ứng dụng chưa được cài đặt" hoặc "Lỗi phân tích cú pháp":</p>
                <p>Nếu bạn đã cài phiên bản cũ từ trước, hãy <b>Gỡ cài đặt (Uninstall) bản cũ</b> trước khi bấm cài bản mới v1.2.5. Bản v1.2.5 đã được build chuẩn hóa 100%.</p>
              </div>
            </div>

            <button
              onClick={() => setShowPlayProtectGuide(false)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-lg"
            >
              Đã hiểu, tiếp tục cài đặt
            </button>
          </div>
        </div>
      )}
    </>
  );
};
