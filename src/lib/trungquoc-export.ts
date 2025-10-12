import ExcelJS from 'exceljs';

interface TrungQuocProduct {
  imageUrl: string;
  sizes: {
    [key: string]: number | '*'; // size 36-45
  };
  totalPairs: number;
  price: number;
  sku: string;
  exchangeRate: number;
}

interface TrungQuocExportData {
  products: ImportCalculation[];
  exchangeRate?: number;
}

// ImportCalculation interface từ file khác
interface ImportCalculation {
  sku: string;
  productCode: string;
  size: string;
  currentStock: number;
  incomingStock: number;
  minStock: number;
  exportQuantity: number;
  sellRate: number;
  needImport: number;
  image: string;
  importPrice: number;
  costPriceVnd: number;
  explanation: string;
}

export const exportToTrungQuoc = async (
  data: TrungQuocExportData
): Promise<void> => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Nhập Hàng Trung Quốc');

    const exchangeRate = data.exchangeRate || 3500;
    let currentRowIndex = 1;

    // Debug: log first few products to check importPrice
    console.log('Debug - First 3 products importPrice:', data.products.slice(0, 3).map(p => ({
      sku: p.sku,
      importPrice: p.importPrice,
      needImport: p.needImport
    })));

    // Thiết lập độ rộng cột
    worksheet.columns = [
      { width: 8 },  // Hình ảnh
      { width: 6 },  // 36
      { width: 6 },  // 37
      { width: 6 },  // 38
      { width: 6 },  // 39
      { width: 6 },  // 40
      { width: 6 },  // 41
      { width: 6 },  // 42
      { width: 6 },  // 43
      { width: 6 },  // 44
      { width: 6 },  // 45
      { width: 8 },  // Pairs
      { width: 10 }, // Price
      { width: 15 }, // Total
      { width: 20 }, // SKU
      { width: 12 }, // Tỷ giá
      { width: 20 }  // Tổng tiền VND
    ];

    // Define styles
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '366092' } }, // Blue background
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
    };

    const dataStyleEven = {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } }, // Light gray background
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
    };

    const dataStyleOdd = {
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
    };

    const numberStyle = {
      numFmt: '#,##0',
      alignment: { horizontal: 'right', vertical: 'middle' },
      border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
    };

    const roundToTwoDecimals = (value: number): number =>
      Math.round((value + Number.EPSILON) * 100) / 100;

    const calculatePriceInCNY = (product: ImportCalculation, rate: number) => {
      const costPriceVnd = product.costPriceVnd || 0;
      const importPrice = product.importPrice || 0;
      const convertVndToCny = (value: number) => roundToTwoDecimals(value / rate);

      if (costPriceVnd > 0) {
        return {
          priceInCny: convertVndToCny(costPriceVnd),
          priceInVnd: costPriceVnd
        };
      }

      if (importPrice >= 1000) {
        return {
          priceInCny: convertVndToCny(importPrice),
          priceInVnd: importPrice
        };
      }

      if (importPrice > 0) {
        const normalizedCny = roundToTwoDecimals(importPrice);
        return {
          priceInCny: normalizedCny,
          priceInVnd: roundToTwoDecimals(normalizedCny * rate)
        };
      }

      console.warn(`Product ${product.sku} is missing import price information.`);
      return {
        priceInCny: 0,
        priceInVnd: 0
      };
    };

    // Process each product
    for (let i = 0; i < data.products.length; i++) {
      const product = data.products[i];
      
      const { priceInCny, priceInVnd } = calculatePriceInCNY(product, exchangeRate);
      
      // 1. Tạo dòng Tiêu Đề
      const headerRow = worksheet.getRow(currentRowIndex);
      headerRow.values = [
        'Hình ảnh', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45',
        'Pairs', 'Price', 'Total', 'SKU', 'Tỷ giá', 'Tổng tiền VND'
      ];

      // Apply header style to each cell
      headerRow.eachCell({ includeEmpty: false }, (cell) => {
        Object.assign(cell, headerStyle);
      });
      
      currentRowIndex++;

      // 2. Tạo dòng Dữ Liệu
      const dataRow = worksheet.getRow(currentRowIndex);
      
      // Generate sizes
      const sizes = generateSizesFromData(product);
      const totalPairs = Object.values(sizes).reduce((sum: number, val: number | '*') => 
        val === '*' ? sum : sum + (val as number), 0);
      
      dataRow.values = [
        product.image || '', // Hình ảnh
        sizes[36] === '*' ? '' : sizes[36],    // 36
        sizes[37] === '*' ? '' : sizes[37],    // 37
        sizes[38] === '*' ? '' : sizes[38],    // 38
        sizes[39] === '*' ? '' : sizes[39],    // 39
        sizes[40] === '*' ? '' : sizes[40],    // 40
        sizes[41] === '*' ? '' : sizes[41],    // 41
        sizes[42] === '*' ? '' : sizes[42],    // 42
        sizes[43] === '*' ? '' : sizes[43],    // 43
        sizes[44] === '*' ? '' : sizes[44],    // 44
        sizes[45] === '*' ? '' : sizes[45],    // 45
        totalPairs,          // Pairs
        priceInCny,          // Price
        roundToTwoDecimals(totalPairs * priceInCny), // Total CNY
        product.sku || '',   // SKU
        exchangeRate,        // Tỷ giá
        Math.round(totalPairs * priceInVnd)  // Tổng tiền VND - kết quả thực tế
      ];

      // Apply alternating row styles
      const isEvenRow = currentRowIndex % 2 === 0;
      dataRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        if (colNumber === 13 || colNumber === 16 || colNumber === 14 || colNumber === 17) { // Pairs, ExchangeRate, Total, Tổng tiền VND - number format
          Object.assign(cell, isEvenRow ? { ...dataStyleEven, ...numberStyle } : { ...dataStyleOdd, ...numberStyle });
        } else {
          Object.assign(cell, isEvenRow ? dataStyleEven : dataStyleOdd);
        }
      });
      
      currentRowIndex++;
    }

    // Tạo buffer và export
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // Tải file về
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nhap_hang_trung_quoc_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Lỗi khi xuất file Trung Quốc:', error);
    throw new Error('Không thể xuất file Trung Quốc. Vui lòng thử lại.');
  }
};

