import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw, Zap, ZapOff, Image as ImageIcon, CheckCircle2, AlertCircle, Layers } from 'lucide-react';
import { ServiceType } from '../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string, source: 'camera') => void;
  activeTab: ServiceType;
  onTabChange: (tab: ServiceType) => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  activeTab,
  onTabChange
}) => {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [flashOn, setFlashOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [continuousMode, setContinuousMode] = useState<boolean>(true);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scannedFeedback, setScannedFeedback] = useState<{ text: string; time: string } | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'interactive-barcode-scanner-box';
  const isProcessingRef = useRef<boolean>(false);

  // Initialize camera list when opened
  useEffect(() => {
    if (!isOpen) {
      stopScanning();
      return;
    }

    let isMounted = true;
    setScannerError(null);

    Html5Qrcode.getCameras()
      .then(devices => {
        if (!isMounted) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera if available
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('sau') ||
            d.label.toLowerCase().includes('environment')
          );
          const chosenId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(chosenId);
          startScanning(chosenId);
        } else {
          setScannerError("Không tìm thấy camera trên thiết bị này. Bạn có thể sử dụng chế độ quét từ file ảnh.");
        }
      })
      .catch(err => {
        if (!isMounted) return;
        setScannerError("Lỗi truy cập camera: " + (err.message || "Hãy cấp quyền camera trong trình duyệt"));
      });

    return () => {
      isMounted = false;
      stopScanning();
    };
  }, [isOpen]);

  const startScanning = async (cameraId: string) => {
    try {
      setScannerError(null);
      if (html5QrCodeRef.current) {
        await stopScanning();
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.ITF
        ],
        verbose: false
      });

      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minDim = Math.min(viewfinderWidth, viewfinderHeight);
          return {
            width: Math.floor(minDim * 0.85),
            height: Math.floor(minDim * 0.65)
          };
        },
        aspectRatio: 1.333
      };

      await html5QrCode.start(
        cameraId,
        config,
        (decodedText) => {
          handleDecoded(decodedText);
        },
        () => {
          // ignore frame errors while seeking barcode
        }
      );

      setIsScanning(true);

      // Check for torch capability
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && (capabilities as any).torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      } catch {
        setHasTorch(false);
      }
    } catch (err: any) {
      setScannerError("Không thể kích hoạt luồng camera: " + (err.message || String(err)));
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch {
        // Ignore error during cleanup
      } finally {
        html5QrCodeRef.current = null;
        setIsScanning(false);
      }
    }
  };

  const handleDecoded = (text: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    setLastScannedCode(text);
    setScannedFeedback({
      text,
      time: new Date().toLocaleTimeString('vi-VN')
    });

    onScanSuccess(text, 'camera');

    if (!continuousMode) {
      stopScanning();
      setTimeout(() => {
        onClose();
      }, 400);
    } else {
      // Cooldown for continuous mode to prevent burst scans
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1400);
    }
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      const nextFlash = !flashOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextFlash }] as any
      });
      setFlashOn(nextFlash);
    } catch {
      // Torch toggle failed
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    startScanning(newId);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setScannerError(null);
      const html5QrCode = new Html5Qrcode('temp-image-scanner');
      const result = await html5QrCode.scanFile(file, true);
      handleDecoded(result);
      html5QrCode.clear();
    } catch (err: any) {
      setScannerError("Không nhận diện được mã vạch trong ảnh này: " + (err.message || ''));
    }
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-200">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-white flex items-center gap-2">
                Quét Mã Vạch / QR Code
              </h2>
              <p className="text-xs text-slate-300">Camera thời gian thực hỗ trợ Code128, QR, EAN, DataMatrix</p>
            </div>
          </div>
          <button
            id="close-camera-scanner-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Controls Ribbon */}
        <div className="bg-slate-100 p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          {/* Target Service Group Tab */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 px-2 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> Nhóm:
            </span>
            <button
              id="switch-tab-iw-scanner"
              type="button"
              onClick={() => onTabChange('IW')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                activeTab === 'IW' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              IW (Bảo Hành)
            </button>
            <button
              id="switch-tab-oow-scanner"
              type="button"
              onClick={() => onTabChange('OOW')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                activeTab === 'OOW' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              OOW (Ngoài BH)
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              id="toggle-continuous-scan"
              type="button"
              onClick={() => setContinuousMode(!continuousMode)}
              className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition ${
                continuousMode
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-slate-300 text-slate-600'
              }`}
            >
              {continuousMode ? '⚡ Quét liên tục' : '🎯 Quét 1 lần'}
            </button>
          </div>
        </div>

        {/* Camera Viewport Area */}
        <div className="relative bg-black flex-1 min-h-[300px] flex items-center justify-center overflow-hidden">
          <div id={scannerContainerId} className="w-full h-full max-h-[360px] overflow-hidden" />
          <div id="temp-image-scanner" className="hidden" />

          {/* Scanner Overlay Guide */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
            <div className="relative w-64 h-44 border-2 border-blue-400/80 rounded-xl bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
              {/* Corner markers */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-blue-500 rounded-tl" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-blue-500 rounded-tr" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-blue-500 rounded-bl" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-blue-500 rounded-br" />
              
              {/* Laser line animation */}
              <div className="absolute inset-x-0 h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse top-1/2 -translate-y-1/2" />
            </div>
            <p className="mt-3 text-white text-xs font-medium bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
              Hướng camera vào tem vạch Serial hoặc Mã Linh Kiện
            </p>
          </div>

          {/* Torch & Image Upload Buttons */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
            {hasTorch && (
              <button
                id="toggle-torch-btn"
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-full shadow-lg transition ${
                  flashOn ? 'bg-amber-400 text-slate-900' : 'bg-slate-800/80 text-white hover:bg-slate-700'
                }`}
              >
                {flashOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}

            <label
              title="Quét từ file ảnh"
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full shadow-lg cursor-pointer transition flex items-center justify-center"
            >
              <ImageIcon className="w-4 h-4" />
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Scanned Feedback Notification Bar */}
        {scannedFeedback && (
          <div className="bg-emerald-50 border-t border-emerald-200 p-3 flex items-center justify-between text-xs text-emerald-800 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div>
                <span className="font-semibold">Vừa nhận diện: </span>
                <span className="font-mono bg-emerald-100 px-2 py-0.5 rounded text-emerald-900 font-bold">
                  {scannedFeedback.text}
                </span>
                <span className="text-slate-500 text-[11px] ml-2">({scannedFeedback.time})</span>
              </div>
            </div>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Nhóm: {activeTab}
            </span>
          </div>
        )}

        {/* Error message */}
        {scannerError && (
          <div className="bg-rose-50 border-t border-rose-200 p-3 flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{scannerError}</span>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="p-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Camera Selector */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-slate-500 font-medium whitespace-nowrap">Camera:</label>
            <select
              value={selectedCameraId}
              onChange={handleCameraChange}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-56 truncate"
            >
              {cameras.map(cam => (
                <option key={cam.id} value={cam.id}>
                  {cam.label || `Camera ${cam.id.slice(0, 5)}...`}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => selectedCameraId && startScanning(selectedCameraId)}
              title="Khởi động lại Camera"
              className="p-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              id="finish-scanning-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900 transition text-xs w-full sm:w-auto"
            >
              Hoàn Tất Quét
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
