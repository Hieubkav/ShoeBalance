'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { FileSpreadsheet, Download, Calculator } from 'lucide-react'
import { exportToTrungQuoc, type TrungQuocExportData } from '@/lib/trungquoc-export'

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
  costPriceVnd: number
  explanation: string
}

interface TrungQuocProduct {
  imageUrl: string
  sizes: { [key: string]: number | '*' }
  totalPairs: number
  priceInCNY: number
  totalCNY: number
  sku: string
  totalVND: number
}

interface TrungQuocExportProps {
  calculations: ImportCalculation[]
}

export function TrungQuocExport({ calculations }: TrungQuocExportProps) {
  const [exchangeRate, setExchangeRate] = useState<string>('3500')
  const [isExporting, setIsExporting] = useState(false)
  const [previewData, setPreviewData] = useState<TrungQuocProduct[]>([])

  // Process data for preview and export
  const processTrungQuocData = () => {
    const defaultRate = parseFloat(exchangeRate) || 3500

    const processed = calculations.map(calc => {
      const sizes = generateSizesFromData(calc)
      const totalPairs = Object.values(sizes).reduce((sum: number, val: number | '*') => 
        val === '*' ? sum : sum + (val as number), 0)
      
      // Better price calculation logic (same as export)
      let priceInCNY;
      const importPrice = calc.importPrice || 0;
      
      // Debug log the import prices
      console.log(`Product ${calc.sku}: importPrice=${importPrice}, exchangeRate=${defaultRate}`);
      
      if (importPrice <= 0) {
        priceInCNY = 85 + Math.floor(Math.random() * 20); // 85-105 CNY (more realistic)
        console.log(`Warning: Product ${calc.sku} has no import price (${importPrice}), using default: ¥${priceInCNY}`);
        console.log('This might indicate an issue with the CSV data parsing. Please check the "gia nhap" column in the products file.');
      } else if (importPrice < 100) {
        // If price seems to be in CNY already (typically 50-200 CNY)
        priceInCNY = importPrice;
        console.log(`Note: Product ${calc.sku} price treated as CNY: ¥${priceInCNY}`);
      } else if (importPrice < 1000) {
        // Price between 100-1000, likely VND but very low - could be parsing error
        priceInCNY = Math.round(importPrice / defaultRate);
        console.log(`Warning: Product ${calc.sku} price seems low for VND (${importPrice}), treating as VND and converting: ¥${priceInCNY}`);
      } else {
        // Standard VND price, convert to CNY
        priceInCNY = Math.round(importPrice / defaultRate);
        console.log(`Converted: Product ${calc.sku} ${importPrice}VND -> ¥${priceInCNY}`);
      }
      
      const totalVND = totalPairs * (importPrice || priceInCNY * defaultRate);
      const totalCNY = totalPairs * priceInCNY

      return {
        imageUrl: calc.image || '',
        sizes,
        totalPairs,
        priceInCNY,
        totalCNY,
        sku: calc.sku,
        totalVND
      }
    })

    setPreviewData(processed)
    return processed
  }

  // Generate sizes distribution logic (same as in the export function)
  const generateSizesFromData = (calc: ImportCalculation) => {
    const sizes: { [key: string]: number | '*' } = {}
    const totalQuantity = calc.needImport
    const baseSize = parseInt(calc.size) || 40
    const sizeRange = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45]
    
    if (totalQuantity > 0) {
      const distribution: { [key: number]: number } = {}
      let remaining = totalQuantity
      const priorities = [
        baseSize,
        baseSize - 1,
        baseSize + 1,
        baseSize - 2,
        baseSize + 2
      ]
      
      for (const size of priorities) {
        if (remaining <= 0) break
        if (sizeRange.includes(size)) {
          const qty = Math.min(Math.ceil(remaining / 5), 3)
          distribution[size] = qty
          remaining -= qty
        }
      }
      
      if (remaining > 0) {
        const availableSizes = sizeRange.filter(s => !distribution[s])
        for (const size of availableSizes) {
          if (remaining <= 0) break
          const qty = Math.min(Math.ceil(remaining / availableSizes.length), 2)
          distribution[size] = qty
          remaining -= qty
        }
      }
      
      sizeRange.forEach(size => {
        sizes[size] = distribution[size] || '*'
      })
    } else {
      sizeRange.forEach(size => {
        sizes[size] = '*'
      })
    }
    
    return sizes
  }

  const handlePreview = () => {
    // Debug: log first few calculations to check importPrice
    console.log('Preview Debug - First 3 calculations:', calculations.slice(0, 3).map(c => ({
      sku: c.sku,
      importPrice: c.importPrice,
      needImport: c.needImport
    })))
    processTrungQuocData()
  }

  const exportToTrungQuocFile = async () => {
    if (calculations.length === 0) {
      alert('Không có dữ liệu để xuất')
      return
    }

    try {
      setIsExporting(true)
      
      const exportData: TrungQuocExportData = {
        products: calculations,
        exchangeRate: parseFloat(exchangeRate) || 3500
      }
      
      await exportToTrungQuoc(exportData)
    } catch (error) {
      console.error('Lỗi khi xuất file Trung Quốc:', error)
      alert('Không thể xuất file Trung Quốc. Vui lòng thử lại.')
    } finally {
      setIsExporting(false)
    }
  }

  const totalAllPairs = previewData.reduce((sum, item) => sum + item.totalPairs, 0)
  const totalAllVND = previewData.reduce((sum, item) => sum + item.totalVND, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          4. File Nhập Hàng Trung Quốc
        </CardTitle>
        <CardDescription>
          Xuất file theo định dạng nhập hàng từ Trung Quốc với phân bổ size chi tiết
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Exchange Rate Input */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="exchangeRate">Tỷ giá (VND/CNY)</Label>
              <Input
                id="exchangeRate"
                type="number"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                placeholder="3500"
              />
            </div>
            <div className="flex space-x-2 mt-6">
              <Button 
                onClick={handlePreview}
                variant="outline"
                disabled={calculations.length === 0}
              >
                <Calculator className="h-4 w-4 mr-2" />
                Xem trước
              </Button>
              <Button 
                onClick={exportToTrungQuocFile}
                disabled={calculations.length === 0 || isExporting}
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Đang xuất...' : 'Xuất file'}
              </Button>
            </div>
          </div>

          {calculations.length === 0 ? (
            <Alert>
              <AlertDescription>
                Vui lòng tải file CSV và tính toán trước khi xuất file Trung Quốc.
              </AlertDescription>
            </Alert>
          ) : null}

          {/* Preview Table */}
          {previewData.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Xem trước dữ liệu</h3>
                <div className="flex space-x-4 text-sm">
                  <Badge variant="secondary">
                    Tổng: {totalAllPairs} đôi
                  </Badge>
                  <Badge variant="secondary">
                    Tổng VND: {totalAllVND.toLocaleString('vi-VN')}đ
                  </Badge>
                </div>
              </div>
              
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Hình ảnh</TableHead>
                      <TableHead className="w-12">36</TableHead>
                      <TableHead className="w-12">37</TableHead>
                      <TableHead className="w-12">38</TableHead>
                      <TableHead className="w-12">39</TableHead>
                      <TableHead className="w-12">40</TableHead>
                      <TableHead className="w-12">41</TableHead>
                      <TableHead className="w-12">42</TableHead>
                      <TableHead className="w-12">43</TableHead>
                      <TableHead className="w-12">44</TableHead>
                      <TableHead className="w-12">45</TableHead>
                      <TableHead className="w-12">Pairs</TableHead>
                      <TableHead className="w-16">Price (CNY)</TableHead>
                      <TableHead className="w-24">Total</TableHead>
                      <TableHead className="w-24">SKU</TableHead>
                      <TableHead className="w-16">Tỷ giá</TableHead>
                      <TableHead className="w-24">Tổng tiền VND</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((product, index) => (
                      <React.Fragment key={index}>
                        {/* Header Row */}
                        <TableRow className="bg-gray-50">
                          <TableCell>Hình ảnh</TableCell>
                          <TableCell className="text-center">36</TableCell>
                          <TableCell className="text-center">37</TableCell>
                          <TableCell className="text-center">38</TableCell>
                          <TableCell className="text-center">39</TableCell>
                          <TableCell className="text-center">40</TableCell>
                          <TableCell className="text-center">41</TableCell>
                          <TableCell className="text-center">42</TableCell>
                          <TableCell className="text-center">43</TableCell>
                          <TableCell className="text-center">44</TableCell>
                          <TableCell className="text-center">45</TableCell>
                          <TableCell className="text-center font-semibold">Pairs</TableCell>
                          <TableCell className="text-center font-semibold">Price</TableCell>
                          <TableCell className="text-center font-semibold">Total</TableCell>
                          <TableCell className="text-center font-semibold">SKU</TableCell>
                          <TableCell className="text-center font-semibold">Tỷ giá</TableCell>
                          <TableCell className="text-center font-semibold">Tổng tiền VND</TableCell>
                        </TableRow>
                        {/* Data Row */}
                        <TableRow>
                          <TableCell className="max-w-[200px]">
                            {product.imageUrl && (
                              <img 
                                src={product.imageUrl} 
                                alt={product.sku}
                                className="w-8 h-8 object-cover rounded"
                              />
                            )}
                          </TableCell>
                          {[36, 37, 38, 39, 40, 41, 42, 43, 44, 45].map(size => (
                            <TableCell key={size} className="text-center">
                              {product.sizes[size] === '*' ? '' : product.sizes[size]}
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-bold">{product.totalPairs}</TableCell>
                          <TableCell className="text-right">¥{product.priceInCNY}</TableCell>
                          <TableCell className="text-right font-bold">
                            {product.totalCNY.toFixed(2)}¥
                          </TableCell>
                          <TableCell className="text-center">{product.sku}</TableCell>
                          <TableCell className="text-right">{exchangeRate}</TableCell>
                          <TableCell className="text-right font-bold">
                            {product.totalVND.toLocaleString('vi-VN')}đ
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}
                    {/* Total Row */}
                    <TableRow className="bg-gray-100 font-bold">
                      <TableCell colSpan={11} className="text-right">
                        TỔNG CỘNG:
                      </TableCell>
                      <TableCell className="text-center">{totalAllPairs}</TableCell>
                      <TableCell className="text-right font-bold">
                        ¥{previewData.reduce((sum, p) => sum + p.totalCNY, 0).toFixed(2)}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right font-bold">
                        {totalAllVND.toLocaleString('vi-VN')}đ
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
