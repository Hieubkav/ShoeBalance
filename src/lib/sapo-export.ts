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

    // Tạo dữ liệu theo đúng cấu trúc template SAPO
    const wsData: any[][] = [];

    // Dòng 0: Thông tin đơn nhập - Mã đơn nhập ở cột A, Thẻ tags ở cột D
    const row0 = new Array(17).fill('');
    row0[0] = 'Mã đơn nhập';
    row0[3] = 'Thẻ tags';
    wsData.push(row0);
    
    // Dòng 1: Mã chính sách giá ở cột A, Ghi chú ở cột D
    const row1 = new Array(17).fill('');
    row1[0] = 'Mã chính sách giá';
    row1[3] = 'Ghi chú';
    wsData.push(row1);
    
    // Dòng 2: Tham chiếu đơn nhập ở cột D
    const row2 = new Array(17).fill('');
    row2[3] = 'Tham chiếu đơn nhập';
    wsData.push(row2);
    
    // Dòng 3: Dòng trống
    wsData.push(new Array(17).fill(''));

    // Dòng 4: Header nhóm chính
    const row4 = new Array(17).fill('');
    row4[0] = 'Thông tin sản phẩm'; // Merge A-M
    row4[13] = 'Chi phí tổng đơn'; // Merge N-O
    row4[15] = 'Chiết khấu tổng đơn'; // Merge P-Q
    wsData.push(row4);

    // Dòng 5: Header chi tiết - ĐÚNG THEO TEMPLATE
    const row5 = new Array(17).fill('');
    row5[0] = 'Mã SKU';           // A
    row5[1] = 'Mã Barcode';       // B
    row5[2] = 'Tên sản phẩm ';    // C (có space cuối)
    row5[3] = 'Số lượng';         // D
    row5[4] = 'Nhập lô';          // E (merge E-G)
    row5[7] = 'Serial/Imei';      // H
    row5[8] = 'Đơn giá';          // I
    row5[9] = 'Chiết khấu sản phẩm'; // J (merge J-K)
    row5[11] = 'Thuế (%)';        // L
    row5[12] = 'Ghi chú sản phẩm'; // M
    row5[13] = 'Tên chi phí';     // N
    row5[14] = 'Giá trị chi phí'; // O
    row5[15] = '%';               // P
    row5[16] = 'VND';             // Q
    wsData.push(row5);

    // Dòng 6: Header con - ĐÚNG THEO TEMPLATE
    const row6 = new Array(17).fill('');
    row6[4] = 'Mã lô';            // E
    row6[5] = 'Ngày sản xuất';    // F
    row6[6] = 'Ngày hết hạn';     // G
    row6[9] = '%';                // J
    row6[10] = 'VND';             // K
    wsData.push(row6);

    // Điền thông tin đơn nhập - điền vào cột ngay sau label
    if (data.donNhap.maDonNhap) {
      wsData[0][1] = data.donNhap.maDonNhap; // B - giá trị cho "Mã đơn nhập"
    }
    if (data.donNhap.theTags) {
      wsData[0][4] = data.donNhap.theTags;    // E - giá trị cho "Thẻ tags"
    }
    if (data.donNhap.maChinhSachGia) {
      wsData[1][1] = data.donNhap.maChinhSachGia; // B - giá trị cho "Mã chính sách giá"
    }
    if (data.donNhap.ghiChu) {
      wsData[1][4] = data.donNhap.ghiChu;          // E - giá trị cho "Ghi chú"
    }
    if (data.donNhap.thamChieuDonNhap) {
      wsData[2][4] = data.donNhap.thamChieuDonNhap; // E - giá trị cho "Tham chiếu đơn nhập"
    }

    // Điền dữ liệu sản phẩm - chính xác theo vị trí cột template
    data.sanPhams.forEach((calc) => {
      const productRow = new Array(17).fill('');
      productRow[0] = calc.sku; // A - Mã SKU
      productRow[1] = calc.productCode; // B - Mã Barcode  
      productRow[2] = calc.productCode; // C - Tên sản phẩm
      productRow[3] = calc.needImport; // D - Số lượng
      // E-G - Nhập lô (để trống)
      productRow[7] = ''; // H - Serial/Imei
      productRow[8] = calc.importPrice; // I - Đơn giá
      // J-K - Chiết khấu sản phẩm (để trống - J là label, K là %, L là VND)
      // M - Thuế (%) (để trống)  
      // N - Ghi chú sản phẩm (để trống)
      // O - Tên chi phí (để trống)
      // P - Giá trị chi phí (để trống)
      // Q - % chiết khấu (để trống)
      // R - VND chiết khấu (để trống) 
      
      wsData.push(productRow);
    });

    // Tạo worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Thiết lập merge cells CHÍNH XÁC theo template đã phân tích
    const merges = [
      // Dòng 4: Header nhóm chính
      { s: { r: 4, c: 0 }, e: { r: 4, c: 12 } },   // "Thông tin sản phẩm" A-M
      { s: { r: 4, c: 13 }, e: { r: 4, c: 14 } },  // "Chi phí tổng đơn" N-O
      { s: { r: 4, c: 15 }, e: { r: 4, c: 16 } },  // "Chiết khấu tổng đơn" P-Q
      
      // Dòng 5-6: Các header con - EXACT MERGES from template
      { s: { r: 5, c: 0 }, e: { r: 6, c: 0 } },   // "Mã SKU" A
      { s: { r: 5, c: 1 }, e: { r: 6, c: 1 } },   // "Mã Barcode" B
      { s: { r: 5, c: 2 }, e: { r: 6, c: 2 } },   // "Tên sản phẩm" C
      { s: { r: 5, c: 3 }, e: { r: 6, c: 3 } },   // "Số lượng" D
      { s: { r: 5, c: 4 }, e: { r: 5, c: 6 } },   // "Nhập lô" E-G
      { s: { r: 5, c: 7 }, e: { r: 6, c: 7 } },   // "Serial/Imei" H
      { s: { r: 5, c: 8 }, e: { r: 6, c: 8 } },   // "Đơn giá" I
      { s: { r: 5, c: 9 }, e: { r: 5, c: 10 } },  // "Chiết khấu sản phẩm" J-K
      { s: { r: 5, c: 11 }, e: { r: 6, c: 11 } }, // "Thuế (%)" L
      { s: { r: 5, c: 12 }, e: { r: 6, c: 12 } }, // "Ghi chú sản phẩm" M
      { s: { r: 5, c: 13 }, e: { r: 6, c: 13 } }, // "Tên chi phí" N
      { s: { r: 5, c: 14 }, e: { r: 6, c: 14 } }, // "Giá trị chi phí" O
      { s: { r: 5, c: 15 }, e: { r: 6, c: 15 } }, // "%" P
      { s: { r: 5, c: 16 }, e: { r: 6, c: 16 } }  // "VND" Q
    ];
    ws['!merges'] = merges;

    // Thiết lập độ rộng cột theo template
    ws['!cols'] = [
      { wch: 15 }, // A - Mã SKU
      { wch: 15 }, // B - Mã Barcode
      { wch: 30 }, // C - Tên sản phẩm
      { wch: 10 }, // D - Số lượng
      { wch: 12 }, // E - Nhập lô
      { wch: 12 }, // F - Mã lô
      { wch: 15 }, // G - Ngày sản xuất/Ngày hết hạn
      { wch: 15 }, // G - Serial/Imei
      { wch: 12 }, // H - Đơn giá
      { wch: 10 }, // I - Chiết khấu %
      { wch: 12 }, // J - Chiết khấu VND
      { wch: 8 },  // K - Thuế %
      { wch: 20 }, // L - Ghi chú sản phẩm
      { wch: 15 }, // M - Tên chi phí
      { wch: 10 }, // N - Giá trị chi phí
      { wch: 8 }   // O - %
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
