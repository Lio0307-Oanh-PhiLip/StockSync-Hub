import fs from 'fs';
import path from 'path';

function generateState() {
  const scCode = 'VN001021';
  const makeRO = (day: number, seq: number) => {
    const dStr = day < 10 ? `0${day}` : `${day}`;
    const sStr = seq < 10 ? `000${seq}` : seq < 100 ? `00${seq}` : `0${seq}`;
    return `${scCode}-AS2608${dStr}${sStr}`;
  };

  const iwTemplates = [
    { maLK: '4905106', name: 'Màn hình A53 (Đen)', model: 'A53', type: 'LCD' },
    { maLK: '621029000174', name: 'Màn hình Reno11F 5G (Xanh)', model: 'Reno11F 5G', type: 'LCD' },
    { maLK: '4907894', name: 'Màn hình Reno6Z 5G (Bạc)', model: 'Reno6Z 5G', type: 'LCD' },
    { maLK: '4908900', name: 'Màn hình A58 4G (Đen)', model: 'A58', type: 'LCD' },
    { maLK: '621023001283', name: 'Bo mạch chính 8G 256G A78', model: 'A78', type: 'MAIN' },
    { maLK: '621023005541', name: 'Bo mạch chính 8G 128G Reno8', model: 'Reno8', type: 'MAIN' },
    { maLK: '4901234', name: 'Pin BLP805 5000mAh A16', model: 'A16', type: 'OTHERS' },
    { maLK: '4905678', name: 'Camera sau chính 50MP A78', model: 'A78', type: 'OTHERS' },
    { maLK: '4909988', name: 'Cáp sạc type-C SuperVOOC', model: 'Chung', type: 'OTHERS' },
    { maLK: '4903322', name: 'Loa ngoài A96 4G', model: 'A96', type: 'OTHERS' },
    { maLK: '4907711', name: 'Khay sim A53 (Đen)', model: 'A53', type: 'OTHERS' },
    { maLK: '4906655', name: 'Nắp lưng kính Reno8T 5G (Vàng)', model: 'Reno8T 5G', type: 'OTHERS' }
  ];

  const iw = iwTemplates.map((t, idx) => {
    const soRO = makeRO(idx + 2, idx + 1);
    return {
      id: `iw-init-${idx + 1}`,
      trangThai: 'Chưa Scan',
      cotSP: `${soRO}${t.maLK}`,
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
    };
  });

  const screenShotROs4905106 = [
    'VN001021-AS2608120037',
    'VN001021-AS2608040004',
    'VN001021-AS2608120035',
    'VN001021-AS2608270018'
  ];

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
  const oow: any[] = [];

  oowLCDTemplates.forEach(tpl => {
    for (let c = 0; c < tpl.count; c++) {
      const soRO = tpl.specificROs && tpl.specificROs[c] 
        ? tpl.specificROs[c] 
        : makeRO(Math.floor(oowIdx / 15) + 1, (oowIdx % 50) + 1);
      const cotSP = `${soRO}${tpl.maLK}`;
      const shouldBeScanned = (tpl.maLK === '4905106') || (scannedCount < 127);
      
      if (shouldBeScanned) {
        scannedCount++;
      }

      oow.push({
        id: `oow-init-${oowIdx}`,
        trangThai: shouldBeScanned ? 'Khớp, Trả Xác' : 'Chưa Scan',
        cotSP,
        scCode,
        warehouseName: 'OPPO Experience & Service Store Phú Lâm',
        soRO,
        bhDv: 'OOW',
        maLK: tpl.maLK,
        productName: tpl.name,
        model: tpl.model,
        type: 'LCD',
        slg: 1,
        daQuet: shouldBeScanned ? 1 : 0,
        remark: shouldBeScanned ? 'Đã thu hồi xác linh kiện' : '',
        lastScannedAt: shouldBeScanned ? '09:42:15' : undefined,
        scanHistory: shouldBeScanned ? [{ timestamp: '09:42:15', barcode: cotSP }] : []
      });
      oowIdx++;
    }
  });

  // MAIN (3 items)
  const mainTemplates = [
    { maLK: '621023001283', name: 'Bo mạch chính Reno8T 5G 8G 128G', model: 'Reno8T 5G' },
    { maLK: '621023004567', name: 'Bo mạch chính Find N3 Flip 12G 256G', model: 'Find N3 Flip' },
    { maLK: '621023009988', name: 'Bo mạch chính A79 5G 8G 256G', model: 'A79 5G' }
  ];
  mainTemplates.forEach(tpl => {
    const soRO = makeRO(Math.floor(oowIdx / 15) + 1, (oowIdx % 50) + 1);
    oow.push({
      id: `oow-init-${oowIdx}`,
      trangThai: 'Chưa Scan',
      cotSP: `${soRO}${tpl.maLK}`,
      scCode,
      warehouseName: 'OPPO Experience & Service Store Phú Lâm',
      soRO,
      bhDv: 'OOW',
      maLK: tpl.maLK,
      productName: tpl.name,
      model: tpl.model,
      type: 'MAIN',
      slg: 1,
      daQuet: 0
    });
    oowIdx++;
  });

  // OTHERS (150 items)
  for (let c = 1; c <= 150; c++) {
    const soRO = makeRO(Math.floor(oowIdx / 15) + 1, (oowIdx % 50) + 1);
    oow.push({
      id: `oow-init-${oowIdx}`,
      trangThai: 'Chưa Scan',
      cotSP: `${soRO}4909${1000 + c}`,
      scCode,
      warehouseName: 'OPPO Experience & Service Store Phú Lâm',
      soRO,
      bhDv: 'OOW',
      maLK: `4909${1000 + c}`,
      productName: `Linh kiện phụ kiện loại ${c}`,
      model: 'Chung',
      type: 'OTHERS',
      slg: 1,
      daQuet: 0
    });
    oowIdx++;
  }

  const now = new Date().toLocaleTimeString('vi-VN');
  return {
    version: 130,
    lastModified: now,
    sourceInfo: {
      name: 'Kho xác chuẩn v1.3.0 (HCM 4 Phú Lâm - 366 linh kiện)',
      sourceType: 'sample_data',
      lastSyncedAt: now,
      rowCount: iw.length + oow.length,
      iwCount: iw.length,
      oowCount: oow.length,
      version: 130
    },
    iw,
    oow
  };
}

const state = generateState();
const jsonStr = JSON.stringify(state);

fs.writeFileSync(path.join(process.cwd(), 'inventory_store.json'), jsonStr, 'utf-8');
const flutterAsset = path.join(process.cwd(), 'mobile-flutter/assets/data/inventory_store.json');
if (fs.existsSync(path.dirname(flutterAsset))) {
  fs.writeFileSync(flutterAsset, jsonStr, 'utf-8');
}
console.log(`Generated canonical store with ${state.iw.length + state.oow.length} items (v${state.version})`);
