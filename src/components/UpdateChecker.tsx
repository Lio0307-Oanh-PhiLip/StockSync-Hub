import React, { useState, useEffect } from 'react';
import { 
  fetchLatestRelease, 
  ReleaseInfo, 
  formatFileSize, 
  CURRENT_APP_VERSION, 
  GITHUB_REPO 
} from '../services/githubReleaseService';
import { Download, RefreshCw, ExternalLink, X, Shield, Sparkles, CheckCircle, AlertTriangle } from 'lucide-react';

export const UpdateChecker: React.FC = () => {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckMessage, setLastCheckMessage] = useState<string | null>(null);

  useEffect(() => {
    checkUpdates(false);
    // Tự động kiểm tra cập nhật mỗi 5 phút
    const interval = setInterval(() => {
      checkUpdates(false);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const checkUpdates = async (force: boolean = false) => {
    setIsChecking(true);
    try {
      const data = await fetchLatestRelease(force);
      setRelease(data);
      if (data && data.isNewer) {
        setShowBanner(true);
      } else if (force) {
        setLastCheckMessage('Bạn đang sử dụng phiên bản mới nhất!');
        setTimeout(() => setLastCheckMessage(null), 3000);
      }
    } catch (_) {
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <>
      {/* THÔNG BÁO CẬP NHẬT TRÊN THANH CÔNG CỤ HOẶC GÓC MÀN HÌNH */}
      {showBanner && release && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] w-[95%] max-w-2xl animate-in slide-in-from-top-4 duration-300">
          <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-blue-400/40 backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-blue-500/20 text-amber-300 rounded-xl border border-blue-400/30 shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Cập Nhật Mới
                    </span>
                    <h3 className="font-bold text-sm text-white">
                      Đã có bản {release.tag_name} trên GitHub!
                    </h3>
                  </div>
                  <p className="text-xs text-blue-200 mt-1 leading-relaxed">
                    Phiên bản hiện tại: <b>v{CURRENT_APP_VERSION}</b> → Bản mới nhất: <b>{release.tag_name}</b>. Đã cập nhật bộ cài Windows, Linux &amp; Android APK hoàn chỉnh.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowBanner(false)}
                className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
                title="Đóng thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Các nút tải nhanh trực tiếp từ GitHub CDN */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/10">
              {/* Android APK */}
              {release.apkUrl ? (
                <a
                  href={release.apkUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>APK Android {formatFileSize(release.apkSize)}</span>
                </a>
              ) : null}

              {/* Windows .exe */}
              {release.windowsExeUrl ? (
                <a
                  href={release.windowsExeUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Windows .exe {formatFileSize(release.windowsExeSize)}</span>
                </a>
              ) : null}

              {/* Linux AppImage */}
              {release.linuxAppImageUrl ? (
                <a
                  href={release.linuxAppImageUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Linux AppImage {formatFileSize(release.linuxAppImageSize)}</span>
                </a>
              ) : null}

              {/* Xem chi tiết */}
              <button
                onClick={() => setShowDetailModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 transition ml-auto"
              >
                <span>Xem Chi Tiết &amp; Tất Cả File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT CẬP NHẬT & TẤT CẢ FILE TẢI VỀ */}
      {showDetailModal && release && (
        <div className="fixed inset-0 bg-slate-950/80 z-[10000] flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    Chi Tiết Bản Cập Nhật {release.tag_name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Phát hành trên GitHub: {new Date(release.published_at).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Trạng thái phiên bản */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Phiên bản đang dùng:</span>
                <span className="font-bold text-slate-200">v{CURRENT_APP_VERSION}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Phiên bản mới nhất:</span>
                <span className="font-bold text-emerald-400">{release.tag_name} (Sẵn sàng)</span>
              </div>
            </div>

            {/* DANH SÁCH FILE TẢI VỀ TỪ GITHUB CDN */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>📦</span> Tải trực tiếp từ máy chủ GitHub Release (Tốc độ cao):
              </h4>

              {/* Android APK */}
              <div className="flex items-center justify-between p-3 bg-slate-800/80 rounded-xl border border-slate-700 hover:border-emerald-500/50 transition">
                <div>
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <span>📱</span> StockSync Android APK
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Tích hợp 312 linh kiện kho • Đồng bộ quét 2 chiều • {formatFileSize(release.apkSize)}
                  </div>
                </div>
                {release.apkUrl ? (
                  <a
                    href={release.apkUrl}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải APK</span>
                  </a>
                ) : (
                  <span className="text-xs text-amber-400">Đang tạo...</span>
                )}
              </div>

              {/* Windows .exe */}
              <div className="flex items-center justify-between p-3 bg-slate-800/80 rounded-xl border border-slate-700 hover:border-blue-500/50 transition">
                <div>
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <span>🪟</span> StockSync Hub Windows (.exe)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Bản Portable độc lập • Tự động đổi cổng khi bận • {formatFileSize(release.windowsExeSize)}
                  </div>
                </div>
                {release.windowsExeUrl ? (
                  <a
                    href={release.windowsExeUrl}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải .EXE</span>
                  </a>
                ) : (
                  <span className="text-xs text-amber-400">Đang tạo...</span>
                )}
              </div>

              {/* Linux AppImage */}
              <div className="flex items-center justify-between p-3 bg-slate-800/80 rounded-xl border border-slate-700 hover:border-indigo-500/50 transition">
                <div>
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <span>🐧</span> StockSync Hub Linux (AppImage)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Chạy 1 chạm không cần cài đặt • Không lỗi Archive Manager • {formatFileSize(release.linuxAppImageSize)}
                  </div>
                </div>
                {release.linuxAppImageUrl ? (
                  <a
                    href={release.linuxAppImageUrl}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải AppImage</span>
                  </a>
                ) : (
                  <span className="text-xs text-amber-400">Đang tạo...</span>
                )}
              </div>

              {/* Linux .deb */}
              {release.linuxDebUrl && (
                <div className="flex items-center justify-between p-3 bg-slate-800/80 rounded-xl border border-slate-700 hover:border-slate-500 transition">
                  <div>
                    <div className="font-bold text-xs text-white flex items-center gap-1.5">
                      <span>🐧</span> StockSync Hub Linux (.deb)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Gói cài đặt chuẩn Debian / Ubuntu / Mint • {formatFileSize(release.linuxDebSize)}
                    </div>
                  </div>
                  <a
                    href={release.linuxDebUrl}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải .DEB</span>
                  </a>
                </div>
              )}
            </div>

            {/* Ghi chú phát hành từ GitHub */}
            {release.body && (
              <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl text-xs space-y-1">
                <span className="font-bold text-slate-300 block">📝 Thông tin phát hành:</span>
                <div className="text-slate-400 whitespace-pre-wrap line-clamp-4 leading-relaxed font-mono text-[11px]">
                  {release.body}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <a
                href={release.html_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <span>Xem trang GitHub Release</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
