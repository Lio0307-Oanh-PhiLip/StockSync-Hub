import React, { useState } from 'react';
import { X, PackagePlus } from 'lucide-react';
import { InventoryItem, ServiceType } from '../types';

interface ManualItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ServiceType;
  scCode: string;
  onAddItem: (item: InventoryItem) => void;
}

export const ManualItemModal: React.FC<ManualItemModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  scCode,
  onAddItem
}) => {
  const [cotSP, setCotSP] = useState('');
  const [scCodeInput, setScCodeInput] = useState(scCode || 'VN001021');
  const [warehouseName, setWarehouseName] = useState('OPPO Experience & Service Store Phú Lâm');
  const [soRO, setSoRO] = useState('');
  const [bhDv, setBhDv] = useState<ServiceType>(activeTab);
  const [maLK, setMaLK] = useState('');
  const [productName, setProductName] = useState('');
  const [model, setModel] = useState('Reno11F 5G');
  const [type, setType] = useState('MAIN');
  const [slg, setSlg] = useState(1);
  const [remark, setRemark] = useState('');
  const [markAsScanned, setMarkAsScanned] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cotSP.trim() && !maLK.trim()) return;

    const finalCotSP = cotSP.trim() || `${scCodeInput}-AS${Date.now().toString().slice(-8)}${maLK.trim() || '62102900'}`;
    const finalRO = soRO.trim() || `${scCodeInput}-AS${Date.now().toString().slice(-10)}`;

    const newItem: InventoryItem = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      trangThai: markAsScanned ? (slg === 1 ? 'Khớp, Trả Xác' : 'Đang quét') : 'Chưa Scan',
      cotSP: finalCotSP,
      scCode: scCodeInput.trim() || 'VN001021',
      warehouseName: warehouseName.trim() || 'Trung tâm CSKH OPPO Phú Lâm',
      soRO: finalRO,
      bhDv,
      maLK: maLK.trim() || '621023001283',
      productName: productName.trim() || 'Linh kiện xác phát sinh',
      model: model.trim() || 'Chung',
      type: type.toUpperCase() || 'KHÁC',
      slg: Math.max(1, slg),
      daQuet: markAsScanned ? 1 : 0,
      remark: remark.trim() || 'Thêm trực tiếp tại kho',
      lastScannedAt: markAsScanned ? new Date().toLocaleTimeString('vi-VN') : undefined
    };

    onAddItem(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <PackagePlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">Thêm Dòng Linh Kiện Mới</h3>
              <p className="text-[11px] text-slate-500">Chuẩn 12 cột thông tin theo danh mục quản lý kho</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {/* Phân hệ BH/DV */}
          <div className="flex items-center gap-4 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-600">BH/DV:</span>
            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-blue-700">
              <input
                type="radio"
                name="bhdv"
                value="IW"
                checked={bhDv === 'IW'}
                onChange={() => setBhDv('IW')}
                className="text-blue-600"
              />
              IW (Bảo Hành)
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-indigo-700">
              <input
                type="radio"
                name="bhdv"
                value="OOW"
                checked={bhDv === 'OOW'}
                onChange={() => setBhDv('OOW')}
                className="text-indigo-600"
              />
              OOW (Dịch Vụ Ngoài BH)
            </label>
          </div>

          {/* Cột SP & Mã LK */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Cột SP (Serial / Composite Barcode) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={cotSP}
                onChange={(e) => setCotSP(e.target.value)}
                placeholder="VD: VN001021-AS2608110029621023001283"
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Mã LK (Part Number) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={maLK}
                onChange={(e) => setMaLK(e.target.value)}
                placeholder="VD: 621023001283"
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* SC Code & Warehouse Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">SC Code</label>
              <input
                type="text"
                value={scCodeInput}
                onChange={(e) => setScCodeInput(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Warehouse Name</label>
              <input
                type="text"
                value={warehouseName}
                onChange={(e) => setWarehouseName(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Product Name & Số RO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Product Name</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="VD: Bo mạch chính 8G 256G Reno11F 5G"
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Số RO</label>
              <input
                type="text"
                value={soRO}
                onChange={(e) => setSoRO(e.target.value)}
                placeholder="VD: VN001021-AS2608110029"
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Model & Type & Slg */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Model</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="VD: Reno11F 5G"
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="MAIN">MAIN</option>
                <option value="LCD">LCD</option>
                <option value="PIN">PIN</option>
                <option value="PHIM">PHIM</option>
                <option value="VỎ">VỎ</option>
                <option value="VAN TAY">VAN TAY</option>
                <option value="CAMERA">CAMERA</option>
                <option value="SUB">SUB</option>
                <option value="KHÁC">KHÁC</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Slg (Số lượng)</label>
              <input
                type="number"
                min="1"
                value={slg}
                onChange={(e) => setSlg(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Remark */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">Remark (Ghi chú)</label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Ghi chú xác linh kiện..."
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 select-none">
              <input
                type="checkbox"
                checked={markAsScanned}
                onChange={(e) => setMarkAsScanned(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>Tự động tính 1 lần quét khớp sau khi thêm</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition shadow-xs"
            >
              Thêm Vào Danh Mục
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
