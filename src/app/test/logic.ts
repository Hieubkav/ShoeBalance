// Logic tính toán nhập hàng - Phiên bản thử nghiệm
// File này tách biệt logic để dễ dàng chỉnh sửa và test

export interface Product {
  sku: string
  image: string
  minStock: number
  importPrice: number
  costPriceVnd: number
  size: string
  productCode: string
}

export interface StockReport {
  sku: string
  currentStock: number
  incomingStock: number
  size: string
  productCode: string
}

export interface StockLedger {
  sku: string
  exportQuantity: number
  size: string
  productCode: string
}

export interface ImportCalculation {
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

export interface CalculateImportInput {
  products: Product[]
  stockReports: StockReport[]
  stockLedgers: StockLedger[]
}

// Cấu hình có thể thay đổi
const CONFIG = {
  // Số ngày để tính tỉ suất bán
  DAYS_FOR_SELL_RATE: 30,
  
  // Ngưỡng tỉ suất bán: < 0.4 = bán chậm, >= 0.4 = bán nhanh
  SELL_RATE_THRESHOLD: 0.4,
  
  // Giới hạn tồn kho cho size nữ
  FEMALE_MAX_MIN_STOCK: 8,
  
  // Giới hạn tồn kho tối đa cho size biên (40, 44, 45)
  MAX_EDGE_SIZE: 4,
  
  // Tồn kho tối thiểu theo size cho trường hợp bán chậm
  SIZE_MIN_STOCKS_SLOW: {
    '40': 3, '41': 5, '42': 5, '43': 5, '44': 3, '45': 2
  } as Record<string, number>,
  
  // Hệ số ưu tiên size
  SIZE_PRIORITY: {
    '42': 1.2,  // Cao nhất
    '41': 1.0,  // Trung bình
    '43': 0.8   // Thấp nhất
  } as Record<string, number>,
  
  // Ngưỡng nhập hàng theo giới tính
  THRESHOLD_MALE: 12,
  THRESHOLD_FEMALE: 8,
}

export function calculateImportNeeds(input: CalculateImportInput): ImportCalculation[] {
  const { products, stockReports, stockLedgers } = input
  const results: ImportCalculation[] = []

  // Gộp dữ liệu từ stockLedgers theo productCode (cho size nam)
  const ledgerMap = new Map<string, number>()
  // Tạo thêm map theo SKU riêng lẻ (cho size nữ)
  const skuLedgerMap = new Map<string, number>()
  
  stockLedgers.forEach(ledger => {
    const key = ledger.productCode || (ledger.sku.length > 3 ? ledger.sku.slice(0, -3) : ledger.sku)
    if (key) {
      const current = ledgerMap.get(key) || 0
      ledgerMap.set(key, current + ledger.exportQuantity)
    }
    
    if (ledger.sku) {
      const skuCurrent = skuLedgerMap.get(ledger.sku) || 0
      skuLedgerMap.set(ledger.sku, skuCurrent + ledger.exportQuantity)
    }
  })

  products.forEach(product => {
    // Điều kiện 2.1: Tồn kho tối thiểu > 0
    if (product.minStock <= 0) return

    const stockReport = stockReports.find(sr => sr.sku === product.sku)
    const totalExport = ledgerMap.get(product.productCode) || 0

    if (!stockReport) return

    const size = parseInt(product.size)
    const sellRate = totalExport / CONFIG.DAYS_FOR_SELL_RATE
    let needImport = 0
    let newMinStock = product.minStock
    let explanation = ''

    // Điều kiện 2.2 - Size nữ (36-39)
    if (size >= 36 && size <= 39) {
      const result = calculateFemaleSize(product, stockReport, skuLedgerMap)
      needImport = result.needImport
      newMinStock = result.newMinStock
      explanation = result.explanation
    }
    // Điều kiện 2.3 - Size nam (40-45)
    else if (size >= 40 && size <= 45) {
      const result = calculateMaleSize(product, stockReport, sellRate, totalExport)
      needImport = result.needImport
      newMinStock = result.newMinStock
      explanation = result.explanation
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
        costPriceVnd: product.costPriceVnd,
        explanation: explanation || `Can nhap = ${newMinStock} - ${stockReport.currentStock} - ${stockReport.incomingStock} = ${needImport}.`
      })
    }
  })

  // Lọc theo ngưỡng
  return filterByThreshold(results)
}

