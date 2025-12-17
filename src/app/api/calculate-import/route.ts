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
        // Trường hợp 1: Bán chậm (sellRate < 0.4)
        // ĐÃ BỎ điều kiện currentStock < 10 để tránh lỗi size chính hết hàng
        if (sellRate < 0.4) {
          // Mức tồn tối thiểu MỚI: ưu tiên size 41,42,43
          const sizeMinStocks: { [key: string]: number } = {
            '40': 3, '41': 5, '42': 5, '43': 5, '44': 3, '45': 2
          }
          newMinStock = sizeMinStocks[product.size] || product.minStock
          needImport = newMinStock - stockReport.currentStock - stockReport.incomingStock
        }
        // Trường hợp 2: Bán nhanh (sellRate >= 0.4)
        else if (sellRate >= 0.4 && stockReport.currentStock < (12 + 10 * sellRate)) {
          const totalIdealStock = 24 + 10 * sellRate
          const percentage = 0.2058
          const MAX_EDGE_SIZE = 4 // Giới hạn tối đa cho size biên (40, 44, 45)

          // Bước 1: Tính minStock theo công thức cũ
          let baseStock = Math.round(totalIdealStock * percentage)
          let edgeStock = Math.max(0, baseStock - 2)

          // Bước 2: Áp dụng giới hạn tối đa cho size biên
          let excess = 0
          if (edgeStock > MAX_EDGE_SIZE) {
            excess = edgeStock - MAX_EDGE_SIZE
            edgeStock = MAX_EDGE_SIZE
          }

          // Bước 3: Phân phối phần thừa cho size chính (41, 42, 43)
          // Tổng thừa = excess * 3 (từ 3 size biên), chia đều cho 3 size chính
          const redistributed = excess // Mỗi size chính nhận thêm = excess

          if (product.size === '41' || product.size === '42' || product.size === '43') {
            newMinStock = baseStock + redistributed
          } else if (product.size === '40' || product.size === '44' || product.size === '45') {
            newMinStock = edgeStock
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

    // Gộp kết quả theo mã sản phẩm và kiểm tra ngưỡng theo giới tính
    const productGroupMap = new Map<string, ImportCalculation[]>()
    results.forEach(result => {
      const group = productGroupMap.get(result.productCode) || []
      group.push(result)
      productGroupMap.set(result.productCode, group)
    })

    const finalResults: ImportCalculation[] = []
    productGroupMap.forEach((group, productCode) => {
      const totalNeedImport = group.reduce((sum, item) => sum + item.needImport, 0)

      // Xác định ngưỡng theo giới tính dựa vào size
      // Nếu có bất kỳ size nào từ 36-39 => sản phẩm nữ => ngưỡng 8
      // Nếu tất cả size từ 40-45 => sản phẩm nam => ngưỡng 12
      const hasFemaleSize = group.some(item => {
        const size = parseInt(item.size)
        return size >= 36 && size <= 39
      })
      const threshold = hasFemaleSize ? 8 : 12

      if (totalNeedImport > threshold) {
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
