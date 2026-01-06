import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { importsApi } from '../utils/api'
import { ImportBatch } from '../types'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import dayjs from 'dayjs'

function UploadZone() {
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const uploadMutation = useMutation({
    mutationFn: importsApi.upload,
    onSuccess: (data) => {
      setResult(data)
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['import-batches'] })
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Upload failed')
      setResult(null)
    },
    onSettled: () => {
      setUploading(false)
    }
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploading(true)
      setResult(null)
      setError(null)
      uploadMutation.mutate(acceptedFiles[0])
    }
  }, [uploadMutation])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024 // 50MB
  })

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Upload CSV</h2>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4" />
            <p className="text-gray-600">Processing file...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="w-10 h-10 text-gray-400 mb-4" />
            <p className="text-gray-600">
              {isDragActive
                ? 'Drop the CSV file here...'
                : 'Drag and drop a CSV file here, or click to select'}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Max file size: 50MB
            </p>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="mt-4 p-4 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 text-green-700 mb-2">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Import Successful</span>
          </div>
          <div className="text-sm text-green-600 space-y-1">
            <p>Total rows: {result.totalRows}</p>
            <p>New leads added: {result.validRows}</p>
            <p>Duplicates updated: {result.duplicateRows}</p>
            {result.errorRows > 0 && (
              <p className="text-orange-600">Errors: {result.errorRows}</p>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Column Mapping Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-2">Expected CSV Columns</h3>
        <p className="text-sm text-gray-600 mb-3">
          The system will auto-detect columns. For best results, include these headers:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          <span className="bg-white px-2 py-1 rounded">address (required)</span>
          <span className="bg-white px-2 py-1 rounded">city (required)</span>
          <span className="bg-white px-2 py-1 rounded">zip_code</span>
          <span className="bg-white px-2 py-1 rounded">property_type</span>
          <span className="bg-white px-2 py-1 rounded">year_built</span>
          <span className="bg-white px-2 py-1 rounded">sqft</span>
          <span className="bg-white px-2 py-1 rounded">assessed_value</span>
          <span className="bg-white px-2 py-1 rounded">owner_name</span>
          <span className="bg-white px-2 py-1 rounded">mailing_address</span>
        </div>
      </div>
    </div>
  )
}

function BatchStatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ElementType; className: string }> = {
    completed: { icon: CheckCircle, className: 'bg-green-100 text-green-700' },
    failed: { icon: XCircle, className: 'bg-red-100 text-red-700' },
    processing: { icon: Clock, className: 'bg-blue-100 text-blue-700' },
    pending: { icon: Clock, className: 'bg-gray-100 text-gray-700' }
  }

  const { icon: Icon, className } = config[status] || config.pending

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${className}`}>
      <Icon className="w-4 h-4" />
      {status}
    </span>
  )
}

export default function Imports() {
  const { data, isLoading } = useQuery({
    queryKey: ['import-batches'],
    queryFn: () => importsApi.getBatches()
  })

  const batches: ImportBatch[] = data?.batches || []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Imports</h1>
        <p className="text-gray-500">Upload and manage CSV data imports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Zone */}
        <UploadZone />

        {/* Sample Template */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">CSV Template</h2>
          <p className="text-sm text-gray-600 mb-4">
            Download this template to see the expected format for assessor data imports.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs overflow-x-auto">
            <pre>{`address,city,zip_code,property_type,year_built,sqft,assessed_value,owner_name,mailing_address
123 Main St,Haverhill,01830,single_family,1985,2100,450000,John Smith,123 Main St Haverhill MA 01830
456 Oak Ave,Methuen,01844,multi_family,1960,3200,550000,Jane Doe,789 Other St Boston MA 02101`}</pre>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-700">
                <p className="font-medium">Compliance Note</p>
                <p className="mt-1">
                  Only upload data you have legal rights to use. This typically includes:
                </p>
                <ul className="list-disc ml-4 mt-1">
                  <li>Public assessor records you've obtained legally</li>
                  <li>Your own CRM exports</li>
                  <li>Data from permitted open data portals</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Import History */}
      <div className="mt-6 bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Import History</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No imports yet. Upload a CSV to get started.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">File</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Rows</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Results</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {batches.map((batch) => (
                <tr key={batch.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-gray-400" />
                      <span className="truncate max-w-[200px]">{batch.fileName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <BatchStatusBadge status={batch.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {batch.totalRows.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <span className="text-green-600">{batch.validRows} new</span>
                      <span className="text-gray-400 mx-1">/</span>
                      <span className="text-blue-600">{batch.duplicateRows} updated</span>
                      {batch.errorRows > 0 && (
                        <>
                          <span className="text-gray-400 mx-1">/</span>
                          <span className="text-red-600">{batch.errorRows} errors</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-sm">
                    {dayjs(batch.createdAt).format('MMM D, YYYY h:mm A')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