function calculateFemaleSize(
  product: Product,
  stockReport: StockReport,
  skuLedgerMap: Map<string, number>
): { needImport: number; newMinStock: number; explanation: string } {
  const skuExport = skuLedgerMap.get(product.sku) || 0
  
  let newMinStock: number
  if (skuExport === 0) {
    newMinStock = 1  // Giữ hàng mẫu
  } else {
    newMinStock = Math.min(skuExport, CONFIG.FEMALE_MAX_MIN_STOCK)
  }
  
  const needImport = newMinStock - stockReport.currentStock - stockReport.incomingStock
  const explanation = [
    'Size nu (36-39): ap dung ton kho toi thieu DONG.',
    `Xuat kho thang: ${skuExport} doi => Ton kho toi thieu = ${newMinStock} doi.`,
    `Can nhap = ${newMinStock} - ${stockReport.currentStock} - ${stockReport.incomingStock} = ${needImport}.`
  ].join('\n')

  return { needImport, newMinStock, explanation }
}

function calculateMaleSize(
  product: Product,
  stockReport: StockReport,
  sellRate: number,
  totalExport: number
): { needImport: number; newMinStock: number; explanation: string } {
  let needImport = 0
  let newMinStock = product.minStock
  let explanation = ''

  // Trường hợp 1: Bán chậm
  if (sellRate < CONFIG.SELL_RATE_THRESHOLD && stockReport.currentStock < 13) {
    newMinStock = CONFIG.SIZE_MIN_STOCKS_SLOW[product.size] || product.minStock
    needImport = newMinStock - stockReport.currentStock - stockReport.incomingStock
    explanation = [
      'Size nam - truong hop 1: ti suat ban < 0.4 (ban cham).',
      `Ton kho toi thieu moi size ${product.size} = ${newMinStock}.`,
      `Can nhap = ${newMinStock} - ${stockReport.currentStock} - ${stockReport.incomingStock} = ${needImport}.`
    ].join('\n')
  }
  // Trường hợp 2: Bán nhanh
  else if (sellRate >= CONFIG.SELL_RATE_THRESHOLD && stockReport.currentStock < (15 + 12 * sellRate)) {
    const totalIdealStock = 24 + 12 * sellRate
    const percentage = 0.2058

    let baseStock = Math.round(totalIdealStock * percentage)
    let edgeStock = Math.max(0, baseStock - 2)

    let excess = 0
    if (edgeStock > CONFIG.MAX_EDGE_SIZE) {
      excess = edgeStock - CONFIG.MAX_EDGE_SIZE
      edgeStock = CONFIG.MAX_EDGE_SIZE
    }

    const redistributed = excess

    if (product.size === '42') {
      newMinStock = Math.round((baseStock + redistributed) * CONFIG.SIZE_PRIORITY['42'])
    } else if (product.size === '41') {
      newMinStock = Math.round((baseStock + redistributed) * CONFIG.SIZE_PRIORITY['41'])
    } else if (product.size === '43') {
      newMinStock = Math.round((baseStock + redistributed) * CONFIG.SIZE_PRIORITY['43'])
    } else if (product.size === '40' || product.size === '44' || product.size === '45') {
      newMinStock = edgeStock
    }

    needImport = newMinStock - stockReport.currentStock - stockReport.incomingStock
    explanation = [
      'Size nam - truong hop 2: ti suat ban >= 0.4 (ban nhanh).',
      `Ti suat ban = ${sellRate.toFixed(2)} => ton kho ly tuong = 24 + 12 * ${sellRate.toFixed(2)} = ${totalIdealStock.toFixed(2)}.`,
      `Size ${product.size} duoc phan bo ${newMinStock} doi (uu tien: 42>41>43)${excess > 0 ? ` (da ap dung gioi han toi da va phan phoi lai)` : ''}.`,
      `Can nhap = ${newMinStock} - ${stockReport.currentStock} - ${stockReport.incomingStock} = ${needImport}.`
    ].join('\n')
  }

  return { needImport, newMinStock, explanation }
}

function filterByThreshold(results: ImportCalculation[]): ImportCalculation[] {
  const productGroupMap = new Map<string, ImportCalculation[]>()
  results.forEach(result => {
    const group = productGroupMap.get(result.productCode) || []
    group.push(result)
    productGroupMap.set(result.productCode, group)
  })

  const finalResults: ImportCalculation[] = []
  productGroupMap.forEach((group, productCode) => {
    const totalNeedImport = group.reduce((sum, item) => sum + item.needImport, 0)

    const hasFemaleSize = group.some(item => {
      const size = parseInt(item.size)
      return size >= 36 && size <= 39
    })
    const hasMaleSize = group.some(item => {
      const size = parseInt(item.size)
      return size >= 40 && size <= 45
    })
    const isUnisex = hasFemaleSize && hasMaleSize
    const threshold = (isUnisex || !hasFemaleSize) ? CONFIG.THRESHOLD_MALE : CONFIG.THRESHOLD_FEMALE

    if (totalNeedImport > threshold) {
      finalResults.push(...group)
    }
  })

  return finalResults
}
