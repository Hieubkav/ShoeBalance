import ExcelJS from 'exceljs'
import type { SapoRow } from './types'

const headerRow = [
  'Mã SKU',
  'Mã Barcode',
  'Tên sản phẩm',
  'Số lượng',
  'Đơn vị tính',
  'Danh mục',
  'Thương hiệu',
  'Nhà cung cấp',
  'Đơn giá',
  'Giá bán lẻ'
]

export const buildSapoWorkbook = (rows: SapoRow[]) => {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('nhap_hang_sapo')

  for (let i = 1; i <= 6; i++) {
    sheet.getRow(i).values = []
  }

  sheet.getRow(7).values = headerRow

  const dataRows = rows.map(row => [
    row.sku,
    row.barcode,
    row.name,
    row.quantity,
    row.unit || 'Cái',
    row.category,
    row.brand,
    row.supplier,
    row.price,
    row.retailPrice
  ])

  if (dataRows.length > 0) {
    sheet.addRows(dataRows)
  }

  return workbook
}
