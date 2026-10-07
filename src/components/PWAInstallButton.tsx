import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, CheckCircle } from 'lucide-react';
import { DeviceConnectModal } from './DeviceConnectModal';

interface PWAInstallButtonProps {
  variant?: 'nav' | 'banner' | 'primary';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  variant = 'nav',
  className = '' 
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  const handleAction = async () => {
    if (isInstallable) {
      const success = await install();
      if (!success) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  if (isInstalled && variant === 'banner') {
    return null;
  }

  if (variant === 'banner') {
    return (
      <>
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-3.5 py-2 rounded-xl text-xs flex items-center justify-between shadow-sm mb-3.5 border border-blue-500/30 animate-in fade-in">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/20">
              <Smartphone className="w-4 h-4 text-white" />
            </span>
            <div className="truncate">
              <span className="font-bold block sm:inline mr-1.5">Cài đặt App lên Điện thoại:</span>
              <span className="text-blue-100 hidden sm:inline">Quét mã vạch/QR qua camera nhanh, không cần cài APK rườm rà.</span>
            </div>
          </div>
          <button
            onClick={handleAction}
            className="shrink-0 ml-3 px-3 py-1.5 bg-white text-blue-700 font-bold rounded-lg shadow-sm hover:bg-blue-50 transition flex items-center gap-1.5 text-xs active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isInstallable ? 'Cài ngay' : 'Cài đặt App'}</span>
          </button>
        </div>

        <DeviceConnectModal isOpen={showModal} onClose={() => setShowModal(false)} />
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleAction}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition shadow-xs active:scale-95 ${
          isInstalled
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : isInstallable
            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
            : 'bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200'
        } ${className}`}
        title="Mở trên điện thoại hoặc cài đặt ứng dụng"
      >
        {isInstalled ? (
          <>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Đã cài App</span>
          </>
        ) : (
          <>
            <Smartphone className="w-3.5 h-3.5 text-blue-600" />
            <span>Cài đặt App / Mobile</span>
          </>
        )}
      </button>

      <DeviceConnectModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
