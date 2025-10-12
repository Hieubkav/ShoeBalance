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
import { exportToTrungQuoc, prepareTrungQuocRows, type TrungQuocExportData } from '@/lib/trungquoc-export'

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
  sizes: Record<string, number>
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
    const sizeKeys = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45']

    const groupedRows = prepareTrungQuocRows(calculations, defaultRate)
    const processed = groupedRows.map(row => ({
      imageUrl: row.imageUrl,
      sizes: sizeKeys.reduce((acc, key) => {
        acc[key] = row.sizes[key as keyof typeof row.sizes] || 0
        return acc
      }, {} as Record<string, number>),
      totalPairs: row.totalPairs,
      priceInCNY: row.priceInCny,
      totalCNY: row.totalCny,
      sku: row.productCode,
      totalVND: row.totalVnd
    }))

    setPreviewData(processed)
    return processed
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
                          {[36, 37, 38, 39, 40, 41, 42, 43, 44, 45].map(size => {
                            const value = product.sizes[String(size)] || 0
                            return (
                              <TableCell key={size} className="text-center">
                                {value > 0 ? value : ''}
                              </TableCell>
                            )
                          })}
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
