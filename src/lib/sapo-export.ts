import * as XLSX from 'xlsx';

interface ImportCalculation {
  sku: string
  productCode: string
  size: string
  currentStock: number
  incomingStock: number
  minStock: number
  exportQuantity: number
  sellRate: number
  needImport: number
  image: string
  importPrice: number
  explanation: string
}

interface SapoExportData {
  donNhap: {
    maDonNhap?: string;
    theTags?: string;
    maChinhSachGia?: string;
    ghiChu?: string;
    thamChieuDonNhap?: string;
  };
  sanPhams: ImportCalculation[];
}

export const exportToSapo = async (
  data: SapoExportData
): Promise<void> => {
  try {
    // Tạo workbook mới với cấu trúc đúng chuẩn SAPO
    const wb = XLSX.utils.book_new();

    // Tạo dữ liệu cho theo cấu trúc SAPO
    const wsData: any[][] = [];

    // Dòng 0: Thông tin đơn nhập cấp 1
    wsData.push(['Mã đơn nhập', '', 'Thẻ tags', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    
    // Dòng 1: Thông tin đơn nhập cấp 2
    wsData.push(['Mã chính sách giá', '', 'Ghi chú', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    
    // Dòng 2: Thông tin đơn nhập cấp 3
    wsData.push(['Tham chiếu đơn nhập', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    
    // Dòng 3: Dòng trống
    wsData.push([]);

    // Dòng 4: Header nhóm chính (dưới cùng)
    const row4 = new Array(21).fill('');
    row4[0] = 'Thông tin sản phẩm'; // Merge A-M
    row4[13] = 'Chi phí tổng đơn'; // Merge N-O
    row4[15] = 'Chiết khấu tổng đơn'; // Merge P-Q
    wsData.push(row4);

    // Dòng 5: Header chi tiết
    const row5 = [
      'Mã SKU',           // A
      'Mã Barcode',       // B
      'Tên sản phẩm',     // C
      'Số lượng',         // D
      'Nhập lô',          // E ( nhóm cha)
      '',                 // F
      '',                 // G
      '',                 // H
      'Serial/Imei',      // I
      'Đơn giá',          // J
      'Chiết khấu sản phẩm', // K (nhóm cha)
      '',                 // L
      '',                 // M
      'Thuế (%)',         // N
      'Ghi chú sản phẩm', // O
      'Tên chi phí',      // P
      '',                 // Q
      'Chiết khấu tổng đơn', // R (nhóm cha)
      '',                 // S
      ''                  // T
    ];
    wsData.push(row5);

    // Dòng 6: Header con (trong groups)
    const row6 = [
      '',                 // A
      '',                 // B
      '',                 // C
      '',                 // D
      '',                 // E
      'Mã lô',           // F
      'Ngày sản xuất',   // G
      'Ngày hết hạn',    // H
      '',                 // I
      '',                 // J
      '',                 // K
      '%',               // L
      'VND',             // M
      '',                 // N
      '',                 // O
      '',                 // P
      '',                 // Q
      '%',               // R
      'VND',             // S
      ''                  // T
    ];
    wsData.push(row6);

    // Điền thông tin đơn nhập
    if (wsData[0]) wsData[0][0] = data.donNhap.maDonNhap || '';
    if (wsData[0]) wsData[0][2] = data.donNhap.theTags || '';
    if (wsData[1]) wsData[1][0] = data.donNhap.maChinhSachGia || '';
    if (wsData[1]) wsData[1][2] = data.donNhap.ghiChu || '';
    if (wsData[2]) wsData[2][0] = data.donNhap.thamChieuDonNhap || '';

    // Điền dữ liệu sản phẩm
    data.sanPhams.forEach((calc) => {
      const productRow = new Array(21).fill('');
      productRow[0] = calc.sku; // A - Mã SKU
      productRow[1] = calc.productCode; // B - Mã Barcode
      productRow[2] = calc.productCode; // C - Tên sản phẩm
      productRow[3] = calc.needImport; // D - Số lượng
      // E-H - Nhập lô (để trống)
      productRow[8] = ''; // I - Serial/Imei
      productRow[9] = calc.importPrice; // J - Đơn giá
      // K-M - Chiết khấu sản phẩm (để trống)
      productRow[13] = ''; // N - Thuế (%)
      productRow[14] = ''; // O - Ghi chú sản phẩm
      // P-Q - Chi phí tổng đơn (để trống)
      // R-S - Chiết khấu tổng đơn (để trống)
      
      wsData.push(productRow);
    });

    // Tạo worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Thiết lập merge cells cho header
    const merges = [
      // Merge "Thông tin sản phẩm" từ A5:M5 (dòng 4)
      { s: { r: 4, c: 0 }, e: { r: 4, c: 12 } },
      // Merge "Chi phí tổng đơn" từ N5:O5 (dòng 4)
      { s: { r: 4, c: 13 }, e: { r: 4, c: 14 } },
      // Merge "Chiết khấu tổng đơn" từ P5:Q5 (dòng 4)
      { s: { r: 4, c: 15 }, e: { r: 4, c: 16 } },
      // Merge "Nhập lô" từ E6:H6 (dòng 5)
      { s: { r: 5, c: 4 }, e: { r: 5, c: 7 } },
      // Merge "Chiết khấu sản phẩm" từ K6:M6 (dòng 5)
      { s: { r: 5, c: 10 }, e: { r: 5, c: 12 } },
      // Merge "Chi phí tổng đơn" từ P6:Q6 (dòng 5)
      { s: { r: 5, c: 15 }, e: { r: 5, c: 16 } }
    ];
    ws['!merges'] = merges;

    // Thiết lập độ rộng cột
    ws['!cols'] = [
      { wch: 15 }, // A - Mã SKU
      { wch: 15 }, // B - Mã Barcode
      { wch: 30 }, // C - Tên sản phẩm
      { wch: 10 }, // D - Số lượng
      { wch: 10 }, // E - Nhập lô
      { wch: 12 }, // F - Mã lô
      { wch: 15 }, // G - Ngày sản xuất
      { wch: 15 }, // H - Ngày hết hạn
      { wch: 15 }, // I - Serial/Imei
      { wch: 12 }, // J - Đơn giá
      { wch: 15 }, // K - Chiết khấu sản phẩm
      { wch: 8 },  // L - % chiết khấu
      { wch: 10 }, // M - VND chiết khấu
      { wch: 8 },  // N - Thuế
      { wch: 20 }, // O - Ghi chú sản phẩm
      { wch: 15 }, // P - Tên chi phí
      { wch: 10 }, // Q - Giá trị chi phí
      { wch: 8 },  // R - % chi phí
      { wch: 10 }, // S - VND chi phí
      { wch: 8 }   // T - trống
    ];

    // Thêm worksheet vào workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    // Xuất file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // Tải file về
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nhap_hang_sapo_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Lỗi khi xuất file SAPO:', error);
    throw new Error('Không thể xuất file SAPO. Vui lòng thử lại.');
  }
};
