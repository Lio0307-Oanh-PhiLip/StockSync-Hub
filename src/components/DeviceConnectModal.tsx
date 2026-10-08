import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  X, 
  Smartphone, 
  Globe, 
  Copy, 
  CheckCircle2, 
  Download, 
  ExternalLink, 
  Camera,
  Check
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface DeviceConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceConnectModal: React.FC<DeviceConnectModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, install } = usePWAInstall();
  const [copiedMain, setCopiedMain] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [remoteTag, setRemoteTag] = useState<string>('v1.2.7');
  const [isLatestOnGitHub, setIsLatestOnGitHub] = useState<boolean>(false);

  // URL ưu tiên cho thiết bị di động truy cập trực tiếp (Public Shared URL)
  const defaultUrl = 'https://ais-pre-raxzxcsor7d6q2kcn7kvxc-98361429439.asia-southeast1.run.app';
  const [currentUrl, setCurrentUrl] = useState(defaultUrl);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loc = window.location.href;
      if (loc && !loc.includes('about:blank') && !loc.includes('srcdoc')) {
        let clean = loc.split('?')[0].split('#')[0];
        // Thay thế subdomain dev nội bộ bằng pre công khai để điện thoại kết nối được
        if (clean.includes('ais-dev-')) {
          clean = clean.replace('ais-dev-', 'ais-pre-');
        }
        setCurrentUrl(clean);
      }
    }

    if (isOpen) {
      fetchLatestApkUrl();
    }
  }, [isOpen]);

  const fetchLatestApkUrl = async () => {
    try {
      const repo = "Lio0307-Oanh-PhiLip/StockSync-Hub";
      const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`);
      if (response.ok) {
        const data = await response.json();
        const tag = (data.tag_name || '').trim();
        setRemoteTag(tag);
        setIsLatestOnGitHub(tag.includes('1.2.8'));
        const apkAsset = data.assets?.find((a: any) => a.name.toLowerCase().endsWith('.apk'));
        if (apkAsset) {
          setDownloadUrl(apkAsset.browser_download_url);
        }
      }
    } catch (e) {
      console.warn("Lỗi fetch link APK mới nhất:", e);
    }
  };

  if (!isOpen) return null;

  const handleCopy = (urlToCopy: string) => {
    navigator.clipboard.writeText(urlToCopy);
    setCopiedMain(true);
    setTimeout(() => setCopiedMain(false), 2000);
  };

  const handleNativeInstall = async () => {
    const res = await install();
    if (res) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto animate-in zoom-in-95">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                Cài Đặt App Cho Android & Điện Thoại
              </h2>
              <p className="text-xs text-slate-300">
                Ứng dụng quét mã linh kiện qua camera di động
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto text-slate-700">
          
          {/* LỰA CHỌN 1: TẢI FILE APK CHÍNH THỨC */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-600/30 rounded-2xl p-4 shadow-xs">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                    Lựa chọn 1
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Tải File APK Cài Đặt Trực Tiếp (Android)
                  </h3>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Ứng dụng Android đóng gói toàn bộ 312 mã linh kiện bên trong APK. Hoạt động độc lập 100%, đồng bộ 2 chiều qua WiFi / 4G với máy tính.
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                    Bản Code v1.2.8 (Sẵn sàng)
                  </span>
                  <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                    Bản Release trên GitHub: {remoteTag}
                  </span>
                </div>
              </div>
            </div>

            <a
              href={downloadUrl || "https://github.com/Lio0307-Oanh-PhiLip/StockSync-Hub/releases"}
              download="StockSync.apk"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm rounded-xl shadow-md transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isLatestOnGitHub ? 'Tải Ngay StockSync-v1.2.8.apk' : `Tải APK Hiện Có (${remoteTag})`}</span>
            </a>

            {!isLatestOnGitHub && (
              <div className="mt-2.5 p-3 bg-amber-50/90 border border-amber-300 rounded-xl text-xs text-amber-950 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-900">
                  <span>⚡</span> Chưa có bản APK v1.2.8 trên GitHub?
                </p>
                <p className="text-slate-700 leading-relaxed">
                  Bản code <b>v1.2.8</b> đã hoàn thành trong AI Studio. Để GitHub tạo file <b>StockSync-v1.2.8.apk</b> mới nhất:
                </p>
                <p className="text-blue-800 font-semibold">
                  👉 Hãy nhấn nút <b>"Push changes to GitHub"</b> ở bảng điều khiển bên phải Google AI Studio. GitHub Actions sẽ tự động đóng gói file APK mới chỉ sau ~2 phút!
                </p>
              </div>
            )}

            <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700 space-y-1">
              <p className="font-bold flex items-center gap-1 text-slate-900">
                <span>🛡️</span> Cài đặt an toàn:
              </p>
              <p>
                1. Gỡ cài đặt bản cũ trên điện thoại trước khi cài bản mới để tránh lỗi chữ ký.
              </p>
              <p>
                2. Nếu Google Play Protect cảnh báo, chọn <strong>"Chi tiết khác"</strong> &gt; <strong>"Vẫn cài đặt"</strong>.
              </p>
            </div>
          </div>

          {/* LỰA CHỌN 2: CÀI ĐẶT NHANH TỪ TRÌNH DUYỆT (NẾU HỖ TRỢ) */}
          {isInstallable && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Lựa chọn 2
                </span>
                <h3 className="font-bold text-emerald-950 text-sm">
                  Cài Đặt Nhanh Từ Trình Duyệt
                </h3>
              </div>
              <p className="text-xs text-emerald-800 mb-3">
                Trình duyệt của bạn hỗ trợ cài ứng dụng trực tiếp ra màn hình chính mà không cần tải file ngoài.
              </p>
              <button
                onClick={handleNativeInstall}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Cài Đặt Ngay Ra Màn Hình Chính</span>
              </button>
            </div>
          )}

          {/* KHU VỰC QUÉT QR CODE / ĐỒNG BỘ 2 CHIỀU VỚI APP */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-blue-600" />
                Mã QR Kết Nối & Đồng Bộ 2 Chiều:
              </h4>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                Live 2-Way Hub
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="bg-white p-2.5 rounded-xl shadow-xs border border-slate-200 shrink-0 text-center">
                <QRCodeSVG 
                  value={currentUrl.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws'} 
                  size={130}
                  level="M"
                  includeMargin={false}
                  fgColor="#0f172a"
                />
                <span className="block text-[10px] text-slate-500 font-semibold mt-1">Quét bằng App để kết nối</span>
              </div>

              <div className="flex-1 space-y-2.5 w-full">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mở ứng dụng <b>StockSync Scanner</b> trên điện thoại, hướng camera vào mã QR bên cạnh. Ứng dụng sẽ tự động nhận diện và kết nối đồng bộ 2 chiều với PC.
                </p>

                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500">Địa chỉ WebSocket Server (PC):</span>
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="text" 
                      readOnly 
                      value={currentUrl.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws'} 
                      className="flex-1 bg-white border border-slate-200 text-xs font-mono text-slate-700 px-3 py-2 rounded-lg outline-none select-all truncate"
                    />
                    <button 
                      onClick={() => handleCopy(currentUrl.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws')}
                      className="flex items-center justify-center px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition shrink-0 text-xs font-semibold gap-1 active:scale-95"
                      title="Sao chép link WebSocket"
                    >
                      {copiedMain ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedMain ? 'Đã chép' : 'Chép'}</span>
                    </button>
                  </div>
                </div>

                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở giao diện Web trong cửa sổ riêng</span>
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
