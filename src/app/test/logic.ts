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

  // Tổng nhập tối đa cho mẫu nam bán chậm
  SLOW_MALE_TOTAL_IMPORT_TARGET: 12,

  // Thứ tự ưu tiên chia size cho mẫu nam bán chậm
  SLOW_MALE_PRIORITY_ORDER: ['42', '41', '43', '40', '44', '45'] as string[],
  
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

type MaleSlowCandidate = {
  product: Product
  stockReport: StockReport
  sellRate: number
  totalExport: number
  sizeTargetMinStock: number
  remainingCapacity: number
}

function isFemaleSize(size: number): boolean {
  return size >= 36 && size <= 39
}

function isMaleSize(size: number): boolean {
  return size >= 40 && size <= 45
}

function isMaleSlowSell(sellRate: number): boolean {
  return sellRate < CONFIG.SELL_RATE_THRESHOLD
}

function getMaleSlowTargetBySize(size: string, fallback: number): number {
  return CONFIG.SIZE_MIN_STOCKS_SLOW[size] || fallback
}

function calculateMaleSlowActivation(candidates: MaleSlowCandidate[]): {
  hasZeroSize: boolean
  totalMaleStock: number
  totalMissingCapacity: number
  canActivate: boolean
} {
  const hasZeroSize = candidates.some(item => item.stockReport.currentStock === 0)
  const totalMaleStock = candidates.reduce(
    (sum, item) => sum + item.stockReport.currentStock + item.stockReport.incomingStock,
    0
  )
  const totalMissingCapacity = candidates.reduce((sum, item) => sum + item.remainingCapacity, 0)

  const canActivate =
    hasZeroSize &&
    totalMaleStock < CONFIG.SLOW_MALE_TOTAL_IMPORT_TARGET &&
    totalMissingCapacity >= CONFIG.SLOW_MALE_TOTAL_IMPORT_TARGET

  return { hasZeroSize, totalMaleStock, totalMissingCapacity, canActivate }
}

function allocateMaleSlowNeeds(candidates: MaleSlowCandidate[]): Map<string, number> {
  const allocations = new Map<string, number>()
  const remainingBySku = new Map<string, number>()
  candidates.forEach(item => {
    allocations.set(item.product.sku, 0)
    remainingBySku.set(item.product.sku, item.remainingCapacity)
  })

  let budget = CONFIG.SLOW_MALE_TOTAL_IMPORT_TARGET

  while (budget > 0) {
    let allocatedInRound = false

    for (const size of CONFIG.SLOW_MALE_PRIORITY_ORDER) {
      if (budget <= 0) break

      let selected: MaleSlowCandidate | undefined
      for (const item of candidates) {
        if (item.product.size !== size) continue
        const remaining = remainingBySku.get(item.product.sku) || 0
        if (remaining <= 0) continue

        if (!selected) {
          selected = item
        } else {
          const selectedRemaining = remainingBySku.get(selected.product.sku) || 0
          if (remaining > selectedRemaining) selected = item
        }
      }

      if (!selected) continue

      const sku = selected.product.sku
      allocations.set(sku, (allocations.get(sku) || 0) + 1)
      remainingBySku.set(sku, (remainingBySku.get(sku) || 0) - 1)
      budget -= 1
      allocatedInRound = true
    }

    if (!allocatedInRound) break
  }

  return allocations
}

