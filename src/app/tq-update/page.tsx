'use client'

import ExcelJS from 'exceljs'
import { useState, type ChangeEvent } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SapoRow {
  sku: string
  barcode: string
  name: string
  quantity: number | string
  unit: string
  category: string
  brand: string
  supplier: string
  price: number | string
  retailPrice: number | string
}

interface ReportEntry {
  sku: string
  sizes: Record<number, number>
}

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const parseNumber = (value: unknown) => {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  const normalized = String(value).replace(/,/g, '').trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

const parseSapoNumber = (value: unknown) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return value
  const normalized = String(value).replace(/,/g, '').trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : normalized
}

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

const parseReportData = (workbook: ExcelJS.Workbook): ReportEntry[] => {
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
        reportData.push({ sku: skuValue, sizes })
      }
    }
  } else {
    for (let row = 2; row <= maxRows; row++) {
      const skuValue = String(getCellValue(sheet, row, 3)).trim()
      if (!skuValue) continue

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
        reportData.push({ sku: skuValue, sizes })
      }
    }
  }

  return reportData
}

const parseSapoData = (workbook: ExcelJS.Workbook): SapoRow[] => {
  const sheet = workbook.worksheets[0]
  if (!sheet) return []

  const sapoData: SapoRow[] = []
  const maxRows = sheet.rowCount || 0

  for (let i = 8; i <= maxRows; i++) {
    const skuValue = String(getCellValue(sheet, i, 0)).trim()
    if (!skuValue) break

    sapoData.push({
      sku: skuValue,
      barcode: String(getCellValue(sheet, i, 1)).trim(),
      name: String(getCellValue(sheet, i, 2)).trim(),
      quantity: parseSapoNumber(getCellValue(sheet, i, 3)),
      unit: String(getCellValue(sheet, i, 4)).trim() || 'Cái',
      category: String(getCellValue(sheet, i, 5)).trim(),
      brand: String(getCellValue(sheet, i, 6)).trim(),
      supplier: String(getCellValue(sheet, i, 7)).trim(),
      price: parseSapoNumber(getCellValue(sheet, i, 8)),
      retailPrice: parseSapoNumber(getCellValue(sheet, i, 9))
    })
  }

  return sapoData
}

const buildAllowedSkuSet = (reportData: ReportEntry[]) => {
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

const createFallbackWorkbook = () => {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('nhap_hang_sapo')

  for (let i = 1; i <= 6; i++) {
    sheet.getRow(i).values = []
  }

  sheet.getRow(7).values = [
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

  return workbook
}

const buildOutputWorkbook = async (rows: SapoRow[]) => {
  let workbook: ExcelJS.Workbook

  try {
    const response = await fetch('/nhap_hang_sapo_template.xlsx')
    if (!response.ok) throw new Error('template_not_found')
    const templateBuffer = await response.arrayBuffer()

    workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(templateBuffer)
  } catch {
    workbook = createFallbackWorkbook()
  }

  const sheet = workbook.worksheets[0] ?? workbook.addWorksheet('nhap_hang_sapo')

  for (let index = 0; index < rows.length; index++) {
    const rowIndex = 8 + index
    const row = rows[index]
    sheet.getRow(rowIndex).values = [
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
    ]
  }

  return workbook
}

export default function TqUpdatePage() {
  const [sapoFile, setSapoFile] = useState<File | null>(null)
  const [reportFile, setReportFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleFileChange =
    (setter: (file: File | null) => void) => (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null
      setter(file)
    }

  const handleSubmit = async () => {
    setError('')
    setSuccess('')

    if (!sapoFile || !reportFile) {
      setError('Vui lòng chọn đủ 2 file.')
      return
    }

    const validExt = /\.(xlsx|xls)$/i
    if (!validExt.test(sapoFile.name) || !validExt.test(reportFile.name)) {
      setError('Chỉ hỗ trợ file Excel (.xlsx, .xls).')
      return
    }

    setIsSubmitting(true)
    try {
      const sapoWorkbook = new ExcelJS.Workbook()
      const reportWorkbook = new ExcelJS.Workbook()

      await sapoWorkbook.xlsx.load(await sapoFile.arrayBuffer())
      await reportWorkbook.xlsx.load(await reportFile.arrayBuffer())

      const sapoData = parseSapoData(sapoWorkbook)
      const reportData = parseReportData(reportWorkbook)
      const allowedSkus = buildAllowedSkuSet(reportData)
      const filtered = sapoData.filter(item => allowedSkus.has(item.sku))

      const outputWorkbook = await buildOutputWorkbook(filtered)
      const outputBuffer = await outputWorkbook.xlsx.writeBuffer()

      const blob = new Blob([outputBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      const filename = `nhap_hang_sapo_${new Date().toISOString().slice(0, 10)}.xlsx`
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setSuccess('Đã tạo file SAPO, kiểm tra file tải xuống.')
    } catch {
      setError('Không thể xử lý file.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">TQ Update</h1>
        <p className="text-muted-foreground">
          Xử lý trực tiếp trên trình duyệt, không upload file lên server.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload file</CardTitle>
          <CardDescription>Chọn 2 file Excel: Sapo và báo cáo TQ.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="sapo-file">File SAPO</Label>
            <Input
              id="sapo-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange(setSapoFile)}
            />
            {sapoFile && (
              <p className="text-sm text-muted-foreground">Đã chọn: {sapoFile.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-file">File báo cáo TQ</Label>
            <Input
              id="report-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange(setReportFile)}
            />
            {reportFile && (
              <p className="text-sm text-muted-foreground">Đã chọn: {reportFile.name}</p>
            )}
          </div>

          {(error || success) && (
            <Alert variant={error ? 'destructive' : 'default'}>
              <AlertDescription>{error || success}</AlertDescription>
            </Alert>
          )}

          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Đang xử lý...' : 'Tạo file SAPO'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
