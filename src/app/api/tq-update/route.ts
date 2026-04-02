import { NextResponse } from 'next/server'
import { processTqUpdate } from '@/lib/tq-update/process-tq-update'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const sapoFile = formData.get('sapo_file')
    const reportFile = formData.get('report_file')

    if (!(sapoFile instanceof File) || !(reportFile instanceof File)) {
      return NextResponse.json(
        { error: 'Thiếu file sapo hoặc report' },
        { status: 400 }
      )
    }

    const validExt = /\.(xlsx|xls)$/i
    if (!validExt.test(sapoFile.name) || !validExt.test(reportFile.name)) {
      return NextResponse.json(
        { error: 'Chỉ hỗ trợ file Excel (.xlsx, .xls)' },
        { status: 400 }
      )
    }

    const sapoBuffer = Buffer.from(await sapoFile.arrayBuffer())
    const reportBuffer = Buffer.from(await reportFile.arrayBuffer())
    const result = await processTqUpdate(sapoBuffer, reportBuffer)

    const body = new Uint8Array(result.buffer)

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${result.filename}"`
      }
    })
  } catch (error) {
    console.error('Lỗi xử lý /tq-update:', error)
    return NextResponse.json(
      { error: 'Lỗi xử lý file, vui lòng kiểm tra lại định dạng' },
      { status: 500 }
    )
  }
}
