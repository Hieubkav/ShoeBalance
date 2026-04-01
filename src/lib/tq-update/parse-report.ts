import * as XLSX from 'xlsx'
import type { ReportEntry } from './types'

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const getSheetRange = (sheet: XLSX.WorkSheet) => {
  if (!sheet['!ref']) return null
  return XLSX.utils.decode_range(sheet['!ref'])
}

const getCellValue = (sheet: XLSX.WorkSheet, row: number, col: number) => {
  const cell = sheet[XLSX.utils.encode_cell({ r: row - 1, c: col })]
  return cell?.v ?? ''
}

const parseNumber = (value: unknown) => {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  const normalized = String(value).replace(/,/g, '').trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

const isWarehouseFormat = (sheet: XLSX.WorkSheet) => {
  const range = getSheetRange(sheet)
  if (!range) return false
  const maxRows = Math.min(10, range.e.r + 1)

  for (let row = 1; row <= maxRows; row++) {
    const colL = normalizeText(String(getCellValue(sheet, row, 11)))
    const colO = normalizeText(String(getCellValue(sheet, row, 14)))
    if (colL.includes('pairs') && colO.includes('sku')) {
      return true
    }
  }

  return false
}

const findTargetSheet = (workbook: XLSX.WorkBook) => {
  const names = workbook.SheetNames

  for (const name of names) {
    const normalized = normalizeText(name)
    if (normalized.includes('file gui kho') || normalized.includes('kho trung quoc')) {
      return workbook.Sheets[name]
    }
  }

  for (const name of names) {
    const normalized = normalizeText(name)
    if (normalized.includes('bao cao')) {
      return workbook.Sheets[name]
    }
  }

  return workbook.Sheets[names[0]]
}

export const parseReportData = (workbook: XLSX.WorkBook): ReportEntry[] => {
  const sheet = findTargetSheet(workbook)
  if (!sheet) return []

  const range = getSheetRange(sheet)
  if (!range) return []
  const maxRows = range.e.r + 1
  const reportData: ReportEntry[] = []
  const warehouseFormat = isWarehouseFormat(sheet)

  if (warehouseFormat) {
    for (let row = 1; row <= maxRows; row++) {
      const skuValue = String(getCellValue(sheet, row, 14)).trim()
      if (!skuValue) continue

      const sizes: Record<number, number> = {}
      let hasValidQuantity = false

      for (let i = 0; i <= 9; i++) {
        const size = 36 + i
        const quantity = parseNumber(getCellValue(sheet, row, 1 + i))
        if (quantity > 0) {
          sizes[size] = quantity
          hasValidQuantity = true
        }
      }

      if (hasValidQuantity) {
        reportData.push({
          sku: skuValue,
          name: skuValue,
          sizes
        })
      }
    }
  } else {
    for (let row = 2; row <= maxRows; row++) {
      const skuValue = String(getCellValue(sheet, row, 3)).trim()
      if (!skuValue) continue

      const nameValue = String(getCellValue(sheet, row, 2)).trim()
      const sizes: Record<number, number> = {}
      let hasValidQuantity = false

      for (let i = 0; i <= 9; i++) {
        const size = 36 + i
        const quantity = parseNumber(getCellValue(sheet, row, 4 + i))
        if (quantity > 0) {
          sizes[size] = quantity
          hasValidQuantity = true
        }
      }

      if (hasValidQuantity) {
        reportData.push({
          sku: skuValue,
          name: nameValue || skuValue,
          sizes
        })
      }
    }
  }

  return reportData
}
