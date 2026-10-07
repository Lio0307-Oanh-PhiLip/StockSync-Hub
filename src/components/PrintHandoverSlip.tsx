import React from 'react';
import { Printer, X } from 'lucide-react';
import { InventoryItem, ReportSummary } from '../types';

interface PrintHandoverSlipProps {
  isOpen: boolean;
  onClose: () => void;
  dataIW: InventoryItem[];
  dataOOW: InventoryItem[];
  summary: ReportSummary;
  scCode: string;
}

export const PrintHandoverSlip: React.FC<PrintHandoverSlipProps> = ({
  isOpen,
  onClose,
  dataIW,
  dataOOW,
  summary,
  scCode
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-6 flex flex-col border border-slate-200 overflow-hidden">
        
        {/* Modal Action Bar (Hidden on Print) */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm">Xem Trước & In Biên Bản Bàn Giao Xác Linh Kiện</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              id="trigger-browser-print-btn"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>In Ngay (Print / PDF)</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div id="printable-handover-document" className="p-8 sm:p-12 text-slate-900 bg-white print:p-0 font-sans text-xs">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
            <div>
              <h1 className="text-base font-black tracking-tight uppercase text-slate-900">
                TRUNG TÂM DỊCH VỤ KHÁCH HÀNG & BẢO HÀNH OPPO
              </h1>
              <p className="text-xs text-slate-600 font-medium">Mã Trạm (SC Code): <span className="font-bold text-slate-900">{scCode}</span> - Kho Xác Phú Lâm</p>
              <p className="text-xs text-slate-600">Địa chỉ: Hệ Thống Kho Xác & Trung Tâm Bảo Hành Toàn Quốc</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-500">MẪU SỐ: BB-TLK-2026</p>
              <p className="text-xs text-slate-500">Ngày lập: {currentDate}</p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center my-6">
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">
              BIÊN BẢN BÀN GIAO & ĐỐI CHIẾU XÁC LINH KIỆN TRẢ VỀ KHO
            </h2>
            <p className="text-xs text-slate-500 italic mt-1">
              (Bao gồm danh mục xác linh kiện bảo hành IW và linh kiện ngoài bảo hành OOW)
            </p>
          </div>

          {/* General Information */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 text-xs">
            <div>
              <p><span className="font-bold">Đơn vị bàn giao:</span> Bộ phận Kỹ thuật & Quản lý kho trạm {scCode}</p>
              <p><span className="font-bold">Đơn vị tiếp nhận:</span> Kho Tổng Quản Lý Xác Linh Kiện</p>
            </div>
            <div>
              <p><span className="font-bold">Tổng số lượng bàn giao:</span> {summary.totalScannedQty} / {summary.totalRequiredQty} linh kiện</p>
              <p><span className="font-bold">Tỷ lệ đối chiếu:</span> {summary.completionRate}% ({summary.missingQty === 0 ? 'Đầy đủ 100%' : `Còn thiếu ${summary.missingQty} cái`})</p>
            </div>
          </div>

          {/* 1. IW Table */}
          <div className="mb-6">
            <h3 className="font-bold text-xs uppercase text-blue-900 mb-2 flex items-center justify-between">
              <span>I. DANH MỤC XÁC LINH KIỆN BẢO HÀNH (IW)</span>
              <span>Đã quét: {summary.iwSummary.scannedQty} / {summary.iwSummary.requiredQty} cái</span>
            </h3>
            <table className="w-full border-collapse border border-slate-300 text-[10px]">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="border border-slate-300 p-1 w-7 text-center">STT</th>
                  <th className="border border-slate-300 p-1 text-center">Trạng thái</th>
                  <th className="border border-slate-300 p-1">Cột SP</th>
                  <th className="border border-slate-300 p-1">Số RO</th>
                  <th className="border border-slate-300 p-1">Mã LK</th>
                  <th className="border border-slate-300 p-1">Product Name</th>
                  <th className="border border-slate-300 p-1">Model</th>
                  <th className="border border-slate-300 p-1 text-center">Type</th>
                  <th className="border border-slate-300 p-1 text-center">Slg</th>
                  <th className="border border-slate-300 p-1 text-center">Đã Quét</th>
                  <th className="border border-slate-300 p-1">Remark</th>
                </tr>
              </thead>
              <tbody>
                {dataIW.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="border border-slate-300 p-2 text-center text-slate-400">
                      Không có linh kiện IW trong đợt bàn giao này.
                    </td>
                  </tr>
                ) : (
                  dataIW.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="border border-slate-300 p-1 text-center">{idx + 1}</td>
                      <td className="border border-slate-300 p-1 text-center font-bold">
                        {item.daQuet >= item.slg ? 'Đã Scan' : 'Chưa Đủ'}
                      </td>
                      <td className="border border-slate-300 p-1 font-mono">{item.cotSP}</td>
                      <td className="border border-slate-300 p-1 font-mono">{item.soRO}</td>
                      <td className="border border-slate-300 p-1 font-mono font-bold">{item.maLK}</td>
                      <td className="border border-slate-300 p-1">{item.productName}</td>
                      <td className="border border-slate-300 p-1">{item.model}</td>
                      <td className="border border-slate-300 p-1 text-center">{item.type}</td>
                      <td className="border border-slate-300 p-1 text-center">{item.slg}</td>
                      <td className="border border-slate-300 p-1 text-center font-bold">{item.daQuet}</td>
                      <td className="border border-slate-300 p-1">{item.remark || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 2. OOW Table */}
          <div className="mb-6">
            <h3 className="font-bold text-xs uppercase text-indigo-900 mb-2 flex items-center justify-between">
              <span>II. DANH MỤC XÁC LINH KIỆN NGOÀI BẢO HÀNH (OOW)</span>
              <span>Đã quét: {summary.oowSummary.scannedQty} / {summary.oowSummary.requiredQty} cái</span>
            </h3>
            <table className="w-full border-collapse border border-slate-300 text-[10px]">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="border border-slate-300 p-1 w-7 text-center">STT</th>
                  <th className="border border-slate-300 p-1 text-center">Trạng thái</th>
                  <th className="border border-slate-300 p-1">Cột SP</th>
                  <th className="border border-slate-300 p-1">Số RO</th>
                  <th className="border border-slate-300 p-1">Mã LK</th>
                  <th className="border border-slate-300 p-1">Product Name</th>
                  <th className="border border-slate-300 p-1">Model</th>
                  <th className="border border-slate-300 p-1 text-center">Type</th>
                  <th className="border border-slate-300 p-1 text-center">Slg</th>
                  <th className="border border-slate-300 p-1 text-center">Đã Quét</th>
                  <th className="border border-slate-300 p-1">Remark</th>
                </tr>
              </thead>
              <tbody>
                {dataOOW.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="border border-slate-300 p-2 text-center text-slate-400">
                      Không có linh kiện OOW trong đợt bàn giao này.
                    </td>
                  </tr>
                ) : (
                  dataOOW.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="border border-slate-300 p-1 text-center">{idx + 1}</td>
                      <td className="border border-slate-300 p-1 text-center font-bold">
                        {item.daQuet >= item.slg ? 'Đã Scan' : 'Chưa Đủ'}
                      </td>
                      <td className="border border-slate-300 p-1 font-mono">{item.cotSP}</td>
                      <td className="border border-slate-300 p-1 font-mono">{item.soRO}</td>
                      <td className="border border-slate-300 p-1 font-mono font-bold">{item.maLK}</td>
                      <td className="border border-slate-300 p-1">{item.productName}</td>
                      <td className="border border-slate-300 p-1">{item.model}</td>
                      <td className="border border-slate-300 p-1 text-center">{item.type}</td>
                      <td className="border border-slate-300 p-1 text-center">{item.slg}</td>
                      <td className="border border-slate-300 p-1 text-center font-bold">{item.daQuet}</td>
                      <td className="border border-slate-300 p-1">{item.remark || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-4 text-center mt-10 pt-6 border-t border-slate-300 text-xs">
            <div>
              <p className="font-bold text-slate-800">NGƯỜI BÀN GIAO</p>
              <p className="text-[10px] text-slate-500 italic mb-16">(Ký & ghi rõ họ tên)</p>
              <p className="font-semibold text-slate-700">............................................</p>
            </div>
            <div>
              <p className="font-bold text-slate-800">KỸ THUẬT VIÊN KIỂM TRA</p>
              <p className="text-[10px] text-slate-500 italic mb-16">(Ký & xác nhận tình trạng)</p>
              <p className="font-semibold text-slate-700">............................................</p>
            </div>
            <div>
              <p className="font-bold text-slate-800">KHO TỔNG TIẾP NHẬN</p>
              <p className="text-[10px] text-slate-500 italic mb-16">(Ký & đóng dấu xác nhận)</p>
              <p className="font-semibold text-slate-700">............................................</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
