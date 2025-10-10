'use client'

import { useState, type ChangeEvent } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileSpreadsheet, Download, Calculator } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { exportToSapo } from '@/lib/sapo-export'
import { TrungQuocExport } from '@/components/trungquoc-export'

interface Product {
  sku: string
  image: string
  minStock: number
  importPrice: number
  size: string
  productCode: string
  barcode?: string
  productName?: string
  variantName?: string
  variantId?: string
  currency?: string
  supplierCode?: string
  supplierName?: string
  warehouseCode?: string
  warehouseName?: string
}

interface StockReport {
  sku: string
  currentStock: number
  incomingStock: number
  size: string
  productCode: string
}

interface StockLedger {
  sku: string
  exportQuantity: number
  size: string
  productCode: string
  warehouseName?: string
}

interface ImportCalculation {
  sku: string
  productCode: string
  size: string
  currentStock: number
  incomingStock: number
  minStock: number
  exportQuantity: number
  sellRate: number
  needImport: number
  image: string
  importPrice: number
  explanation: string
}

interface ProductColumnMap {
  skuIndex: number
  barcodeIndex: number
  imageIndex: number
  minStockIndex: number
  importPriceIndex: number
  productNameIndex: number
  variantNameIndex: number
  variantIdIndex: number
  supplierCodeIndex: number
  supplierNameIndex: number
  currencyIndex: number
  warehouseNameIndex: number
  warehouseCode: string
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [stockReports, setStockReports] = useState<StockReport[]>([])
  const [stockLedgers, setStockLedgers] = useState<StockLedger[]>([])
  const [calculations, setCalculations] = useState<ImportCalculation[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isExportingSapo, setIsExportingSapo] = useState(false)
  const stickyHeaderClass = 'sticky top-0 z-40 bg-background shadow-sm border-b'

  const normalizeText = (value: unknown) => {
    if (value === undefined || value === null) return ''
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
  }

  const findColumnIndex = (headers: string[], keywords: string[]) => {
    const normalizedHeaders = headers.map(header => normalizeText(header))

    for (let i = 0; i < normalizedHeaders.length; i++) {
      const header = normalizedHeaders[i]
      if (!header) continue

      for (const keyword of keywords) {
        const normalizedKeyword = normalizeText(keyword)
        if (!normalizedKeyword) continue
        if (header === normalizedKeyword || header.includes(normalizedKeyword)) {
          return i
        }
      }
    }

    return -1
  }

  const getCellValue = (row: any[], index: number) => {
    if (index < 0 || index >= row.length) return ''
    const value = row[index]
    if (value === undefined || value === null) return ''
    return typeof value === 'number' ? String(value) : String(value).trim()
  }

  const extractWarehouseCode = (headerValue: string) => {
    if (!headerValue) return ''
    const segments = headerValue.split('_')
    return segments.length > 1 ? segments[0] : ''
  }

  const headerMatches = (normalizedHeader: string, patterns: string[]) => {
    if (!normalizedHeader) return false
    return patterns.some(pattern => normalizedHeader.includes(normalizeText(pattern)))
  }

  const parseCSVData = (csvText: string, fileType: string) => {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim())
    const data: any[] = []
    const splitRow = (value: string) => value.split(/[\\|\\u2502]/).map(col => col.trim())

