import type ExcelJS from 'exceljs'
import type { SapoRow } from './types'

const getCellValue = (row: ExcelJS.Row, index: number) => {
  const cell = row.getCell(index + 1)
  const value = cell.value
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return value
  if (typeof value === 'string') return value.trim()
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text.trim()
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map(item => item.text).join('').trim()
    }
    if ('result' in value) return value.result ?? ''
    if ('formula' in value) return value.result ?? value.formula ?? ''
    if ('hyperlink' in value && typeof value.text === 'string') return value.text.trim()
  }
  return ''
}

const parseNumber = (value: unknown) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return value
  const normalized = String(value).replace(/,/g, '').trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : normalized
}

export const parseSapoData = (workbook: ExcelJS.Workbook): SapoRow[] => {
  const sheet = workbook.worksheets[0]
  if (!sheet) return []

  const sapoData: SapoRow[] = []
  const maxRows = sheet.rowCount || 0

  for (let i = 8; i <= maxRows; i++) {
    const row = sheet.getRow(i)
    const skuValue = String(getCellValue(row, 0)).trim()
    if (!skuValue) break

    sapoData.push({
      sku: skuValue,
      barcode: String(getCellValue(row, 1)),
      name: String(getCellValue(row, 2)),
      quantity: parseNumber(getCellValue(row, 3)),
      unit: String(getCellValue(row, 4)) || 'Cái',
      category: String(getCellValue(row, 5)),
      brand: String(getCellValue(row, 6)),
      supplier: String(getCellValue(row, 7)),
      price: parseNumber(getCellValue(row, 8)),
      retailPrice: parseNumber(getCellValue(row, 9))
    })
  }

  return sapoData
}
