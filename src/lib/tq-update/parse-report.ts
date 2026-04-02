import type ExcelJS from 'exceljs'
import type { ReportEntry } from './types'

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const getCellValue = (sheet: ExcelJS.Worksheet, row: number, col: number) => {
  const cell = sheet.getRow(row).getCell(col + 1)
  const value = cell.value

  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map(item => item.text).join('')
    }
    if ('result' in value) return value.result ?? ''
    if ('formula' in value) return value.result ?? value.formula ?? ''
    if ('hyperlink' in value && typeof value.text === 'string') return value.text
  }

  return ''
}

const parseNumber = (value: unknown) => {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  const normalized = String(value).replace(/,/g, '').trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

const isWarehouseFormat = (sheet: ExcelJS.Worksheet) => {
  const maxRows = Math.min(10, sheet.rowCount || 0)

  for (let row = 1; row <= maxRows; row++) {
    const colL = normalizeText(String(getCellValue(sheet, row, 11)))
    const colO = normalizeText(String(getCellValue(sheet, row, 14)))
    if (colL.includes('pairs') && colO.includes('sku')) {
      return true
    }
  }

  return false
}

const findTargetSheet = (workbook: ExcelJS.Workbook) => {
  const names = workbook.worksheets.map(sheet => sheet.name)

  for (const name of names) {
    const normalized = normalizeText(name)
    if (normalized.includes('file gui kho') || normalized.includes('kho trung quoc')) {
      return workbook.getWorksheet(name)
    }
  }

  for (const name of names) {
    const normalized = normalizeText(name)
    if (normalized.includes('bao cao')) {
      return workbook.getWorksheet(name)
    }
  }

  return workbook.worksheets[0]
}

export const parseReportData = (workbook: ExcelJS.Workbook): ReportEntry[] => {
  const sheet = findTargetSheet(workbook)
  if (!sheet) return []

  const maxRows = sheet.rowCount || 0
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
