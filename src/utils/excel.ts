import * as XLSX from 'xlsx';
import { InventoryItem, ReportSummary, ServiceType } from '../types';

export const cleanBarcode = (str: string | number | undefined | null): string => {
  if (str === undefined || str === null) return '';
  return String(str)
    .trim()
    .replace(/[\s_\-\.\:\/]/g, '')
    .toUpperCase();
};

export const STANDARD_HEADERS = [
  'Trạng thái',
  'Cột SP',
  'SC Code',
  'Warehouse Name',
  'Số RO',
  'BH/DV',
  'Mã LK',
  'Product Name',
  'Model',
  'Type',
  'Slg',
  'Remark'
];

/**
 * Generates realistic warehouse dataset of 366 items matching the exact statistics from sc-warehouse.vercel.app:
 * Total: 366 rows
 * - IW: 12 items (LCD: 5, MAIN: 4, OTHERS: 3) -> 0/12 scanned (0%)
 * - OOW: 351 items (LCD: 198 [127 scanned, 71 pending], MAIN: 3 [0 scanned], OTHERS: 150 [0 scanned]) -> 127/351 scanned (36%)
 * - KMH: 3 items (LCD: 1, OTHERS: 2) -> 0/3 scanned
 */
export const generateRealisticWarehouseDataset = (scCode: string = 'VN001021'): { iw: InventoryItem[]; oow: InventoryItem[] } => {
  const iwList: InventoryItem[] = [];
  const oowList: InventoryItem[] = [];

  // Helper to generate realistic RO number
  const makeRO = (day: number, seq: number) => {
    const dStr = day < 10 ? `0${day}` : `${day}`;
    const sStr = seq < 10 ? `000${seq}` : seq < 100 ? `00${seq}` : seq < 1000 ? `0${seq}` : `${seq}`;
    return `${scCode}-AS2608${dStr}${sStr}`;
  };

  // 1. IW Items (12 items: 5 LCD, 4 MAIN, 3 OTHERS)
  const iwTemplates = [
    { type: 'LCD', maLK: '621029000441', name: 'Màn hình A3', model: 'A3' },
    { type: 'LCD', maLK: '4907272', name: 'Màn hình A15 / A15s', model: 'A15' },
    { type: 'LCD', maLK: '621029000059', name: 'Màn hình A78', model: 'A78' },
    { type: 'LCD', maLK: '4907894', name: 'Màn hình Reno6Z 5G', model: 'Reno6Z 5G' },
    { type: 'LCD', maLK: '621029000174', name: 'Màn hình Reno11F 5G (Xanh đen)', model: 'Reno11F 5G' },
    
    { type: 'MAIN', maLK: '621023003758', name: 'Bo mạch chính 8G 256G A5 Pro', model: 'A5 Pro' },
    { type: 'MAIN', maLK: '621023001283', name: 'Bo mạch chính 8G 256G Reno11F 5G', model: 'Reno11F 5G' },
    { type: 'MAIN', maLK: '621023004412', name: 'Bo mạch chính 4G 128G A18', model: 'A18' },
    { type: 'MAIN', maLK: '621023005591', name: 'Bo mạch chính 12G 512G Reno12 Pro', model: 'Reno12 Pro' },
    
    { type: 'OTHERS', maLK: '4905609', name: 'Pin A15s/ A15 BLP817', model: 'A15' },
    { type: 'OTHERS', maLK: '4180001', name: 'Pin Reno7 4G/Reno8 4G/Reno7Z 5G BLP907', model: 'Reno8Z 5G' },
    { type: 'OTHERS', maLK: '9181074', name: 'Cảm biến vân tay Reno7Z 5G', model: 'Reno7Z 5G' }
  ];

  iwTemplates.forEach((t, i) => {
    const soRO = makeRO(10 + (i % 15), 10 + i);
    const cotSP = `${soRO}${t.maLK}`;
    iwList.push({
      id: `iw-${i + 1}`,
      trangThai: 'Chưa Scan',
      cotSP,
      scCode,
      warehouseName: 'OPPO Experience & Service Store Phú Lâm',
      soRO,
      bhDv: 'IW',
      maLK: t.maLK,
      productName: t.name,
      model: t.model,
      type: t.type,
      slg: 1,
      daQuet: 0,
      remark: 'Bảo hành chính hãng'
    });
  });

  // 2. OOW Items (351 items: 198 LCD [127 scanned], 3 MAIN [0 scanned], 150 OTHERS [0 scanned])
  
  // Specific highlight parts matching screenshot:
  // Part 4905106: "Màn hình A53" (4 phiếu OOW, all 4 scanned in screenshot!)
  const screenShotROs4905106 = [
    'VN001021-AS2608120037',
    'VN001021-AS2608040004',
    'VN001021-AS2608120035',
    'VN001021-AS2608270018'
  ];

  // First row in screenshot: Part 4907894 (Màn hình Reno6Z 5G) - RO: VN001021-AS2608290004
  const oowLCDTemplates = [
    { maLK: '4907894', name: 'Màn hình Reno6Z 5G', model: 'Reno6Z 5G', count: 12 },
    { maLK: '4905106', name: 'Màn hình A53', model: 'A53', count: 4, specificROs: screenShotROs4905106 },
    { maLK: '621029000059', name: 'Màn hình A78', model: 'A78', count: 18 },
    { maLK: '621029000174', name: 'Màn hình Reno11F 5G (Xanh đen)', model: 'Reno11F 5G', count: 24 },
    { maLK: '4909013', name: 'Màn hình A95 (Đen)', model: 'A95', count: 20 },
    { maLK: '4907272', name: 'Màn hình A15 / A15s', model: 'A15', count: 26 },
    { maLK: '621029000580', name: 'Màn hình Reno3', model: 'Reno3', count: 16 },
    { maLK: '621029000482', name: 'Màn hình gập Find N5 (Đen)', model: 'Find N5', count: 8 },
    { maLK: '621029000486', name: 'Màn hình ngoài Find N5', model: 'Find N5', count: 10 },
    { maLK: '621029000441', name: 'Màn hình A3', model: 'A3', count: 22 },
    { maLK: '4908120', name: 'Màn hình Reno8 5G', model: 'Reno8 5G', count: 20 },
    { maLK: '4908900', name: 'Màn hình A58 4G', model: 'A58', count: 18 }
  ];

  let oowIdx = 1;
  let scannedCount = 0;

  // Generate 198 OOW LCD rows
  oowLCDTemplates.forEach(tpl => {
    for (let c = 0; c < tpl.count; c++) {
      const soRO = tpl.specificROs && tpl.specificROs[c] 
        ? tpl.specificROs[c] 
        : makeRO(Math.floor(oowIdx / 15) + 1, (oowIdx % 50) + 1);
      const cotSP = `${soRO}${tpl.maLK}`;
      
      // We need exactly 127 scanned out of 198 LCD
      const isScanned = scannedCount < 127;
      if (isScanned) scannedCount++;

      oowList.push({
        id: `oow-lcd-${oowIdx++}`,
        trangThai: isScanned ? 'Khớp, Trả Xác' : 'Chưa Scan',
        cotSP,
        scCode,
        warehouseName: 'Trung tâm CSKH OPPO Phú Lâm',
        soRO,
        bhDv: 'OOW',
        maLK: tpl.maLK,
        productName: tpl.name,
        model: tpl.model,
        type: 'LCD',
        slg: 1,
        daQuet: isScanned ? 1 : 0,
        remark: ''
      });
    }
  });

  // Generate 3 OOW MAIN rows (0 scanned)
  const oowMainTemplates = [
    { maLK: '621023001283', name: 'Bo mạch chính 8G 256G Reno11F 5G', model: 'Reno11F 5G' },
    { maLK: '621023003758', name: 'Bo mạch chính 8G 256G A5 Pro', model: 'A5 Pro' },
    { maLK: '621023004412', name: 'Bo mạch chính 4G 128G A18', model: 'A18' }
  ];
  oowMainTemplates.forEach(tpl => {
    const soRO = makeRO(15, oowIdx);
    const cotSP = `${soRO}${tpl.maLK}`;
    oowList.push({
      id: `oow-main-${oowIdx++}`,
      trangThai: 'Chưa Scan',
      cotSP,
      scCode,
      warehouseName: 'Trung tâm CSKH OPPO Phú Lâm',
      soRO,
      bhDv: 'OOW',
      maLK: tpl.maLK,
      productName: tpl.name,
      model: tpl.model,
      type: 'MAIN',
      slg: 1,
      daQuet: 0,
      remark: ''
    });
  });

  // Generate 150 OOW OTHERS rows (0 scanned: PIN, PHIM, VỎ, VAN TAY...)
  const otherTypes = [
    { type: 'OTHERS', maLK: '4906422', name: 'Pin Reno6Z 5G BLP839', model: 'Reno6Z 5G' },
    { type: 'OTHERS', maLK: '4905609', name: 'Pin A15s/ A15 BLP817', model: 'A15' },
    { type: 'OTHERS', maLK: '4909011', name: 'Pin A95 BLP851', model: 'A95' },
    { type: 'OTHERS', maLK: '4180001', name: 'Pin Reno7 4G/Reno8 4G/Reno7Z 5G BLP907', model: 'Reno8Z 5G' },
    { type: 'OTHERS', maLK: '2932642', name: 'Phím nguồn ngoài Reno6Z 5G (Xanh)', model: 'Reno6Z 5G' },
    { type: 'OTHERS', maLK: '4130423', name: 'Khung giữa Reno8T (Đen)', model: 'Reno8T' },
    { type: 'OTHERS', maLK: '621035000231', name: 'Pin bên phải Find N5 BLP883', model: 'Find N5' },
    { type: 'OTHERS', maLK: '621035000229', name: 'Pin bên trái Find N5 BLPB17', model: 'Find N5' },
    { type: 'OTHERS', maLK: '9181074', name: 'Cảm biến vân tay Reno7Z 5G', model: 'Reno11 5G' },
    { type: 'OTHERS', maLK: '4711120', name: 'Phím nguồn ngoài Reno8 5G (Vàng)', model: 'Reno8 5G' },
    { type: 'OTHERS', maLK: '2934064', name: 'Phím âm lượng ngoài Reno8 5G (Vàng)', model: 'Reno8 5G' }
  ];

  for (let i = 0; i < 150; i++) {
    const tpl = otherTypes[i % otherTypes.length];
    const soRO = makeRO(Math.floor(i / 10) + 1, (i % 40) + 100);
    const cotSP = `${soRO}${tpl.maLK}`;
    oowList.push({
      id: `oow-oth-${oowIdx++}`,
      trangThai: 'Chưa Scan',
      cotSP,
      scCode,
      warehouseName: 'Trung tâm CSKH OPPO Phú Lâm',
      soRO,
      bhDv: 'OOW',
      maLK: tpl.maLK,
      productName: tpl.name,
      model: tpl.model,
      type: 'OTHERS',
      slg: 1,
      daQuet: 0,
      remark: ''
    });
  }

  return { iw: iwList, oow: oowList };
};