// Helper function để phân bổ số lượng theo size
function generateSizesFromData(product: ImportCalculation): { [key: string]: number | '*' } {
  const sizes: { [key: string]: number | '*' } = {};
  const totalQuantity = product.needImport;
  
  // Lấy size từ product size field
  const baseSize = parseInt(product.size) || 40;
  
  // Phân bổ số lượng theo logic thông minh
  if (totalQuantity > 0) {
    // Phân bổ ưu tiên around base size
    const sizeRange = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45];
    const distribution: { [key: number]: number } = {};
    
    // Tạo phân phối gần với real case
    let remaining = totalQuantity;
    const priorities = [
      baseSize,       // Size của sản phẩm
      baseSize - 1,   // Size nhỏ hơn 1
      baseSize + 1,   // Size lớn hơn 1
      baseSize - 2,   // Size nhỏ hơn 2
      baseSize + 2    // Size lớn hơn 2
    ];
    
    // Gán theo ưu tiên
    for (const size of priorities) {
      if (remaining <= 0) break;
      if (sizeRange.includes(size)) {
        const qty = Math.min(Math.ceil(remaining / 5), 3); // Max 3 đôi per size
        distribution[size] = qty;
        remaining -= qty;
      }
    }
    
    // Phân bổ còn lại
    if (remaining > 0) {
      const availableSizes = sizeRange.filter(s => !distribution[s]);
      for (const size of availableSizes) {
        if (remaining <= 0) break;
        const qty = Math.min(Math.ceil(remaining / availableSizes.length), 2);
        distribution[size] = qty;
        remaining -= qty;
      }
    }
    
    // Điền vào mảng sizes
    sizeRange.forEach(size => {
      sizes[size] = distribution[size] || '*';
    });
  } else {
    // Nếu không có số lượng, điền * tất cả
    const sizeRange = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45];
    sizeRange.forEach(size => {
      sizes[size] = '*';
    });
  }
  
  return sizes;
}
