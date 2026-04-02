import ExcelJS from 'exceljs'
import { buildSapoWorkbook } from './build-output'
import { parseReportData } from './parse-report'
import { parseSapoData } from './parse-sapo'
import type { TqUpdateResult } from './types'

const buildAllowedSkuSet = (reportData: ReturnType<typeof parseReportData>) => {
  const allowed = new Set<string>()
  reportData.forEach(entry => {
    Object.entries(entry.sizes).forEach(([size, quantity]) => {
      if (quantity > 0) {
        allowed.add(`${entry.sku}-${size}`)
      }
    })
  })
  return allowed
}

const toBuffer = (value: Buffer | ArrayBuffer) =>
  Buffer.isBuffer(value) ? value : Buffer.from(value)

const toArrayBuffer = (value: Buffer) =>
  value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)

export const processTqUpdate = async (
  sapoBuffer: Buffer,
  reportBuffer: Buffer
): Promise<TqUpdateResult> => {
  const sapoWorkbook = new ExcelJS.Workbook()
  const reportWorkbook = new ExcelJS.Workbook()

  await sapoWorkbook.xlsx.load(toArrayBuffer(sapoBuffer))
  await reportWorkbook.xlsx.load(toArrayBuffer(reportBuffer))

  const sapoData = parseSapoData(sapoWorkbook)
  const reportData = parseReportData(reportWorkbook)
  const allowedSkus = buildAllowedSkuSet(reportData)

  const filtered = sapoData.filter(item => allowedSkus.has(item.sku))
  const outputWorkbook = buildSapoWorkbook(filtered)
  const outputBuffer = toBuffer(await outputWorkbook.xlsx.writeBuffer())

  return {
    buffer: outputBuffer,
    filename: `nhap_hang_sapo_${new Date().toISOString().slice(0, 10)}.xlsx`,
    totalRows: filtered.length
  }
}
