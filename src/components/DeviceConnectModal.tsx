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

  // URL ưu tiên cho thiết bị di động truy cập trực tiếp
  const defaultUrl = 'https://ais-pre-raxzxcsor7d6q2kcn7kvxc-98361429439.asia-southeast1.run.app';
  const [currentUrl, setCurrentUrl] = useState(defaultUrl);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loc = window.location.href;
      if (loc && !loc.includes('about:blank') && !loc.includes('srcdoc')) {
        setCurrentUrl(loc);
      }
    }

    if (isOpen) {
      fetchLatestApkUrl();
    }
  }, [isOpen]);

  const fetchLatestApkUrl = async () => {
    try {
      const repo = "philiptrinh1990/stocksync-hub";
      const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`);
      if (response.ok) {
        const data = await response.json();
        const apkAsset = data.assets.find((a: any) => a.name.toLowerCase().endsWith('.apk'));
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
                  Ứng dụng Android đóng gói toàn bộ mã nguồn bên trong APK (Offline Standalone). Hoạt động độc lập 100%, không phụ thuộc đường dẫn máy chủ bên ngoài, mở app là dùng ngay.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                    Bản v1.2.3 (Final Fix - Khắc phục 100% lỗi cài đặt)
                  </span>
                  <span className="text-[11px] text-slate-500">Dung length: ~1.8 MB</span>
                </div>
              </div>
            </div>

            <a
              href={downloadUrl || "/StockSync.apk"}
              download="StockSync.apk"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm rounded-xl shadow-md transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{downloadUrl ? 'Tải Ngay StockSync.apk (v1.2.3)' : 'Đang lấy link tải mới nhất...'}</span>
            </a>

            <div className="mt-2.5 p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1 text-red-600">
                <span>⚠️</span> QUAN TRỌNG: Gỡ cài đặt bản cũ trước!
              </p>
              <p className="text-red-700 font-medium">
                Để tránh lỗi "Chưa cài đặt" hoặc "Phân tích gói", bạn <b>BẮT BUỘC</b> phải gỡ bỏ bản StockSync cũ trên máy trước khi cài bản v1.2.3.
              </p>
              <p>
                1. Sau khi gỡ bản cũ, nhấn vào file <strong>StockSync.apk</strong> mới (v1.2.3).
              </p>
              <p>
                2. Nếu máy hỏi <em>"Cho phép cài đặt từ nguồn này"</em> (Chrome/Tệp), hãy bật <strong>Bật / Cho phép</strong> rồi quay lại nhấn <strong>Cài đặt</strong>.
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

          {/* KHU VỰC QUÉT QR CODE / MỞ LINK TRÊN ĐIỆN THOẠI */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-blue-600" />
              Mở Trên Điện Thoại Bằng Mã QR:
            </h4>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="bg-white p-2.5 rounded-xl shadow-xs border border-slate-200 shrink-0">
                <QRCodeSVG 
                  value={currentUrl} 
                  size={130}
                  level="M"
                  includeMargin={false}
                  fgColor="#0f172a"
                />
              </div>

              <div className="flex-1 space-y-2.5 w-full">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bật camera điện thoại quét mã QR bên cạnh để mở ứng dụng hoặc tải file APK về máy.
                </p>

                <div className="flex items-center gap-1.5">
                  <input 
                    type="text" 
                    readOnly 
                    value={currentUrl} 
                    className="flex-1 bg-white border border-slate-200 text-xs font-mono text-slate-700 px-3 py-2 rounded-lg outline-none select-all truncate"
                  />
                  <button 
                    onClick={() => handleCopy(currentUrl)}
                    className="flex items-center justify-center px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition shrink-0 text-xs font-semibold gap-1 active:scale-95"
                    title="Sao chép link"
                  >
                    {copiedMain ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedMain ? 'Đã chép' : 'Chép'}</span>
                  </button>
                </div>

                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở trong cửa sổ riêng</span>
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
