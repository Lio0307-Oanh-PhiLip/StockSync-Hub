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
  Check,
  Wifi,
  Cloud,
  HelpCircle,
  RefreshCw,
  Radio,
  Monitor,
  Sparkles
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { 
  fetchLatestRelease, 
  ReleaseInfo, 
  formatFileSize, 
  CURRENT_APP_VERSION, 
  GITHUB_REPO 
} from '../services/githubReleaseService';

interface DeviceConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceConnectModal: React.FC<DeviceConnectModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, install } = usePWAInstall();
  const [copiedMain, setCopiedMain] = useState(false);
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
  const [isRefreshingRelease, setIsRefreshingRelease] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [remoteTag, setRemoteTag] = useState<string>('v1.2.9');
  const [isLatestOnGitHub, setIsLatestOnGitHub] = useState<boolean>(false);

  // Connection mode: 'web' (open in mobile browser - recommended & works immediately), 'wifi' (local LAN for local PC), 'cloud' (remote cloud / tunnel)
  const [connectMode, setConnectMode] = useState<'web' | 'wifi' | 'cloud'>('web');
  
  // Network detection state
  const [detectedIps, setDetectedIps] = useState<string[]>([]);
  const [selectedIp, setSelectedIp] = useState<string>('192.168.1.100');
  const [port, setPort] = useState<number>(3000);
  const [onlineWS, setOnlineWS] = useState<number>(0);

  // URL ưu tiên cho thiết bị di động truy cập trực tiếp (dùng ais-pre để không cần đăng nhập Google)
  const defaultUrl = 'https://ais-pre-cu7gkxvrv4htowkh5nhxq4-670519460440.asia-southeast1.run.app';
  const [currentUrl, setCurrentUrl] = useState(defaultUrl);
  const [customCloudUrl, setCustomCloudUrl] = useState(defaultUrl);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loc = window.location.href;
      if (loc && !loc.includes('about:blank') && !loc.includes('srcdoc')) {
        let clean = loc.split('?')[0].split('#')[0].replace(/\/+$/, '');
        // Chuyển ais-dev sang ais-pre để điện thoại quét mã QR có thể truy cập ngay không bị chặn đăng nhập Google
        if (clean.includes('ais-dev-')) {
          clean = clean.replace('ais-dev-', 'ais-pre-');
        }
        setCurrentUrl(clean);
        setCustomCloudUrl(clean);

        // If user is accessing via an IP in browser, use that IP!
        const hostname = window.location.hostname;
        if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('run.app')) {
          setSelectedIp(hostname);
        }
      }
    }

    if (isOpen) {
      fetchLatestApkUrl();
      fetchNetworkInfo();
      fetchHealth();
      const interval = setInterval(() => {
        fetchHealth();
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const fetchNetworkInfo = async () => {
    try {
      const res = await fetch('/api/network-info');
      if (res.ok) {
        const data = await res.json();
        if (data.port) setPort(data.port);
        if (Array.isArray(data.localIps) && data.localIps.length > 0) {
          // Filter to prefer 192.168.x.x or 10.x.x.x or first available
          const validIps = data.localIps.filter((ip: string) => !ip.startsWith('127.') && !ip.startsWith('169.254.'));
          if (validIps.length > 0) {
            setDetectedIps(validIps);
            setSelectedIp(validIps[0]);
          } else {
            setDetectedIps(data.localIps);
            if (data.localIps[0]) setSelectedIp(data.localIps[0]);
          }
        }
      }
    } catch (_) {}
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setOnlineWS(data.onlineWS || 0);
      }
    } catch (_) {}
  };

  const fetchLatestApkUrl = async (force: boolean = false) => {
    setIsRefreshingRelease(true);
    try {
      const data = await fetchLatestRelease(force);
      if (data) {
        setReleaseInfo(data);
        setRemoteTag(data.tag_name);
        setIsLatestOnGitHub(data.tag_name.includes(CURRENT_APP_VERSION) || data.tag_name.includes('1.2.9'));
        if (data.apkUrl) {
          setDownloadUrl(data.apkUrl);
        }
      }
    } catch (e) {
      console.warn("Lỗi fetch thông tin release GitHub:", e);
    } finally {
      setIsRefreshingRelease(false);
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

  // Compute the exact QR value based on active connectMode
  const getQrValue = (): string => {
    if (connectMode === 'wifi') {
      const cleanIp = selectedIp.trim().replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '').replace(/\/.*$/, '');
      const hostPort = cleanIp.includes(':') ? cleanIp : `${cleanIp}:${port}`;
      return `ws://${hostPort}/ws`;
    }
    if (connectMode === 'web') {
      if (currentUrl.includes('run.app') || currentUrl.startsWith('https://')) {
        return currentUrl;
      }
      const cleanIp = selectedIp.trim().replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '').replace(/\/.*$/, '');
      const hostPort = cleanIp.includes(':') ? cleanIp : `${cleanIp}:${port}`;
      return `http://${hostPort}`;
    }
    // Cloud / Tunnel mode
    let clean = customCloudUrl.trim();
    if (clean.startsWith('http://')) clean = clean.replace('http://', 'ws://');
    if (clean.startsWith('https://')) clean = clean.replace('https://', 'wss://');
    if (!clean.startsWith('ws://') && !clean.startsWith('wss://')) clean = `wss://${clean}`;
    if (!clean.endsWith('/ws')) clean = clean.endsWith('/') ? `${clean}ws` : `${clean}/ws`;
    return clean;
  };

  const currentQrValue = getQrValue();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto animate-in zoom-in-95">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                Kết Nối & Cài Đặt App Cho Điện Thoại
              </h2>
              <p className="text-xs text-slate-300">
                Đồng bộ 2 chiều dữ liệu kho xác linh kiện giữa PC và điện thoại di động
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
          
          {/* KHU VỰC QUÉT QR CODE KẾT NỐI REALTIME (ƯU TIÊN HÀNG ĐẦU) */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 border-2 border-blue-500/30 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-blue-600" />
                Mã QR Kết Nối & Đồng Bộ 2 Chiều:
              </h4>
              
              {/* Live Connection Badge */}
              {onlineWS > 0 ? (
                <span className="flex items-center gap-1.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-300 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Đã kết nối {onlineWS} điện thoại
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[11px] font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  Chờ quét từ điện thoại
                </span>
              )}
            </div>

            {/* TAB SELECTOR CHO PHƯƠNG THỨC KẾT NỐI */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/70 rounded-xl mb-3.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setConnectMode('web')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition cursor-pointer ${
                  connectMode === 'web' 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 bg-white/50'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>1. Web Scanner (Dùng Ngay)</span>
              </button>
              <button
                type="button"
                onClick={() => setConnectMode('wifi')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition cursor-pointer ${
                  connectMode === 'wifi' 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 bg-white/50'
                }`}
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>2. Wi-Fi LAN (App APK)</span>
              </button>
              <button
                type="button"
                onClick={() => setConnectMode('cloud')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition cursor-pointer ${
                  connectMode === 'cloud' 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 bg-white/50'
                }`}
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>3. Cloud / Ngrok</span>
              </button>
            </div>

            {/* QR CODE & THÔNG TIN ĐỊA CHỈ */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-xs shrink-0 text-center">
                <QRCodeSVG 
                  value={currentQrValue} 
                  size={145}
                  level="M"
                  includeMargin={false}
                  fgColor="#0f172a"
                />
                <span className="block text-[11px] text-blue-700 font-bold mt-1.5">
                  {connectMode === 'web' ? 'Quét mở Web Scanner ngay' : 'Quét bằng App StockSync'}
                </span>
              </div>

              <div className="flex-1 space-y-2.5 w-full text-xs">
                {connectMode === 'web' && (
                  <>
                    <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1">
                      <p className="font-bold text-blue-900 flex items-center gap-1.5 text-xs">
                        <span>⭐</span> Hoạt động ngay 100% không cần cấu hình IP:
                      </p>
                      <p className="text-slate-700 leading-relaxed text-[11px]">
                        1. Dùng <b>Camera thường của bất kỳ điện thoại nào</b> (iPhone hoặc Android) hướng vào mã QR bên cạnh.
                      </p>
                      <p className="text-slate-700 leading-relaxed text-[11px]">
                        2. Nhấp vào đường link để mở ứng dụng trực tiếp trên <b>Chrome / Safari</b>.
                      </p>
                      <p className="text-slate-700 leading-relaxed text-[11px]">
                        3. Nhấn nút <b>Camera</b> trên điện thoại để quét mã vạch. Kết quả quét sẽ <b>nhảy ngay lập tức lên màn hình PC này theo thời gian thực</b>!
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-500">Đường dẫn Web Scanner:</span>
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="text" 
                          readOnly 
                          value={currentQrValue} 
                          className="flex-1 bg-slate-50 border border-slate-300 text-xs font-mono text-slate-700 px-2.5 py-1.5 rounded-lg outline-none select-all truncate"
                        />
                        <button 
                          onClick={() => handleCopy(currentQrValue)}
                          className="flex items-center justify-center px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition shrink-0 text-xs font-semibold gap-1"
                        >
                          {copiedMain ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedMain ? 'Đã chép' : 'Chép'}</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {connectMode === 'wifi' && (
                  <>
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-amber-950">
                      <p className="font-bold flex items-center gap-1 text-amber-900 text-[11px]">
                        <span>⚠️</span> Hướng dẫn kết nối App APK qua mạng LAN (Wi-Fi):
                      </p>
                      <p className="text-[11px] leading-relaxed text-slate-700">
                        Bạn đang xem bản web Cloud. Để App APK tìm thấy PC trong mạng Wi-Fi, máy tính PC của bạn cần chạy máy chủ cục bộ và <b>phải nhập chính xác địa chỉ IPv4 máy tính PC</b> của bạn:
                      </p>
                      <p className="text-[11px] font-semibold text-blue-800">
                        👉 Bấm Win+R gõ <code>cmd</code> rồi gõ lệnh <code>ipconfig</code> để xem IPv4 (ví dụ 192.168.1.15).
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700">Địa chỉ IPv4 của máy tính PC bạn:</span>
                        <span className="text-slate-400 text-[10px]">Cổng: {port}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="text" 
                          value={selectedIp}
                          onChange={(e) => setSelectedIp(e.target.value)}
                          placeholder="vd: 192.168.1.15"
                          className="flex-1 bg-slate-50 border border-slate-300 text-xs font-mono text-slate-800 px-2.5 py-1.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white transition"
                        />
                        <button 
                          onClick={() => handleCopy(currentQrValue)}
                          className="flex items-center justify-center px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition shrink-0 text-xs font-semibold gap-1"
                          title="Sao chép địa chỉ WebSocket"
                        >
                          {copiedMain ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedMain ? 'Đã chép' : 'Chép'}</span>
                        </button>
                      </div>

                      <p className="text-[10px] text-slate-500 italic">
                        * Sau khi sửa IP, mã QR bên cạnh sẽ tự cập nhật. Mở app APK quét lại mã để kết nối.
                      </p>
                    </div>
                  </>
                )}

                {connectMode === 'cloud' && (
                  <>
                    <p className="text-slate-600 leading-relaxed">
                      ☁️ <b>Kết nối qua Internet / Cloud:</b> Nhập địa chỉ Cloud Run, ngrok hoặc Cloudflare tunnel của bạn để kết nối từ xa ngoài mạng Wi-Fi.
                    </p>
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-500">Địa chỉ WebSocket Cloud:</span>
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="text" 
                          value={customCloudUrl}
                          onChange={(e) => setCustomCloudUrl(e.target.value)}
                          placeholder="wss://... hoặc https://..."
                          className="flex-1 bg-slate-50 border border-slate-300 text-xs font-mono text-slate-800 px-2.5 py-1.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white transition"
                        />
                        <button 
                          onClick={() => handleCopy(currentQrValue)}
                          className="flex items-center justify-center px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition shrink-0 text-xs font-semibold gap-1"
                        >
                          {copiedMain ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedMain ? 'Đã chép' : 'Chép'}</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Thông báo kết nối thành công */}
            {onlineWS > 0 && (
              <div className="mt-2.5 p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">
                  Tuyệt vời! Đã có {onlineWS} điện thoại kết nối thành công. Mọi lượt quét mã từ điện thoại sẽ đồng bộ tức thời lên màn hình PC này!
                </span>
              </div>
            )}
          </div>

          {/* LỰA CHỌN: TẢI FILE APK CÀI ĐẶT TRỰC TIẾP (ANDROID) */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-600/30 rounded-2xl p-4 shadow-xs">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                    File APK
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
                    Bản Code v{CURRENT_APP_VERSION}
                  </span>
                  <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                    Bản Release trên GitHub: {remoteTag}
                  </span>
                  {releaseInfo?.apkSize && (
                    <span className="text-[11px] font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md border border-blue-200">
                      Dung lượng: {formatFileSize(releaseInfo.apkSize)}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => fetchLatestApkUrl(true)}
                disabled={isRefreshingRelease}
                className="flex items-center gap-1 text-[11px] text-blue-700 hover:text-blue-900 bg-blue-100/70 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg border border-blue-300 transition shrink-0"
                title="Làm mới trạng thái từ GitHub"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingRelease ? 'animate-spin' : ''}`} />
                <span>{isRefreshingRelease ? 'Đang check...' : 'Kiểm tra GitHub'}</span>
              </button>
            </div>

            <a
              href={releaseInfo?.apkUrl || downloadUrl || "/download/StockSync.apk"}
              download="StockSync.apk"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm rounded-xl shadow-md transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>
                {releaseInfo?.apkUrl 
                  ? `Tải StockSync APK (${remoteTag}) - Máy Chủ GitHub CDN`
                  : `Tải APK Hiện Có (${remoteTag})`}
              </span>
            </a>

            {!isLatestOnGitHub && (
              <div className="mt-2.5 p-3 bg-amber-50/90 border border-amber-300 rounded-xl text-xs text-amber-950 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-900">
                  <span>⚡</span> Đẩy lên GitHub để tự động tạo bản cài đặt mới:
                </p>
                <p className="text-slate-700 leading-relaxed">
                  Mã nguồn đã hoàn thành trong AI Studio. Hãy nhấn nút <b>"Push changes to GitHub"</b> ở thanh công cụ góc phải. GitHub Actions sẽ tự động biên dịch và tạo đầy đủ file APK, Windows EXE và Linux DEB/AppImage mới nhất.
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

          {/* LỰA CHỌN: TẢI BỘ CÀI DESKTOP APP CHO MÁY TÍNH PC (WINDOWS & LINUX) */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="bg-amber-400 text-slate-950 text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-wider shadow-xs">
                  PC DESKTOP APP
                </span>
                <span className="font-black text-white text-base sm:text-lg flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-amber-400 shrink-0" />
                  Cài Đặt App Cho Máy Tính PC (Windows &amp; Linux)
                </span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
              Bắt buộc khi sử dụng kết nối <b>Wi-Fi LAN nội bộ offline (không dùng Internet)</b>: Cài app lên PC để tự động chạy máy chủ kho &amp; cổng WebSocket cho điện thoại kết nối tức thì.
            </p>

            {/* 4 Download Options: 2 Columns for spacious alignment without text clipping */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {/* 1. Windows .exe */}
              <a
                href={releaseInfo?.windowsExeUrl || "/download/StockSync-Hub.exe"}
                download="StockSync-Hub.exe"
                className="flex items-center gap-3 p-3 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white rounded-xl border border-blue-400/40 transition shadow-sm group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Monitor className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm text-white truncate">Windows (.exe)</div>
                  <div className="text-xs text-blue-100 truncate">
                    {releaseInfo?.windowsExeSize ? formatFileSize(releaseInfo.windowsExeSize) : 'Win 10, 11'} • Chạy độc lập
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 group-hover:bg-white/25 transition">
                  <Download className="w-4 h-4 text-white" />
                </div>
              </a>

              {/* 2. Windows .zip (Khuyên dùng) */}
              <a
                href={releaseInfo?.windowsZipUrl || "/download/StockSync-Hub-windows-portable.zip"}
                download="StockSync-Hub-windows-portable.zip"
                className="flex items-center gap-3 p-3 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white rounded-xl border border-indigo-400/40 transition shadow-sm group cursor-pointer ring-2 ring-amber-400/60"
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm text-white truncate flex items-center gap-1.5">
                    <span>Windows (.zip)</span>
                    <span className="text-[10px] font-black bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded">Khuyên Dùng</span>
                  </div>
                  <div className="text-xs text-indigo-100 truncate">
                    Tự tạo Desktop Shortcut 1 chạm
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 group-hover:bg-white/25 transition">
                  <Download className="w-4 h-4 text-white" />
                </div>
              </a>

              {/* 3. Linux AppImage */}
              <a
                href={releaseInfo?.linuxAppImageUrl || "/download/StockSync-Hub.AppImage"}
                download="StockSync-Hub.AppImage"
                className="flex items-center gap-3 p-3 bg-emerald-700 hover:bg-emerald-600 active:scale-98 text-white rounded-xl border border-emerald-500/40 transition shadow-sm group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5 text-amber-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm text-white truncate">Linux AppImage</div>
                  <div className="text-xs text-emerald-100 truncate">
                    {releaseInfo?.linuxAppImageSize ? formatFileSize(releaseInfo.linuxAppImageSize) : 'Portable'} • Chạy 1 chạm
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 group-hover:bg-white/25 transition">
                  <Download className="w-4 h-4 text-white" />
                </div>
              </a>

              {/* 4. Linux .deb */}
              <a
                href={releaseInfo?.linuxDebUrl || "/download/StockSync-Hub.deb"}
                download="StockSync-Hub.deb"
                className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 active:scale-98 text-white rounded-xl border border-slate-600 transition shadow-sm group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5 text-slate-200" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm text-white truncate">Linux (.deb)</div>
                  <div className="text-xs text-slate-300 truncate">
                    {releaseInfo?.linuxDebSize ? formatFileSize(releaseInfo.linuxDebSize) : 'Ubuntu/Debian'} • Gói hệ thống
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 group-hover:bg-white/25 transition">
                  <Download className="w-4 h-4 text-white" />
                </div>
              </a>
            </div>

            <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-300 space-y-1.5 leading-relaxed">
              <p className="font-bold text-white flex items-center gap-1.5">
                <span>💡</span> Hướng dẫn mở máy chủ PC &amp; vượt SmartScreen:
              </p>
              <p>
                • <b>Windows (.exe)</b>: Nếu Windows hiện màn hình xanh <i>"Windows protected your PC"</i>, hãy bấm vào chữ <b className="text-blue-300 underline">"More info" (Thông tin khác)</b> &gt; chọn <b className="text-emerald-300">"Run anyway" (Vẫn chạy)</b>.
              </p>
              <p>
                • <b>Windows (.zip) (Khuyên dùng nhất)</b>: Tải file zip về, giải nén và nhấp đúp file <b>Cai-Dat-StockSync.bat</b> để hệ thống tự tạo icon <b>StockSync Hub</b> ngoài màn hình Desktop và khởi động máy chủ.
              </p>
              <p>
                • <b>Linux AppImage</b>: Nhấp chuột phải vào file <code>.AppImage</code> &gt; <b>Properties</b> &gt; tick <b>"Allow executing file as program"</b> &gt; nhấp đúp để mở chạy 1 chạm.
              </p>
            </div>
          </div>

          {/* LỰA CHỌN PWA: CÀI ĐẶT NHANH TỪ TRÌNH DUYỆT (NẾU HỖ TRỢ) */}
          {isInstallable && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  PWA App
                </span>
                <h3 className="font-bold text-emerald-950 text-sm">
                  Cài Đặt Nhanh Từ Trình Duyệt
                </h3>
              </div>
              <p className="text-xs text-emerald-800 mb-3">
                Trình duyệt hỗ trợ cài ứng dụng trực tiếp ra màn hình chính điện thoại mà không cần tải file ngoài.
              </p>
              <button
                onClick={handleNativeInstall}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Cài Đặt Ngay Ra Màn Hình Chính</span>
              </button>
            </div>
          )}

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

