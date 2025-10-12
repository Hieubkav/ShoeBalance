import ExcelJS from 'exceljs';

export interface TrungQuocExportData {
  products: ImportCalculation[];
  exchangeRate?: number;
}

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

const SIZE_KEYS = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'] as const;

type SizeKey = typeof SIZE_KEYS[number];

const roundToTwoDecimals = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const determinePricing = (product: ImportCalculation, rate: number) => {
  const importPrice = product.importPrice || 0;
  const costPriceVnd = product.costPriceVnd || 0;

  if (importPrice > 0 && importPrice < 1000) {
    const priceInCny = roundToTwoDecimals(importPrice);
    const priceInVnd = Math.round(priceInCny * rate);
    return { priceInCny, priceInVnd };
  }

  if (importPrice >= 1000) {
    const priceInVnd = Math.round(importPrice);
    const priceInCny = Math.round(priceInVnd / rate);
    return { priceInCny, priceInVnd };
  }

  if (costPriceVnd > 0) {
    const priceInVnd = Math.round(costPriceVnd);
    const priceInCny = Math.round(priceInVnd / rate);
    return { priceInCny, priceInVnd };
  }

  return { priceInCny: 0, priceInVnd: 0 };
};

const determinePricingFromCalcs = (calcs: ImportCalculation[], rate: number) => {
  for (const calc of calcs) {
    const price = determinePricing(calc, rate);
    if (price.priceInCny > 0 && price.priceInVnd > 0) {
      return price;
    }
  }

  if (calcs.length > 0) {
    return determinePricing(calcs[0], rate);
  }

  return { priceInCny: 0, priceInVnd: 0 };
};

export interface TrungQuocPreparedRow {
  productCode: string;
  imageUrl: string;
  sizes: Record<SizeKey, number>;
  totalPairs: number;
  priceInCny: number;
  priceInVnd: number;
  totalCny: number;
  totalVnd: number;
  exchangeRate: number;
}

export const prepareTrungQuocRows = (
  products: ImportCalculation[],
  exchangeRate: number
): TrungQuocPreparedRow[] => {
  const grouped = new Map<
    string,
    { calcs: ImportCalculation[]; imageUrl: string; order: number }
  >();

  products.forEach((product, index) => {
    const key = product.productCode || product.sku || `PRODUCT_${index}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.calcs.push(product);
      if (!existing.imageUrl && product.image) {
        existing.imageUrl = product.image;
      }
    } else {
      grouped.set(key, {
        calcs: [product],
        imageUrl: product.image || '',
        order: index
      });
    }
  });

  return Array.from(grouped.entries())
    .sort((a, b) => a[1].order - b[1].order)
    .map(([productCode, group]) => {
      const sizes = SIZE_KEYS.reduce((acc, key) => {
        acc[key] = 0;
        return acc;
      }, {} as Record<SizeKey, number>);

      let totalPairs = 0;
      group.calcs.forEach(calc => {
        const parsedSize = String(parseInt(calc.size, 10));
        const need = Math.max(0, Math.round(calc.needImport || 0));
        if ((SIZE_KEYS as readonly string[]).includes(parsedSize)) {
          const sizeKey = parsedSize as SizeKey;
          sizes[sizeKey] = (sizes[sizeKey] || 0) + need;
          totalPairs += need;
        }
      });

      const pricing = determinePricingFromCalcs(group.calcs, exchangeRate);
      const totalCny = roundToTwoDecimals(pricing.priceInCny * totalPairs);
      const totalVnd = Math.round(pricing.priceInVnd * totalPairs);

      return {
        productCode,
        imageUrl: group.imageUrl,
        sizes,
        totalPairs,
        priceInCny: pricing.priceInCny,
        priceInVnd: pricing.priceInVnd,
        totalCny,
        totalVnd,
        exchangeRate
      };
    });
};

export const exportToTrungQuoc = async (
  data: TrungQuocExportData
): Promise<void> => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Nhập Hàng Trung Quốc');

    const exchangeRate = data.exchangeRate || 3500;
    const preparedRows = prepareTrungQuocRows(data.products, exchangeRate);
    let currentRowIndex = 1;

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
      { width: 15 }, // Total CNY
      { width: 20 }, // SKU/Product
      { width: 12 }, // Tỷ giá
      { width: 20 }  // Tổng tiền VND
    ];

    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '366092' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    const dataStyleEven = {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    const dataStyleOdd = {
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    const numberStyle = {
      numFmt: '#,##0',
      alignment: { horizontal: 'right', vertical: 'middle' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    preparedRows.forEach(row => {
      const headerRow = worksheet.getRow(currentRowIndex);
      headerRow.values = [
        'Hình ảnh', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45',
        'Pairs', 'Price', 'Total', 'SKU', 'Tỷ giá', 'Tổng tiền VND'
      ];
      headerRow.eachCell({ includeEmpty: false }, cell => {
        Object.assign(cell, headerStyle);
      });
      currentRowIndex++;

      const dataRow = worksheet.getRow(currentRowIndex);
      dataRow.values = [
        row.imageUrl || '',
        row.sizes['36'] || '',
        row.sizes['37'] || '',
        row.sizes['38'] || '',
        row.sizes['39'] || '',
        row.sizes['40'] || '',
        row.sizes['41'] || '',
        row.sizes['42'] || '',
        row.sizes['43'] || '',
        row.sizes['44'] || '',
        row.sizes['45'] || '',
        row.totalPairs,
        row.priceInCny,
        row.totalCny,
        row.productCode,
        row.exchangeRate,
        row.totalVnd
      ];

      const numericColumns = new Set([12, 13, 14, 16, 17]);
      const isEvenRow = currentRowIndex % 2 === 0;
      dataRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        if (numericColumns.has(colNumber)) {
          Object.assign(
            cell,
            isEvenRow ? { ...dataStyleEven, ...numberStyle } : { ...dataStyleOdd, ...numberStyle }
          );
        } else {
          Object.assign(cell, isEvenRow ? dataStyleEven : dataStyleOdd);
        }
      });

      currentRowIndex++;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

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