export const generateSampleData = generateRealisticWarehouseDataset;

/**
 * Parses XLSX, XLS or CSV files with exact column header mapping
 */
export const parseImportFile = async (file: File): Promise<{ iw: InventoryItem[]; oow: InventoryItem[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error("Không thể đọc nội dung file!");
        }

        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const newIW: InventoryItem[] = [];
        const newOOW: InventoryItem[] = [];

        const sheetNamesToProcess = workbook.SheetNames.filter(name => 
          !name.toLowerCase().includes('thongke') && !name.toLowerCase().includes('thống kê')
        );

        const targetSheets = sheetNamesToProcess.length > 0 ? sheetNamesToProcess : [workbook.SheetNames[0]];

        targetSheets.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

          if (!rawRows || rawRows.length <= 1) return;

          const headerRow = (rawRows[0] as string[]).map(h => String(h || '').trim().toLowerCase());
          
          const findColIndex = (keywords: string[]): number => {
            return headerRow.findIndex(h => keywords.some(k => h.includes(k)));
          };

          const colTrangThai = findColIndex(['trạng thái', 'trang thai', 'status']);
          const colCotSP = findColIndex(['cột sp', 'cot sp', 'cột scan qr', 'cot scan qr', 'serial', 'barcode']);
          const colScCode = findColIndex(['sc code', 'mã sc', 'sc']);
          const colWarehouse = findColIndex(['warehouse name', 'warehouse', 'kho']);
          const colSoRO = findColIndex(['số ro', 'so ro', 'ro']);
          const colBhDv = findColIndex(['bh/dv', 'bh dv', 'bhdv', 'loại dv', 'dịch vụ', 'iw/oow']);
          const colMaLK = findColIndex(['mã lk', 'ma lk', 'part number', 'part code']);
          const colProductName = findColIndex(['product name', 'tên lk', 'ten lk', 'tên linh kiện']);
          const colModel = findColIndex(['model', 'máy']);
          const colType = findColIndex(['type', 'loại', 'nhóm']);
          const colSlg = findColIndex(['slg', 'số lượng', 'so luong', 'qty']);
          const colRemark = findColIndex(['remark', 'ghi chú', 'ghi chu']);

          for (let i = 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0 || row.every((c: any) => String(c).trim() === '')) {
              continue;
            }

            const trangThaiRaw = colTrangThai !== -1 ? String(row[colTrangThai] || '') : String(row[0] || '');
            const cotSP = String((colCotSP !== -1 ? row[colCotSP] : row[1]) || '').trim();
            const scCode = String((colScCode !== -1 ? row[colScCode] : row[2]) || 'VN001021').trim();
            const warehouseName = String((colWarehouse !== -1 ? row[colWarehouse] : row[3]) || 'Trung tâm CSKH OPPO Phú Lâm').trim();
            const soRO = String((colSoRO !== -1 ? row[colSoRO] : row[4]) || '').trim();
            let bhDvRaw = String((colBhDv !== -1 ? row[colBhDv] : row[5]) || '').trim().toUpperCase();
            
            if (sheetName.toUpperCase() === 'IW') bhDvRaw = 'IW';
            if (sheetName.toUpperCase() === 'OOW') bhDvRaw = 'OOW';

            const maLK = String((colMaLK !== -1 ? row[colMaLK] : row[6]) || '').trim();
            const productName = String((colProductName !== -1 ? row[colProductName] : row[7]) || 'Linh kiện xác').trim();
            const model = String((colModel !== -1 ? row[colModel] : row[8]) || '').trim();
            
            let rawType = String((colType !== -1 ? row[colType] : row[9]) || '').trim().toUpperCase();
            if (!rawType || (!rawType.includes('LCD') && !rawType.includes('MAIN'))) {
              if (productName.toLowerCase().includes('màn hình') || productName.toLowerCase().includes('lcd')) {
                rawType = 'LCD';
              } else if (productName.toLowerCase().includes('bo mạch') || productName.toLowerCase().includes('main')) {
                rawType = 'MAIN';
              } else {
                rawType = 'OTHERS';
              }
            }

            const slgRaw = colSlg !== -1 ? row[colSlg] : row[10];
            const slg = Math.max(1, parseInt(String(slgRaw || '1'), 10) || 1);
            const remark = String((colRemark !== -1 ? row[colRemark] : row[11]) || '').trim();

            if (!cotSP && !maLK && !productName) continue;

            const bhDv: ServiceType = bhDvRaw.includes('IW') ? 'IW' : 'OOW';
            
            let initialStatus: any = 'Chưa Scan';
            let daQuet = 0;
            if (trangThaiRaw.toLowerCase().includes('khớp') || trangThaiRaw.toLowerCase().includes('đủ') || trangThaiRaw.toLowerCase().includes('đã scan')) {
              initialStatus = 'Khớp, Trả Xác';
              daQuet = slg;
            }

            const item: InventoryItem = {
              id: `item-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
              trangThai: initialStatus,
              cotSP: cotSP || `VN001021-AS-${Date.now()}-${i}`,
              scCode: scCode || 'VN001021',
              warehouseName: warehouseName || 'Trung tâm CSKH OPPO Phú Lâm',
              soRO: soRO || `VN001021-AS2608-${i}`,
              bhDv,
              maLK: maLK || 'UNKNOWN',
              productName: productName || 'Linh kiện xác',
              model: model || 'Chung',
              type: rawType,
              slg,
              daQuet,
              remark
            };

            if (bhDv === 'IW') {
              newIW.push(item);
            } else {
              newOOW.push(item);
            }
          }
        });

        resolve({ iw: newIW, oow: newOOW });
      } catch (err: any) {
        reject(new Error("Lỗi khi đọc file Excel/CSV: " + (err.message || String(err))));
      }
    };

    reader.onerror = () => reject(new Error("Không thể tải file, vui lòng thử lại."));
    reader.readAsBinaryString(file);
  });
};

/**
 * Calculates complete automated inventory reporting metrics
 */
export const calculateReportSummary = (dataIW: InventoryItem[], dataOOW: InventoryItem[]): ReportSummary => {
  const allItems = [...dataIW, ...dataOOW];
  const totalItems = allItems.length;

  const totalRequiredQty = allItems.reduce((acc, it) => acc + (it.slg || 1), 0);
  const totalScannedQty = allItems.reduce((acc, it) => acc + (it.daQuet || 0), 0);
  const completedItemsCount = allItems.filter(it => it.daQuet >= it.slg).length;
  const inProgressItemsCount = allItems.filter(it => it.daQuet > 0 && it.daQuet < it.slg).length;
  const unscannedItemsCount = allItems.filter(it => it.daQuet === 0).length;
  const missingQty = Math.max(0, totalRequiredQty - totalScannedQty);
  const completionRate = totalRequiredQty > 0 ? Math.round((totalScannedQty / totalRequiredQty) * 100) : 0;

  const getSubSummary = (list: InventoryItem[]) => {
    const req = list.reduce((acc, it) => acc + (it.slg || 1), 0);
    const scn = list.reduce((acc, it) => acc + (it.daQuet || 0), 0);
    const comp = list.filter(it => it.daQuet >= it.slg).length;
    const mis = Math.max(0, req - scn);
    const rate = req > 0 ? Math.round((scn / req) * 100) : 0;
    return {
      totalItems: list.length,
      requiredQty: req,
      scannedQty: scn,
      completedItems: comp,
      missingQty: mis,
      completionRate: rate
    };
  };

  const byTypeBreakdown: Record<string, { required: number; scanned: number }> = {};
  allItems.forEach(item => {
    let t = (item.type || 'OTHERS').toUpperCase();
    if (t !== 'LCD' && t !== 'MAIN') t = 'OTHERS';
    if (!byTypeBreakdown[t]) {
      byTypeBreakdown[t] = { required: 0, scanned: 0 };
    }
    byTypeBreakdown[t].required += (item.slg || 1);
    byTypeBreakdown[t].scanned += (item.daQuet || 0);
  });

  const byModelBreakdown: Record<string, { required: number; scanned: number }> = {};
  allItems.forEach(item => {
    const m = item.model || 'Chung';
    if (!byModelBreakdown[m]) {
      byModelBreakdown[m] = { required: 0, scanned: 0 };
    }
    byModelBreakdown[m].required += (item.slg || 1);
    byModelBreakdown[m].scanned += (item.daQuet || 0);
  });

  return {
    totalItems,
    totalRequiredQty,
    totalScannedQty,
    completedItemsCount,
    inProgressItemsCount,
    unscannedItemsCount,
    missingQty,
    completionRate,
    iwSummary: getSubSummary(dataIW),
    oowSummary: getSubSummary(dataOOW),
    byTypeBreakdown,
    byModelBreakdown
  };
};

export const buildStandardRows = (items: InventoryItem[]): any[][] => {
  const rows: any[][] = [STANDARD_HEADERS];

  items.forEach(item => {
    const displayStatus = item.daQuet >= item.slg ? 'Đã Scan (Khớp)' : (item.daQuet > 0 ? `Đang quét (${item.daQuet}/${item.slg})` : 'Chưa Scan');
    rows.push([
      displayStatus,
      item.cotSP,
      item.scCode,
      item.warehouseName,
      item.soRO,
      item.bhDv,
      item.maLK,
      item.productName,
      item.model,
      item.type,
      item.slg,
      item.remark || ''
    ]);
  });

  return rows;
};

export const generateExcelArrayBuffer = (
  dataIW: InventoryItem[], 
  dataOOW: InventoryItem[], 
  scCode: string = 'VN001021'
): { fileName: string; arrayBuffer: ArrayBuffer } => {
  const summary = calculateReportSummary(dataIW, dataOOW);
  const now = new Date();
  const dateStr = now.toLocaleDateString('vi-VN');
  const timeStr = now.toLocaleTimeString('vi-VN');

  const workbook = XLSX.utils.book_new();

  // 1. Sheet: ThongKe
  const thongKeData = [
    ['BÁO CÁO THỐNG KÊ TỔN KHO & ĐỐI CHIẾU XÁC LINH KIỆN'],
    ['Mã Trạm (SC Code):', scCode, 'Thời Gian Xuất:', `${dateStr} ${timeStr}`],
    ['Đơn Vị Quản Lý:', 'Trung tâm CSKH OPPO Phú Lâm & Kho Xác Linh Kiện', 'Trạng Thái:', summary.completionRate === 100 ? 'HOÀN THÀNH 100%' : 'ĐANG ĐỐI CHIẾU'],
    [],
    ['CHỈ SỐ TỔNG HỢP', 'TỔNG CỘNG', 'PHÂN HỆ IW (BẢO HÀNH)', 'PHÂN HỆ OOW (NGOÀI BH)'],
    ['Tổng số dòng linh kiện (Rows)', summary.totalItems, summary.iwSummary.totalItems, summary.oowSummary.totalItems],
    ['Tổng số lượng cần kiểm (Slg)', summary.totalRequiredQty, summary.iwSummary.requiredQty, summary.oowSummary.requiredQty],
    ['Tổng số lượng đã quét thực tế', summary.totalScannedQty, summary.iwSummary.scannedQty, summary.oowSummary.scannedQty],
    ['Số lượng còn thiếu cần tìm', summary.missingQty, summary.iwSummary.missingQty, summary.oowSummary.missingQty],
    ['Tỷ lệ hoàn thành đối chiếu (%)', `${summary.completionRate}%`, `${summary.iwSummary.completionRate}%`, `${summary.oowSummary.completionRate}%`],
    [],
    ['THỐNG KÊ THEO CHỦNG LOẠI (TYPE)', 'Số Lượng Yêu Cầu', 'Số Lượng Đã Quét', 'Tỷ Lệ (%)'],
    ...Object.entries(summary.byTypeBreakdown).map(([typeName, stats]) => [
      typeName,
      stats.required,
      stats.scanned,
      stats.required > 0 ? `${Math.round((stats.scanned / stats.required) * 100)}%` : '0%'
    ])
  ];

  const wsThongKe = XLSX.utils.aoa_to_sheet(thongKeData);
  XLSX.utils.book_append_sheet(workbook, wsThongKe, 'ThongKe');

  // 2. Sheet: LichSu_DaScan
  const allItems = [...dataIW, ...dataOOW];
  const scannedItems = allItems.filter(item => item.daQuet > 0);
  const wsDaScan = XLSX.utils.aoa_to_sheet(buildStandardRows(scannedItems));
  XLSX.utils.book_append_sheet(workbook, wsDaScan, 'LichSu_DaScan');

  // 3. Sheet: DanhSach_ChuaScan
  const chuaScanItems = allItems.filter(item => item.daQuet < item.slg);
  const wsChuaScan = XLSX.utils.aoa_to_sheet(buildStandardRows(chuaScanItems));
  XLSX.utils.book_append_sheet(workbook, wsChuaScan, 'DanhSach_ChuaScan');

  // 4. Sheet: IW
  const wsIW = XLSX.utils.aoa_to_sheet(buildStandardRows(dataIW));
  XLSX.utils.book_append_sheet(workbook, wsIW, 'IW');

  // 5. Sheet: OOW
  const wsOOW = XLSX.utils.aoa_to_sheet(buildStandardRows(dataOOW));
  XLSX.utils.book_append_sheet(workbook, wsOOW, 'OOW');

  const fileName = `KiemKe_XacLinhKien_${scCode}_${now.toISOString().slice(0, 10)}.xlsx`;
  const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

  return { fileName, arrayBuffer };
};

export const exportFullExcelReport = (dataIW: InventoryItem[], dataOOW: InventoryItem[], scCode: string = 'VN001021') => {
  const { fileName, arrayBuffer } = generateExcelArrayBuffer(dataIW, dataOOW, scCode);
  const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadTemplate = () => {
  const sampleRows = [
    STANDARD_HEADERS,
    [
      'Chưa Scan',
      'VN001021-AS2608110029621023001283',
      'VN001021',
      'Trung tâm CSKH OPPO Phú Lâm',
      'VN001021-AS2608110029',
      'OOW',
      '621023001283',
      'Bo mạch chính 8G 256G Reno11F 5G',
      'Reno11F 5G',
      'MAIN',
      1,
      ''
    ],
    [
      'Chưa Scan',
      'VN001021-AS2608130012621023003758',
      'VN001021',
      'OPPO Experience & Service Store Phú Lâm',
      'VN001021-AS2608130012',
      'IW',
      '621023003758',
      'Bo mạch chính 8G 256G A5 Pro',
      'A5 Pro',
      'MAIN',
      1,
      ''
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mau_Nhap_Kiem_Ke');
  XLSX.writeFile(wb, 'Mau_Chuan_Nhap_Xac_Linh_Kien.xlsx');
};
