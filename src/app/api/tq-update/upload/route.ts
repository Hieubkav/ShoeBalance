import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody

  const jsonResponse = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ],
      tokenPayload: JSON.stringify({ purpose: 'tq-update' })
    }),
    onUploadCompleted: async () => {}
  })

  return Response.json(jsonResponse)
}
