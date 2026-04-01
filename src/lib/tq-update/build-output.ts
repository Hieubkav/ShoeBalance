import * as XLSX from 'xlsx'
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
  const sheet = XLSX.utils.aoa_to_sheet([[], [], [], [], [], [], headerRow])

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
    XLSX.utils.sheet_add_aoa(sheet, dataRows, { origin: 'A8' })
  }

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'nhap_hang_sapo')
  return workbook
}
