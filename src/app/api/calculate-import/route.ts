import { NextRequest, NextResponse } from 'next/server'

interface Product {
  sku: string
  image: string
  minStock: number
  importPrice: number
  costPriceVnd: number
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
  costPriceVnd: number
}

export async function POST(request: NextRequest) {
  try {
    const { products, stockReports, stockLedgers } = await request.json()

    if (!products || !stockReports || !stockLedgers) {
      return NextResponse.json(
        { error: 'Thiếu dữ liệu đầu vào' },
        { status: 400 }
      )
    }

    const results: ImportCalculation[] = []

    // Gộp dữ liệu từ stockLedgers theo SKU
    const ledgerMap = new Map<string, number>()
    stockLedgers.forEach((ledger: StockLedger) => {
      const key = ledger.productCode || (ledger.sku.length > 3 ? ledger.sku.slice(0, -3) : ledger.sku)
      if (!key) return
      const current = ledgerMap.get(key) || 0
      ledgerMap.set(key, current + ledger.exportQuantity)
    })

    products.forEach((product: Product) => {
      if (product.minStock <= 0) return // Điều kiện 2.1

      const stockReport = stockReports.find((sr: StockReport) => sr.sku === product.sku)
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
          const totalIdealStock = 12 + 12 + 10 * sellRate
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
          importPrice: product.importPrice,
          costPriceVnd: product.costPriceVnd
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
      if (totalNeedImport > 12) {
        finalResults.push(...group)
      }
    })

    return NextResponse.json({
      success: true,
      data: finalResults,
      summary: {
        totalProducts: finalResults.length,
        totalImportQuantity: finalResults.reduce((sum, item) => sum + item.needImport, 0),
        totalValue: finalResults.reduce(
          (sum, item) => sum + item.needImport * (item.costPriceVnd || item.importPrice),
          0
        )
      }
    })

  } catch (error) {
    console.error('Error calculating import needs:', error)
    return NextResponse.json(
      { error: 'Lỗi xử lý tính toán' },
      { status: 500 }
    )
  }
}
