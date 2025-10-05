'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileSpreadsheet, Download, Calculator } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Product {
  sku: string
  image: string
  minStock: number
  importPrice: number
  size: string
  productCode: string
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
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [stockReports, setStockReports] = useState<StockReport[]>([])
  const [stockLedgers, setStockLedgers] = useState<StockLedger[]>([])
  const [calculations, setCalculations] = useState<ImportCalculation[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const parseCSVData = (csvText: string, fileType: string) => {
    const lines = csvText.split('\n').filter(line => line.trim())
    const data = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (fileType === 'products' && i >= 1) { // Bỏ qua header
        const columns = line.split('|').map(col => col.trim())
        if (columns.length >= 33) {
          const sku = columns[14] || ''
          const image = columns[25] || ''
          const minStock = parseInt(columns[28]) || 0
          const importPrice = parseFloat(columns[32].replace(',', '')) || 0
          
          if (sku && sku !== 'Mã SKU*') {
            const size = sku.slice(-2)
            const productCode = sku.slice(0, -3)
            
            data.push({
              sku,
              image,
              minStock,
              importPrice,
              size,
              productCode
            })
          }
        }
      } else if (fileType === 'stock' && i >= 5) { // Bỏ qua header
        const columns = line.split('|').map(col => col.trim())
        if (columns.length >= 8) {
          const sku = columns[1] || ''
          const currentStock = parseInt(columns[4]) || 0
          const incomingStock = parseFloat(columns[7]) || 0
          
          if (sku && sku !== 'Mã SKU') {
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
        }
      } else if (fileType === 'ledger' && i >= 5) { // Bỏ qua header
        const columns = line.split('|').map(col => col.trim())
        if (columns.length >= 12) {
          const sku = columns[7] || ''
          const exportQuantity = parseInt(columns[11]) || 0
          
          if (sku && sku !== 'SKU') {
            const size = sku.slice(-2)
            const productCode = sku.slice(0, -3)
            
            data.push({
              sku,
              exportQuantity,
              size,
              productCode
            })
          }
        }
      }
    }

    return data
  }

  const parseExcelData = (workbook: XLSX.WorkBook, fileType: string) => {
    const data = []
    const sheetName = workbook.SheetNames[0] // Lấy sheet đầu tiên
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
    
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as any[]
      
      if (fileType === 'products' && i >= 1) { // Bắt đầu từ dòng 2 (index 1)
        const sku = row[13] || '' // Cột N (index 13)
        const image = row[17] || '' // Cột R (index 17)
        const minStock = parseInt(row[28]) || 0 // Cột AC (index 28)
        const importPrice = parseFloat(String(row[32]).replace(',', '')) || 0 // Cột AG (index 32)
        
        if (sku && sku !== 'Mã SKU*' && sku !== 'Mã SKU') {
          const size = sku.slice(-2)
          const productCode = sku.slice(0, -3)
          
          data.push({
            sku,
            image,
            minStock,
            importPrice,
            size,
            productCode
          })
        }
      } else if (fileType === 'stock' && i >= 5) { // Bắt đầu từ dòng 6 (index 5)
        const sku = row[1] || '' // Cột B (index 1)
        const currentStock = parseInt(row[4]) || 0 // Cột E (index 4)
        const incomingStock = parseFloat(row[7]) || 0 // Cột H (index 7)
        
        if (sku && sku !== 'Mã SKU') {
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
      } else if (fileType === 'ledger' && i >= 5) { // Bắt đầu từ dòng 6 (index 5)
        const sku = row[7] || '' // Cột H (index 7)
        const exportQuantity = parseInt(row[11]) || 0 // Cột L (index 11)
        
        if (sku && sku !== 'SKU') {
          const size = sku.slice(-2)
          const productCode = sku.slice(0, -3)
          
          data.push({
            sku,
            exportQuantity,
            size,
            productCode
          })
        }
      }
    }
    
    return data
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, fileType: string) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        let data: any[] = []
        
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          // Xử lý file Excel
          const arrayBuffer = e.target?.result as ArrayBuffer
          const workbook = XLSX.read(arrayBuffer, { type: 'array' })
          data = parseExcelData(workbook, fileType)
        } else {
          // Xử lý file CSV/TXT
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
        console.error('Lỗi khi đọc file:', error)
        alert('Không thể đọc file. Vui lòng kiểm tra lại định dạng file.')
      }
    }

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.readAsArrayBuffer(file)
    } else {
      reader.readAsText(file)
    }
  }

  const calculateImportNeeds = () => {
    if (products.length === 0 || stockReports.length === 0 || stockLedgers.length === 0) {
      alert('Vui lòng tải lên cả 3 file dữ liệu')
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

      // Điều kiện 2.2 - Size nữ (36-39)
      if (size >= 36 && size <= 39) {
        needImport = newMinStock - stockReport.currentStock - stockReport.incomingStock
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
        } else if (sellRate >= 0.4 && stockReport.currentStock < (12 + 10 * sellRate)) {
          // Trường hợp 2
          const totalIdealStock = 12 + 10 * sellRate
          const percentage = 0.2058
          
          if (product.size === '41' || product.size === '42' || product.size === '43') {
            newMinStock = Math.round(totalIdealStock * percentage)
          } else if (product.size === '40' || product.size === '44' || product.size === '45') {
            newMinStock = Math.round(totalIdealStock * percentage) - 2
          }
          
          needImport = newMinStock - stockReport.currentStock - stockReport.incomingStock
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
          importPrice: product.importPrice
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
                <Button onClick={exportToExcel} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Xuất Excel
                </Button>
              )}
            </CardTitle>
            <CardDescription>
              {calculations.length > 0 
                ? `Tìm thấy ${calculations.length} sản phẩm cần nhập hàng`
                : 'Chưa có kết quả nào. Vui lòng tải dữ liệu và thực hiện tính toán.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {calculations.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ảnh</TableHead>
                      <TableHead>Mã SKU</TableHead>
                      <TableHead>Mã sản phẩm</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Tồn hiện tại</TableHead>
                      <TableHead>Hàng đang về</TableHead>
                      <TableHead>Tồn kho tối thiểu</TableHead>
                      <TableHead>Số lượng xuất kho</TableHead>
                      <TableHead>Tỉ suất bán</TableHead>
                      <TableHead>Cần nhập</TableHead>
                      <TableHead>Giá nhập</TableHead>
                      <TableHead>Thành tiền</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calculations.map((calc, index) => (
                      <TableRow key={index}>
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
                    ))}
                  </TableBody>
                </Table>
                
                {/* Tổng kết */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
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
                        {calculations.reduce((sum, calc) => sum + (calc.needImport * calc.importPrice), 0).toLocaleString()}đ
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
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Chưa có dữ liệu để hiển thị</p>
                <p className="text-sm">Vui lòng tải lên 3 file dữ liệu và nhấn nút tính toán</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}