import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  initDriveAuth, 
  driveGoogleSignIn, 
  driveLogout, 
  getDriveAccessToken 
} from '../utils/googleDriveService';
import { 
  CloudUpload, 
  HardDrive, 
  ExternalLink, 
  Check, 
  Copy, 
  Clock, 
  Sparkles, 
  X, 
  FileSpreadsheet, 
  HelpCircle,
  FolderPlus,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  LogOut,
  UserCheck
} from 'lucide-react';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  driveUrl: string;
  onSaveDriveUrl: (url: string, autoSaveEnabled: boolean, intervalMinutes: number) => void;
  onManualPushDrive: () => void;
  isSavingDrive?: boolean;
  lastDriveSavedAt?: string | null;
  autoSaveEnabled?: boolean;
  autoSaveIntervalMinutes?: number;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  driveUrl,
  onSaveDriveUrl,
  onManualPushDrive,
  isSavingDrive = false,
  lastDriveSavedAt = null,
  autoSaveEnabled = true,
  autoSaveIntervalMinutes = 10
}) => {
  const [inputUrl, setInputUrl] = useState<string>(driveUrl || '');
  const [isAutoEnabled, setIsAutoEnabled] = useState<boolean>(autoSaveEnabled);
  const [intervalMins, setIntervalMins] = useState<number>(autoSaveIntervalMinutes);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);

  useEffect(() => {
    setInputUrl(driveUrl || '');
    setIsAutoEnabled(autoSaveEnabled);
    setIntervalMins(autoSaveIntervalMinutes);
  }, [driveUrl, autoSaveEnabled, autoSaveIntervalMinutes, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const unsubscribe = initDriveAuth(
        (user) => setGoogleUser(user),
        () => setGoogleUser(null)
      );
      return () => unsubscribe();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsAuthLoading(true);
    try {
      const res = await driveGoogleSignIn();
      if (res?.user) {
        setGoogleUser(res.user);
      }
    } catch (e: any) {
      alert(`Đăng nhập Google thất bại: ${e.message || 'Lỗi kết nối'}`);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleLogout = async () => {
    await driveLogout();
    setGoogleUser(null);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputUrl(text.trim());
      }
    } catch (_) {
      alert('Không thể tự động đọc clipboard. Vui lòng nhấn Ctrl+V để dán thủ công!');
    }
  };

  const handleSaveConfig = () => {
    onSaveDriveUrl(inputUrl.trim(), isAutoEnabled, intervalMins);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleOpenExternal = () => {
    if (inputUrl.trim()) {
      window.open(inputUrl.trim(), '_blank');
    } else {
      window.open('https://drive.google.com', '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto animate-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/30 border border-emerald-400/40 text-amber-300 shadow-xs">
              <CloudUpload className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-snug">
                Cấu Hình Google Drive & Tự Động Lưu Đối Chiếu
              </h2>
              <p className="text-xs text-emerald-200/90 font-medium">
                Tự động sao lưu lịch sử đối chiếu kho xác lên Google Drive mỗi 10 phút
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 max-h-[82vh] overflow-y-auto text-slate-700">
          
          {/* SECTION 0: TÀI KHOẢN GOOGLE KẾT NỐI API */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                  Trạng Thái Đẩy File Trực Tiếp Google Drive API
                </div>
                {googleUser ? (
                  <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Đã kết nối: {googleUser.email || googleUser.displayName || 'Google Account'}</span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-600 mt-0.5">
                    Đăng nhập tài khoản Google để ứng dụng tải file 5 sheet thẳng lên Drive của bạn
                  </div>
                )}
              </div>
            </div>

            {googleUser ? (
              <button
                type="button"
                onClick={handleGoogleLogout}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-rose-700 border border-slate-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng Xuất</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isAuthLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
              >
                <CloudUpload className="w-4 h-4" />
                <span>{isAuthLoading ? 'Đang Kết Nối...' : 'Đăng Nhập Google Drive'}</span>
              </button>
            )}
          </div>

          {/* SECTION 1: CẤU HÌNH PHẦN MỀM & LINK DRIVE */}
          <div className="bg-slate-50 border-2 border-emerald-500/30 rounded-2xl p-4 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5 tracking-wider">
                <HardDrive className="w-4 h-4 text-emerald-600" />
                Đường Dẫn Thư Mục Google Drive / File Sheets Lưu Trữ:
              </label>

              {lastDriveSavedAt && (
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" />
                  Đã lưu gần nhất: {lastDriveSavedAt}
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <input 
                type="url" 
                value={inputUrl}
                onChange={e => setInputUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/xX123... hoặc https://docs.google.com/spreadsheets/d/..."
                className="flex-1 bg-white border border-slate-300 text-xs sm:text-sm font-mono text-slate-800 px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition shadow-2xs"
              />

              <button
                type="button"
                onClick={handlePasteClipboard}
                className="px-3.5 py-2.5 bg-slate-200 hover:bg-slate-300 active:scale-98 text-slate-800 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                title="Dán từ bộ nhớ tạm Clipboard"
              >
                <Copy className="w-3.5 h-3.5 text-slate-600" />
                <span>Dán</span>
              </button>

              <button
                type="button"
                onClick={handleOpenExternal}
                className="px-3.5 py-2.5 bg-emerald-100 hover:bg-emerald-200 active:scale-98 text-emerald-900 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shrink-0 border border-emerald-300 cursor-pointer"
                title="Mở link trên tab mới"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
                <span>Mở Link</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed italic">
              💡 Bạn có thể dán đường link Thư mục (Folder) Google Drive hoặc link Google Sheets dự phòng. Hệ thống sẽ tự ghi nhớ vĩnh viễn.
            </p>
          </div>

          {/* SECTION 2: TỰ ĐỘNG ĐẨY LÊN DRIVE ĐỊNH KỲ (10 PHÚT) */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <h4 className="font-extrabold text-sm text-emerald-950">
                    Tự Động Lưu & Đẩy Báo Cáo Lên Drive Mỗi 10 Phút
                  </h4>
                  <p className="text-xs text-slate-600">
                    Tự động đóng gói file kiểm kê Excel và lưu trữ mỗi khi đủ chu kỳ
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input 
                  type="checkbox" 
                  checked={isAutoEnabled}
                  onChange={e => setIsAutoEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {isAutoEnabled && (
              <div className="flex items-center gap-3 pt-1 border-t border-emerald-200/80 text-xs">
                <span className="font-bold text-slate-700">Tần suất tự động chạy:</span>
                <select
                  value={intervalMins}
                  onChange={e => setIntervalMins(Number(e.target.value))}
                  className="bg-white border border-emerald-300 text-emerald-900 font-extrabold px-3 py-1 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                >
                  <option value={5}>Mỗi 5 phút</option>
                  <option value={10}>Mỗi 10 phút (Khuyên dùng)</option>
                  <option value={15}>Mỗi 15 phút</option>
                  <option value={30}>Mỗi 30 phút</option>
                </select>
                <span className="text-slate-500 text-[11px]">(Tab trình duyệt phải giữ mở)</span>
              </div>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleSaveConfig}
              className="w-full sm:flex-1 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {savedSuccess ? <Check className="w-4.5 h-4.5 text-amber-300" /> : <ShieldCheck className="w-4.5 h-4.5" />}
              <span>{savedSuccess ? '✓ Đã Lưu Cấu Hình Link Drive!' : 'Lưu Cấu Hình Link Drive'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleSaveConfig();
                onManualPushDrive();
              }}
              disabled={isSavingDrive}
              className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 active:scale-98 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4.5 h-4.5 ${isSavingDrive ? 'animate-spin' : ''}`} />
              <span>{isSavingDrive ? 'Đang Đẩy Dữ Liệu...' : 'Lưu & Đẩy Đối Chiếu Ngay'}</span>
            </button>
          </div>

          {/* SECTION 3: HƯỚNG DẪN CHI TIẾT CÁCH TẠO & LẤY LINK DRIVE */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2.5 text-xs leading-relaxed border border-slate-700">
            <h4 className="font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 text-xs">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              Hướng Dẫn Thêm & Sử Dụng Link Google Drive / Sheets:
            </h4>

            <div className="space-y-1.5 text-slate-300 text-[11px]">
              <p className="flex items-start gap-1.5">
                <span className="font-bold text-amber-400">1. Tạo Thư Mục Trên Google Drive:</span>
                <span>Truy cập <a href="https://drive.google.com" target="_blank" rel="noreferrer" className="text-blue-300 underline font-bold">drive.google.com</a>, tạo một Thư Mục (Folder) mới hoặc file Google Sheets mới dành riêng cho kho xác của trạm SC.</span>
              </p>

              <p className="flex items-start gap-1.5">
                <span className="font-bold text-amber-400">2. Mở Quyền Chia Sẻ Công Khai:</span>
                <span>Bấm nút <b>Chia Sẻ (Share)</b> ở góc trên bên phải thư mục/file $\rightarrow$ Đổi quyền truy cập thành <b>"Bất kỳ ai có liên kết đều có thể xem/chỉnh sửa" (Anyone with the link)</b>.</span>
              </p>

              <p className="flex items-start gap-1.5">
                <span className="font-bold text-amber-400">3. Dán Link Vào Ô Cấu Hình:</span>
                <span>Sao chép toàn bộ đường dẫn URL trên thanh địa chỉ trình duyệt và dán vào ô nhập ở trên $\rightarrow$ Nhấn <b>"Lưu Cấu Hình Link Drive"</b>.</span>
              </p>

              <p className="flex items-start gap-1.5">
                <span className="font-bold text-amber-400">4. Cơ Chế Tự Động Lưu 10 Phút:</span>
                <span>Khi nút <b>"LƯU VÀ ĐẨY ĐỐI CHIẾU LÊN DRIVE"</b> được nhấp hoặc mỗi 10 phút trôi qua, phần mềm tự động xuất file sao lưu Excel chuẩn 5 Sheet kèm dấu mốc thời gian, đẩy lên Cloud Server và lưu trữ vĩnh viễn vào Google Drive của bạn.</span>
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