export function calculateImportNeeds(input: CalculateImportInput): ImportCalculation[] {
  const { products, stockReports, stockLedgers } = input
  const results: ImportCalculation[] = []

  // Gộp dữ liệu từ stockLedgers theo productCode (cho size nam)
  const ledgerMap = new Map<string, number>()
  // Tạo thêm map theo SKU riêng lẻ (cho size nữ)
  const skuLedgerMap = new Map<string, number>()
  const maleSlowCandidatesByProductCode = new Map<string, MaleSlowCandidate[]>()

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
    if (product.minStock <= 0) return

    const stockReport = stockReports.find(sr => sr.sku === product.sku)
    if (!stockReport) return

    const totalExport = ledgerMap.get(product.productCode) || 0
    const size = parseInt(product.size)
    const sellRate = totalExport / CONFIG.DAYS_FOR_SELL_RATE

    if (isFemaleSize(size)) {
      const result = calculateFemaleSize(product, stockReport, skuLedgerMap)
      if (result.needImport > 0) {
        results.push({
          sku: product.sku,
          productCode: product.productCode,
          size: product.size,
          currentStock: stockReport.currentStock,
          incomingStock: stockReport.incomingStock,
          minStock: result.newMinStock,
          exportQuantity: totalExport,
          sellRate,
          needImport: result.needImport,
          image: product.image,
          importPrice: product.importPrice,
          costPriceVnd: product.costPriceVnd,
          explanation: result.explanation
        })
      }
      return
    }

    if (!isMaleSize(size)) return

    if (isMaleSlowSell(sellRate)) {
      const targetMinStock = getMaleSlowTargetBySize(product.size, product.minStock)
      const remainingCapacity = Math.max(0, targetMinStock - stockReport.currentStock - stockReport.incomingStock)
      const group = maleSlowCandidatesByProductCode.get(product.productCode) || []
      group.push({
        product,
        stockReport,
        sellRate,
        totalExport,
        sizeTargetMinStock: targetMinStock,
        remainingCapacity
      })
      maleSlowCandidatesByProductCode.set(product.productCode, group)
      return
    }

    const result = calculateMaleSizeFast(product, stockReport, sellRate)
    if (result.needImport > 0) {
      results.push({
        sku: product.sku,
        productCode: product.productCode,
        size: product.size,
        currentStock: stockReport.currentStock,
        incomingStock: stockReport.incomingStock,
        minStock: result.newMinStock,
        exportQuantity: totalExport,
        sellRate,
        needImport: result.needImport,
        image: product.image,
        importPrice: product.importPrice,
        costPriceVnd: product.costPriceVnd,
        explanation: result.explanation
      })
    }
  })

  maleSlowCandidatesByProductCode.forEach(candidates => {
    const activation = calculateMaleSlowActivation(candidates)
    if (!activation.canActivate) return

    const allocations = allocateMaleSlowNeeds(candidates)
    candidates.forEach(item => {
      const allocated = allocations.get(item.product.sku) || 0
      if (allocated <= 0) return

      const newMinStock = item.stockReport.currentStock + item.stockReport.incomingStock + allocated
      const explanation = [
        'Size nam - truong hop ban cham: chia nhap theo nhom.',
        `Dieu kien kich hoat: co size = 0 (${activation.hasZeroSize ? 'co' : 'khong'}), tong ton nam = ${activation.totalMaleStock} (< ${CONFIG.SLOW_MALE_TOTAL_IMPORT_TARGET}), tong thieu hut = ${activation.totalMissingCapacity} (>= ${CONFIG.SLOW_MALE_TOTAL_IMPORT_TARGET}).`,
        `Thu tu uu tien chia: ${CONFIG.SLOW_MALE_PRIORITY_ORDER.join(' > ')}.`,
        `Size ${item.product.size} duoc chia ${allocated} doi (muc ton size cham: ${item.sizeTargetMinStock}).`,
        `Can nhap = ${newMinStock} - ${item.stockReport.currentStock} - ${item.stockReport.incomingStock} = ${allocated}.`
      ].join('\n')

      results.push({
        sku: item.product.sku,
        productCode: item.product.productCode,
        size: item.product.size,
        currentStock: item.stockReport.currentStock,
        incomingStock: item.stockReport.incomingStock,
        minStock: newMinStock,
        exportQuantity: item.totalExport,
        sellRate: item.sellRate,
        needImport: allocated,
        image: item.product.image,
        importPrice: item.product.importPrice,
        costPriceVnd: item.product.costPriceVnd,
        explanation
      })
    })
  })

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

function calculateMaleSizeFast(
  product: Product,
  stockReport: StockReport,
  sellRate: number
): { needImport: number; newMinStock: number; explanation: string } {
  let needImport = 0
  let newMinStock = product.minStock
  let explanation = ''

  if (sellRate >= CONFIG.SELL_RATE_THRESHOLD && stockReport.currentStock < (15 + 12 * sellRate)) {
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

    if (totalNeedImport >= threshold) {
      finalResults.push(...group)
    }
  })

  return finalResults
}