    let productColumns: ProductColumnMap | null = null

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (fileType === 'products') {
        const columns = splitRow(line)

        if (i === 0) {
          const skuIndex = findColumnIndex(columns, ['ma sku*', 'ma sku', 'sku'])
          const barcodeIndex = findColumnIndex(columns, ['barcode', 'ma vach'])
          const imageIndex = findColumnIndex(columns, ['anh dai dien', 'image'])
          const minStockIndex = findColumnIndex(columns, ['ton toi thieu', 'ton kho toi thieu'])
          const importPriceIndex = findColumnIndex(columns, ['gia nhap', 'gia nhap*'])
          const productNameIndex = findColumnIndex(columns, ['ten san pham'])
          const variantNameIndex = findColumnIndex(columns, ['ten phien ban'])
          const variantIdIndex = findColumnIndex(columns, ['variant id', 'id bien the'])
          const supplierCodeIndex = findColumnIndex(columns, ['ma nha cung cap'])
          const supplierNameIndex = findColumnIndex(columns, ['ten nha cung cap', 'nha cung cap'])
          const currencyIndex = findColumnIndex(columns, ['currency', 'don vi tien te'])
          const warehouseNameIndex = findColumnIndex(columns, ['diem luu kho', 'kho hang'])

          productColumns = {
            skuIndex: skuIndex >= 0 ? skuIndex : 14,
            barcodeIndex: barcodeIndex >= 0 ? barcodeIndex : -1,
            imageIndex: imageIndex >= 0 ? imageIndex : 25,
            minStockIndex: minStockIndex >= 0 ? minStockIndex : 28,
            importPriceIndex: importPriceIndex >= 0 ? importPriceIndex : 32,
            productNameIndex,
            variantNameIndex,
            variantIdIndex,
            supplierCodeIndex,
            supplierNameIndex,
            currencyIndex,
            warehouseNameIndex,
            warehouseCode:
              minStockIndex >= 0 ? extractWarehouseCode(columns[minStockIndex]) : ''
          }
          continue
        }

        if (!productColumns || columns.length === 0) continue

        const getValue = (index: number) =>
          index >= 0 && index < columns.length ? columns[index] : ''

        const rawSku = getValue(productColumns.skuIndex)
        const sku = rawSku.trim()
        if (!sku || sku === 'Ma SKU*' || sku === 'Ma SKU') continue

        const minStockRaw = getValue(productColumns.minStockIndex)
        const importPriceRaw = getValue(productColumns.importPriceIndex)

        const minStock = parseInt(minStockRaw.replace(/\D/g, '')) || 0
        const importPrice =
          parseFloat(
            importPriceRaw.replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.]/g, '')
          ) || 0

        const size = sku.slice(-2)
        const productCode = sku.length > 3 ? sku.slice(0, -3) : sku

        data.push({
          sku,
          image: getValue(productColumns.imageIndex),
          minStock,
          importPrice,
          size,
          productCode,
          productName: getValue(productColumns.productNameIndex),
          variantName: getValue(productColumns.variantNameIndex),
          variantId: getValue(productColumns.variantIdIndex),
          supplierCode: getValue(productColumns.supplierCodeIndex),
          supplierName: getValue(productColumns.supplierNameIndex),
          currency: getValue(productColumns.currencyIndex) || 'VND',
          warehouseCode: productColumns.warehouseCode,
          warehouseName: getValue(productColumns.warehouseNameIndex)
        })
      } else if (fileType === 'stock' && i >= 5) {
        const columns = splitRow(line)
        if (columns.length >= 8) {
          const sku = columns[1] || ''
          if (!sku || sku === 'Ma SKU') continue

          const currentStock = parseInt(columns[4]) || 0
          const incomingStock = parseFloat(columns[7].replace(',', '.')) || 0
          const size = sku.slice(-2)
          const productCode = sku.slice(0, -3)

          data.push({
            sku,
            currentStock,
            incomingStock,
            size,
            productCode
          })
        }
      } else if (fileType === 'ledger' && i >= 5) {
        const columns = splitRow(line)
        if (columns.length >= 12) {
          const sku = columns[7] || ''
          if (!sku || sku === 'SKU') continue

          const exportQuantity = parseInt(columns[11]) || 0
          const size = sku.slice(-2)
          const productCode = sku.slice(0, -3)

          data.push({
            sku,
            exportQuantity,
            size,
            productCode,
            warehouseName: columns[14] || columns[15] || ''
          })
        }
      }
    }

    return data
  }

  const parseExcelData = (workbook: XLSX.WorkBook, fileType: string) => {
    const data: any[] = []
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

    if (!rows.length) {
      return data
    }

    let productColumns: ProductColumnMap | null = null

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as any[]

      if (fileType === 'products') {
        if (i === 0) {
          const headerColumns = row.map(cell =>
            cell === undefined || cell === null ? '' : String(cell)
          )
          const skuIndex = findColumnIndex(headerColumns, ['ma sku*', 'ma sku', 'sku'])
          const imageIndex = findColumnIndex(headerColumns, ['anh dai dien', 'image'])
          const minStockIndex = findColumnIndex(headerColumns, ['ton toi thieu', 'ton kho toi thieu'])
          const importPriceIndex = findColumnIndex(headerColumns, ['gia nhap', 'gia nhap*'])
          const productNameIndex = findColumnIndex(headerColumns, ['ten san pham'])
          const variantNameIndex = findColumnIndex(headerColumns, ['ten phien ban'])
          const variantIdIndex = findColumnIndex(headerColumns, ['variant id', 'id bien the'])
          const supplierCodeIndex = findColumnIndex(headerColumns, ['ma nha cung cap'])
          const supplierNameIndex = findColumnIndex(headerColumns, ['ten nha cung cap', 'nha cung cap'])
          const currencyIndex = findColumnIndex(headerColumns, ['currency', 'don vi tien te'])
          const warehouseNameIndex = findColumnIndex(headerColumns, ['diem luu kho', 'kho hang'])

          productColumns = {
            skuIndex: skuIndex >= 0 ? skuIndex : 13,
            imageIndex: imageIndex >= 0 ? imageIndex : 17,
            minStockIndex: minStockIndex >= 0 ? minStockIndex : 28,
            importPriceIndex: importPriceIndex >= 0 ? importPriceIndex : 32,
            productNameIndex,
            variantNameIndex,
            variantIdIndex,
            supplierCodeIndex,
            supplierNameIndex,
            currencyIndex,
            warehouseNameIndex,
            warehouseCode:
              minStockIndex >= 0 && headerColumns[minStockIndex]
                ? extractWarehouseCode(String(headerColumns[minStockIndex]))
                : ''
          }
          continue
        }

        if (!productColumns) continue

        const sku = getCellValue(row, productColumns.skuIndex)
        if (!sku || sku === 'Ma SKU*' || sku === 'Ma SKU') continue

        const minStockRaw = getCellValue(row, productColumns.minStockIndex)
        const importPriceRaw = getCellValue(row, productColumns.importPriceIndex)

        const minStock = parseInt(minStockRaw.replace(/\D/g, '')) || 0
        const importPrice =
          parseFloat(
            importPriceRaw.replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.]/g, '')
          ) || 0

        const size = sku.slice(-2)
        const productCode = sku.length > 3 ? sku.slice(0, -3) : sku

        data.push({
          sku,
          image: getCellValue(row, productColumns.imageIndex),
          minStock,
          importPrice,
          size,
          productCode,
          productName: getCellValue(row, productColumns.productNameIndex),
          variantName: getCellValue(row, productColumns.variantNameIndex),
          variantId: getCellValue(row, productColumns.variantIdIndex),
          supplierCode: getCellValue(row, productColumns.supplierCodeIndex),
          supplierName: getCellValue(row, productColumns.supplierNameIndex),
          currency: getCellValue(row, productColumns.currencyIndex) || 'VND',
          warehouseCode: productColumns.warehouseCode,
          warehouseName: getCellValue(row, productColumns.warehouseNameIndex)
        })
      } else if (fileType === 'stock' && i >= 5) {
        const sku = getCellValue(row, 1)
        if (!sku || sku === 'Ma SKU') continue

        const currentStock = parseInt(getCellValue(row, 4)) || 0
        const incomingStock = parseFloat(getCellValue(row, 7).replace(',', '.')) || 0
        const size = sku.slice(-2)
        const productCode = sku.slice(0, -3)

        data.push({
          sku,
          currentStock,
          incomingStock,
          size,
          productCode
        })
      } else if (fileType === 'ledger' && i >= 5) {
        const sku = getCellValue(row, 7)
        if (!sku || sku === 'SKU') continue

        const exportQuantity = parseInt(getCellValue(row, 11)) || 0
        const size = sku.slice(-2)
        const productCode = sku.slice(0, -3)

        data.push({
          sku,
          exportQuantity,
          size,
          productCode,
          warehouseName: getCellValue(row, 15) || getCellValue(row, 16)
        })
      }
    }

    return data
  }

  const formatSapoDate = () => {
    const now = new Date()
    const vnDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
    const pad = (value: number) => value.toString().padStart(2, '0')

    const year = vnDate.getFullYear()
    const month = pad(vnDate.getMonth() + 1)
    const day = pad(vnDate.getDate())
    const hours = pad(vnDate.getHours())
    const minutes = pad(vnDate.getMinutes())
    const seconds = pad(vnDate.getSeconds())

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+07:00`
  }

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>, fileType: string) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        let data: any[] = []

        if (file.name.match(/\.(xlsx|xls)$/i)) {
          const arrayBuffer = e.target?.result as ArrayBuffer
          const workbook = XLSX.read(arrayBuffer, { type: 'array' })
          data = parseExcelData(workbook, fileType)
        } else {
          const text = e.target?.result as string
          data = parseCSVData(text, fileType)
        }

        if (fileType === 'products') {
          setProducts(data)
        } else if (fileType === 'stock') {
          setStockReports(data)
        } else if (fileType === 'ledger') {
          setStockLedgers(data)
        }
      } catch (error) {
        console.error('Loi khi doc file:', error)
        alert('Khong the doc file. Vui long kiem tra lai dinh dang.')
      }
    }

    if (file.name.match(/\.(xlsx|xls)$/i)) {
      reader.readAsArrayBuffer(file)
    } else {
      reader.readAsText(file, 'utf-8')
    }
  }

  const calculateImportNeeds = () => {
    if (products.length === 0 || stockReports.length === 0 || stockLedgers.length === 0) {
      alert('Vui long tai len ca 3 file du lieu')
      return
    }

    setIsProcessing(true)
    const results: ImportCalculation[] = []

    // Gộp dữ liệu từ stockLedgers theo SKU
    const ledgerMap = new Map<string, number>()
    stockLedgers.forEach(ledger => {
      const key = ledger.productCode || (ledger.sku.length > 3 ? ledger.sku.slice(0, -3) : ledger.sku)
      if (!key) return
      const current = ledgerMap.get(key) || 0
      ledgerMap.set(key, current + ledger.exportQuantity)
    })

    products.forEach(product => {
      if (product.minStock <= 0) return // Điều kiện 2.1: Tồn kho tối thiểu > 0

      const stockReport = stockReports.find(sr => sr.sku === product.sku)
      const totalExport = ledgerMap.get(product.productCode) || 0

      if (!stockReport) return

      const size = parseInt(product.size)
      const sellRate = totalExport / 30
      let needImport = 0
      let newMinStock = product.minStock
      let explanation = ''

      // Điều kiện 2.2 - Size nữ (36-39)
      if (size >= 36 && size <= 39) {
        needImport = newMinStock - stockReport.currentStock - stockReport.incomingStock
        explanation = [
          'Size nu (36-39): ap dung ton kho toi thieu san co.',
          `Can nhap = ${newMinStock} - ${stockReport.currentStock} - ${stockReport.incomingStock} = ${needImport}.`
        ].join('\n')
      }
      // Điều kiện 2.3 - Size nam (40-45)
      else if (size >= 40 && size <= 45) {
        if (sellRate < 0.4 && stockReport.currentStock < 10) {
          // Trường hợp 1
          const sizeMinStocks: { [key: string]: number } = {
            '40': 3, '41': 4, '42': 4, '43': 4, '44': 3, '45': 3
          }
          newMinStock = sizeMinStocks[product.size] || product.minStock
          needImport = newMinStock - stockReport.currentStock - stockReport.incomingStock
          explanation = [
            'Size nam - truong hop 1: ti suat ban < 0.4 va ton hien tai < 10.',
            `Ton kho toi thieu moi size ${product.size} = ${newMinStock}.`,
            `Can nhap = ${newMinStock} - ${stockReport.currentStock} - ${stockReport.incomingStock} = ${needImport}.`
          ].join('\n')
        } else if (sellRate >= 0.4 && stockReport.currentStock < (12 + 10 * sellRate)) {
          // Trường hợp 2
          const totalIdealStock = 24 + 10 * sellRate // 12 + 12 + 10 * ti suat ban hang
          const percentage = 0.2058
          const baseSizeStock = Math.round(totalIdealStock * percentage)

          if (product.size === '41' || product.size === '42' || product.size === '43') {
            newMinStock = baseSizeStock
          } else if (product.size === '40' || product.size === '44' || product.size === '45') {
            newMinStock = Math.max(0, baseSizeStock - 2)
          }

          needImport = newMinStock - stockReport.currentStock - stockReport.incomingStock
          explanation = [
            'Size nam - truong hop 2: ti suat ban >= 0.4 va ton hien tai < 12 + 10 * ti suat.',
            `Ti suat ban = ${sellRate.toFixed(2)} => ton kho ly tuong = 24 + 10 * ${sellRate.toFixed(2)} = ${totalIdealStock.toFixed(2)}.`,
            `Size ${product.size} duoc phan bo ${newMinStock} doi.`,
            `Can nhap = ${newMinStock} - ${stockReport.currentStock} - ${stockReport.incomingStock} = ${needImport}.`
          ].join('\n')
        }
      }

      if (needImport > 0) {
        results.push({
          sku: product.sku,
          productCode: product.productCode,
          size: product.size,
          currentStock: stockReport.currentStock,
          incomingStock: stockReport.incomingStock,
          minStock: newMinStock,
          exportQuantity: totalExport,
          sellRate,
          needImport,
          image: product.image,
          importPrice: product.importPrice,
          explanation: explanation || `Can nhap = ${newMinStock} - ${stockReport.currentStock} - ${stockReport.incomingStock} = ${needImport}.`
        })
      }
    })

    // Gộp kết quả theo mã sản phẩm và kiểm tra điều kiện > 12
    const productGroupMap = new Map<string, ImportCalculation[]>()
    results.forEach(result => {
      const group = productGroupMap.get(result.productCode) || []
      group.push(result)
      productGroupMap.set(result.productCode, group)
    })

    const finalResults: ImportCalculation[] = []
    productGroupMap.forEach((group, productCode) => {
      const totalNeedImport = group.reduce((sum, item) => sum + item.needImport, 0)
      if (totalNeedImport > 12) { // Điều kiện 2.4
        finalResults.push(...group)
      }
    })

    setCalculations(finalResults)
    setIsProcessing(false)
  }

  const exportToExcel = () => {
    if (calculations.length === 0) {
      alert('Không có dữ liệu để xuất')
      return
    }

    // 准备数据
    const exportData = calculations.map(calc => ({
      'Mã SKU': calc.sku,
      'Mã sản phẩm': calc.productCode,
      'Size': calc.size,
      'Tồn kho hiện tại': calc.currentStock,
      'Hàng đang về': calc.incomingStock,
      'Tồn kho tối thiểu': calc.minStock,
      'Số lượng xuất kho': calc.exportQuantity,
      'Tỉ suất bán': calc.sellRate.toFixed(2),
      'Cần nhập': calc.needImport,
      'Giá nhập': calc.importPrice,
      'Ảnh': calc.image
    }))

    // 创建工作簿
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Bao Cao Nhap Hang')

    // 设置列宽
    const colWidths = [
      { wch: 20 }, // Mã SKU
      { wch: 20 }, // Mã sản phẩm
      { wch: 10 }, // Size
      { wch: 15 }, // Tồn kho hiện tại
      { wch: 15 }, // Hàng đang về
      { wch: 15 }, // Tồn kho tối thiểu
      { wch: 15 }, // Số lượng xuất kho
      { wch: 12 }, // Tỉ suất bán
      { wch: 12 }, // Cần nhập
      { wch: 15 }, // Giá nhập
      { wch: 50 }  // Ảnh (rộng hơn để chứa link ảnh)
    ]
    ws['!cols'] = colWidths

    // 生成Excel文件并下载
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bao_cao_nhap_hang_${new Date().toISOString().split('T')[0]}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const exportToSapoFile = async () => {
    if (calculations.length === 0) {
      alert('Không có dữ liệu để xuất')
      return
    }

    try {
      setIsExportingSapo(true)

      // Chuẩn bị dữ liệu cho export SAPO
      const sapoData = {
        donNhap: {
          maDonNhap: `NH_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`,
          theTags: 'nhap_hang',
          maChinhSachGia: '',
          ghiChu: `Nhập hàng ngày ${new Date().toLocaleDateString('vi-VN')}`,
          thamChieuDonNhap: ''
        },
        sanPhams: calculations
      };

      await exportToSapo(sapoData);

    } catch (error) {
      console.error('Lỗi khi xuất file SAPO:', error)
      alert('Không thể xuất file SAPO. Vui lòng thử lại.')
    } finally {
      setIsExportingSapo(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Hệ Thống Tính Toán Nhập Hàng</h1>
        <p className="text-muted-foreground">
          Tự động tính toán số lượng cần nhập hàng dựa trên dữ liệu tồn kho, sổ kho và danh sách sản phẩm
        </p>
      </div>

      {/* Phần tải dữ liệu */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">1. Tải Dữ Liệu</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Danh Sách Sản Phẩm
              </CardTitle>
              <CardDescription>
                File chứa thông tin sản phẩm, tồn kho tối thiểu và giá nhập (hỗ trợ .csv, .txt, .xlsx, .xls)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="products-file">Chọn file sản phẩm</Label>
                  <Input
                    id="products-file"
                    type="file"
                    accept=".csv,.txt,.xlsx,.xls"
                    onChange={(e) => handleFileUpload(e, 'products')}
                    className="mt-2"
                  />
                </div>
                {products.length > 0 && (
                  <Badge variant="secondary">Đã tải {products.length} sản phẩm</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Báo Cáo Tồn Kho
              </CardTitle>
              <CardDescription>
                File chứa thông tin tồn kho hiện tại và hàng đang về (hỗ trợ .csv, .txt, .xlsx, .xls)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="stock-file">Chọn file báo cáo tồn kho</Label>
                  <Input
                    id="stock-file"
                    type="file"
                    accept=".csv,.txt,.xlsx,.xls"
                    onChange={(e) => handleFileUpload(e, 'stock')}
                    className="mt-2"
                  />
                </div>
                {stockReports.length > 0 && (
                  <Badge variant="secondary">Đã tải {stockReports.length} bản ghi</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Sổ Kho
              </CardTitle>
              <CardDescription>
                File chứa thông tin số lượng xuất kho (hỗ trợ .csv, .txt, .xlsx, .xls)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ledger-file">Chọn file sổ kho</Label>
                  <Input
                    id="ledger-file"
                    type="file"
                    accept=".csv,.txt,.xlsx,.xls"
                    onChange={(e) => handleFileUpload(e, 'ledger')}
                    className="mt-2"
                  />
                </div>
                {stockLedgers.length > 0 && (
                  <Badge variant="secondary">Đã tải {stockLedgers.length} bản ghi</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Phần tính toán */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">2. Tính Toán Nhập Hàng</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Thực Hiện Tính Toán
            </CardTitle>
            <CardDescription>
              Nhấn nút bên dưới để tính toán số lượng cần nhập hàng dựa trên các điều kiện đã định nghĩa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  <strong>Điều kiện tính toán:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Tồn kho tối thiểu &gt; 0</li>
                    <li>Size nữ (36-39): Cần nhập = Tồn kho tối thiểu - Tồn hiện tại - Hàng đang về</li>
                    <li>Size nam (40-45): Áp dụng công thức tỉ suất bán hàng và tồn kho điều kiện</li>
                    <li>Tổng số lượng cần nhập của 1 mã sản phẩm phải &gt; 12</li>
                  </ul>
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={calculateImportNeeds} 
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? 'Đang xử lý...' : 'Tính Toán Nhập Hàng'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phần kết quả */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">3. Kết Quả Tính Toán</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Bảng Kết Quả Nhập Hàng</span>
              {calculations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={exportToExcel} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Xuat Excel
                  </Button>
                  <Button
                    onClick={exportToSapoFile}
                    variant="default"
                    disabled={isExportingSapo}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    {isExportingSapo ? 'Dang xuat...' : 'Xuat file SAPO'}
                  </Button>
                </div>
              )}
            </CardTitle>
            <CardDescription>
              {calculations.length > 0 
                ? `Tìm thấy ${calculations.length} sản phẩm cần nhập hàng`
                : 'Chưa có kết quả nào. Vui lòng tải dữ liệu và thực hiện tính toán.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-6">
            {calculations.length > 0 ? (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <div className="relative max-h-[65vh] overflow-y-auto">
                    <Table className="import-results-table w-full min-w-[1200px]">
                      <TableHeader
                        className="bg-background shadow-sm"
                        style={{ position: 'sticky', top: 0, zIndex: 50 }}
                      >
                        <TableRow>
                          <TableHead className={stickyHeaderClass}>Ảnh</TableHead>
                          <TableHead className={stickyHeaderClass}>Mã SKU</TableHead>
                          <TableHead className={stickyHeaderClass}>Mã sản phẩm</TableHead>
                          <TableHead className={stickyHeaderClass}>Size</TableHead>
                          <TableHead className={stickyHeaderClass}>Tồn hiện tại</TableHead>
                          <TableHead className={stickyHeaderClass}>Hàng đang về</TableHead>
                          <TableHead className={stickyHeaderClass}>Tồn kho tối thiểu</TableHead>
                          <TableHead className={stickyHeaderClass}>Số lượng xuất kho</TableHead>
                          <TableHead className={stickyHeaderClass}>Tỉ suất bán</TableHead>
                          <TableHead className={stickyHeaderClass}>Cần nhập</TableHead>
                          <TableHead className={stickyHeaderClass}>Giá nhập</TableHead>
                          <TableHead className={stickyHeaderClass}>Thành tiền</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {calculations.map(calc => (
                          <Tooltip key={calc.sku}>
                            <TooltipTrigger asChild>
                              <TableRow className="cursor-help transition-colors hover:bg-muted/60">
                                <TableCell>
                                  {calc.image && (
                                    <img
                                      src={calc.image}
                                      alt={calc.sku}
                                      className="w-12 h-12 object-cover rounded"
                                    />
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">{calc.sku}</TableCell>
                                <TableCell>{calc.productCode}</TableCell>
                                <TableCell>{calc.size}</TableCell>
                                <TableCell>{calc.currentStock}</TableCell>
                                <TableCell>{calc.incomingStock}</TableCell>
                                <TableCell>{calc.minStock}</TableCell>
                                <TableCell>{calc.exportQuantity}</TableCell>
                                <TableCell>{calc.sellRate.toFixed(2)}</TableCell>
                                <TableCell className="font-semibold text-blue-600">
                                  {calc.needImport}
                                </TableCell>
                                <TableCell>{calc.importPrice.toLocaleString()}đ</TableCell>
                                <TableCell className="font-semibold text-green-600">
                                  {(calc.needImport * calc.importPrice).toLocaleString()}đ
                                </TableCell>
                              </TableRow>
                            </TooltipTrigger>
                            <TooltipContent align="start" className="max-w-sm whitespace-pre-line text-left">
                              <div className="font-semibold text-sm mb-1">{calc.sku}</div>
                              <div className="text-xs leading-relaxed">{calc.explanation}</div>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="px-4 sm:px-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Tổng số sản phẩm:</span>
                        <div className="text-lg font-bold">{calculations.length}</div>
                      </div>
                      <div>
                        <span className="font-medium">Tổng số lượng cần nhập:</span>
                        <div className="text-lg font-bold text-blue-600">
                          {calculations.reduce((sum, calc) => sum + calc.needImport, 0)}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Tổng giá trị:</span>
                        <div className="text-lg font-bold text-green-600">
                          {calculations
                            .reduce((sum, calc) => sum + calc.needImport * calc.importPrice, 0)
                            .toLocaleString()}đ
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Số mã sản phẩm:</span>
                        <div className="text-lg font-bold">
                          {new Set(calculations.map(calc => calc.productCode)).size}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-6">
                <div className="text-center py-8 text-muted-foreground">
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Chưa có dữ liệu để hiển thị</p>
                  <p className="text-sm">Vui lòng tải lên 3 file dữ liệu và nhấn nút tính toán</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Phần 4: File Nhập Hàng Trung Quốc */}
      <div>
        <TrungQuocExport calculations={calculations} />
      </div>
    </div>
  )
}
