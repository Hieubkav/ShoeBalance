import * as XLSX from 'xlsx'
import type { SapoRow } from './types'

const getCellValue = (row: unknown[], index: number) => {
  if (!Array.isArray(row)) return ''
  const value = row[index]
  if (value === null || value === undefined) return ''
  return typeof value === 'number' ? value : String(value).trim()
}

const parseNumber = (value: unknown) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return value
  const normalized = String(value).replace(/,/g, '').trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : normalized
}

export const parseSapoData = (workbook: XLSX.WorkBook): SapoRow[] => {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  const sapoData: SapoRow[] = []

  for (let i = 7; i < rows.length; i++) {
    const row = rows[i] as unknown[]
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
