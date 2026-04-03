import { NextResponse } from 'next/server'
import { processTqUpdate } from '@/lib/tq-update/process-tq-update'

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') ?? ''
    let sapoBuffer: Buffer
    let reportBuffer: Buffer

    if (contentType.includes('application/json')) {
      const payload = (await request.json()) as { sapoUrl?: string; reportUrl?: string }
      if (!payload.sapoUrl || !payload.reportUrl) {
        return NextResponse.json(
          { error: 'Thiếu link file sapo hoặc report' },
          { status: 400 }
        )
      }

      const [sapoResponse, reportResponse] = await Promise.all([
        fetch(payload.sapoUrl),
        fetch(payload.reportUrl)
      ])

      if (!sapoResponse.ok || !reportResponse.ok) {
        return NextResponse.json(
          { error: 'Không thể tải file từ Blob' },
          { status: 400 }
        )
      }

      sapoBuffer = Buffer.from(await sapoResponse.arrayBuffer())
      reportBuffer = Buffer.from(await reportResponse.arrayBuffer())
    } else {
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

      sapoBuffer = Buffer.from(await sapoFile.arrayBuffer())
      reportBuffer = Buffer.from(await reportFile.arrayBuffer())
    }

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
