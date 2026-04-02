import ExcelJS from 'exceljs'
import { promises as fs } from 'fs'
import path from 'path'
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

const createFallbackWorkbook = () => {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('nhap_hang_sapo')

  for (let i = 1; i <= 6; i++) {
    sheet.getRow(i).values = []
  }

  sheet.getRow(7).values = headerRow
  return workbook
}

const loadTemplateWorkbook = async () => {
  const templatePath = path.resolve(process.cwd(), 'public', 'nhap_hang_sapo_template.xlsx')
  const templateBuffer = (await fs.readFile(templatePath)) as unknown as Buffer
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(templateBuffer)
  return workbook
}

export const buildSapoWorkbook = async (rows: SapoRow[]) => {
  let workbook: ExcelJS.Workbook

  try {
    workbook = await loadTemplateWorkbook()
  } catch {
    workbook = createFallbackWorkbook()
  }

  const sheet = workbook.worksheets[0] ?? workbook.addWorksheet('nhap_hang_sapo')

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

  for (let index = 0; index < dataRows.length; index++) {
    const rowIndex = 8 + index
    sheet.getRow(rowIndex).values = dataRows[index]
  }

  return workbook
}
