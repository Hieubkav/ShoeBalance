'use client'

import { useState, type ChangeEvent } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

const getFilenameFromHeader = (contentDisposition: string | null) => {
  if (!contentDisposition) return ''
  const match = /filename="?([^"]+)"?/i.exec(contentDisposition)
  return match?.[1] ?? ''
}

export default function TqUpdatePage() {
  const [sapoFile, setSapoFile] = useState<File | null>(null)
  const [reportFile, setReportFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleFileChange =
    (setter: (file: File | null) => void) => (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null
      setter(file)
    }

  const handleSubmit = async () => {
    setError('')
    setSuccess('')

    if (!sapoFile || !reportFile) {
      setError('Vui lòng chọn đủ 2 file.')
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('sapo_file', sapoFile)
      formData.append('report_file', reportFile)

      const response = await fetch('/api/tq-update', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Không thể xử lý file.')
      }

      const blob = await response.blob()
      const contentDisposition = response.headers.get('content-disposition')
      const filename =
        getFilenameFromHeader(contentDisposition) ||
        `nhap_hang_sapo_${new Date().toISOString().slice(0, 10)}.xlsx`

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setSuccess('Đã tạo file SAPO, kiểm tra file tải xuống.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">TQ Update</h1>
        <p className="text-muted-foreground">
          Lọc file SAPO theo báo cáo Trung Quốc và tải file kết quả ngay.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload file</CardTitle>
          <CardDescription>Chọn 2 file Excel: Sapo và báo cáo TQ.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="sapo-file">File SAPO</Label>
            <Input
              id="sapo-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange(setSapoFile)}
            />
            {sapoFile && (
              <p className="text-sm text-muted-foreground">Đã chọn: {sapoFile.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-file">File báo cáo TQ</Label>
            <Input
              id="report-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange(setReportFile)}
            />
            {reportFile && (
              <p className="text-sm text-muted-foreground">Đã chọn: {reportFile.name}</p>
            )}
          </div>

          {(error || success) && (
            <Alert variant={error ? 'destructive' : 'default'}>
              <AlertDescription>{error || success}</AlertDescription>
            </Alert>
          )}

          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Đang xử lý...' : 'Tạo file SAPO'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
