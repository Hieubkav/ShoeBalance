export interface SapoRow {
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

export interface ReportEntry {
  sku: string
  name: string
  sizes: Record<number, number>
}

export interface TqUpdateResult {
  buffer: Buffer
  filename: string
  totalRows: number
}
