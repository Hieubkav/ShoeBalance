import { NextRequest, NextResponse } from 'next/server'
import { calculateImportNeeds, type CalculateImportInput } from '@/app/test/logic'

export async function POST(request: NextRequest) {
  try {
    const { products, stockReports, stockLedgers } = await request.json()

    if (!products || !stockReports || !stockLedgers) {
      return NextResponse.json(
        { error: 'Thiếu dữ liệu đầu vào' },
        { status: 400 }
      )
    }

    const input: CalculateImportInput = {
      products,
      stockReports,
      stockLedgers
    }

    const finalResults = calculateImportNeeds(input)

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
