import ExcelJS from 'exceljs';

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

const SAPO_TEMPLATE_PATH = '/nhap_hang_sapo_template.xlsx';
const FIRST_PRODUCT_ROW = 8;

export const exportToSapo = async (
  data: SapoExportData
): Promise<void> => {
  try {
    const templateResponse = await fetch(SAPO_TEMPLATE_PATH);

    if (!templateResponse.ok) {
      throw new Error('Khong the tai template nhap hang SAPO.');
    }

    const templateBuffer = await templateResponse.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(templateBuffer);

    const worksheet = workbook.worksheets[0] ?? workbook.addWorksheet('Sheet1');

    const setCellValue = (address: string, value?: string | number | null) => {
      const cell = worksheet.getCell(address);

      if (value === undefined || value === null || value === '') {
        cell.value = null;
        return;
      }

      cell.value = value;
    };

    const donNhap = data.donNhap ?? {};

    setCellValue('B1', donNhap.maDonNhap ?? '');
    setCellValue('E1', donNhap.theTags ?? '');
    setCellValue('B2', donNhap.maChinhSachGia ?? '');
    setCellValue('E2', donNhap.ghiChu ?? '');
    setCellValue('E3', donNhap.thamChieuDonNhap ?? '');

    data.sanPhams.forEach((calc, index) => {
      const rowNumber = FIRST_PRODUCT_ROW + index;
      const row = worksheet.getRow(rowNumber);

      row.getCell(1).value = calc.sku || '';
      row.getCell(2).value = calc.productCode || '';
      row.getCell(3).value = calc.productCode || '';
      row.getCell(4).value = calc.needImport ?? 0;
      row.getCell(5).value = null;
      row.getCell(6).value = null;
      row.getCell(7).value = null;
      row.getCell(8).value = null;
      row.getCell(9).value = calc.costPriceVnd ?? 0;
      row.getCell(10).value = null;
      row.getCell(11).value = null;
      row.getCell(12).value = null;
      row.getCell(13).value = null;
      row.getCell(14).value = null;
      row.getCell(15).value = null;
      row.getCell(16).value = null;
      row.getCell(17).value = null;

      row.commit();
    });

    const resultBuffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([resultBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nhap_hang_sapo_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Loi khi xuat file SAPO:', error);
    throw new Error('Khong the xuat file SAPO. Vui long thu lai.');
  }
};
