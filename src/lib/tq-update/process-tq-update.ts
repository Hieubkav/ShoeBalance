import * as XLSX from 'xlsx'
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

export const processTqUpdate = (sapoBuffer: Buffer, reportBuffer: Buffer): TqUpdateResult => {
  const sapoWorkbook = XLSX.read(sapoBuffer, { type: 'buffer' })
  const reportWorkbook = XLSX.read(reportBuffer, { type: 'buffer' })

  const sapoData = parseSapoData(sapoWorkbook)
  const reportData = parseReportData(reportWorkbook)
  const allowedSkus = buildAllowedSkuSet(reportData)

  const filtered = sapoData.filter(item => allowedSkus.has(item.sku))
  const outputWorkbook = buildSapoWorkbook(filtered)
  const outputBuffer = XLSX.write(outputWorkbook, { bookType: 'xlsx', type: 'buffer' })

  return {
    buffer: Buffer.from(outputBuffer),
    filename: `nhap_hang_sapo_${new Date().toISOString().slice(0, 10)}.xlsx`,
    totalRows: filtered.length
  }
}
