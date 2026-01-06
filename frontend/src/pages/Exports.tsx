import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { exportsApi } from '../utils/api'
import { ExportRun } from '../types'
import {
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Calendar,
  Filter
} from 'lucide-react'
import dayjs from 'dayjs'
import { useState } from 'react'

function ExportStatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ElementType; className: string }> = {
    completed: { icon: CheckCircle, className: 'bg-green-100 text-green-700' },
    failed: { icon: XCircle, className: 'bg-red-100 text-red-700' },
    running: { icon: RefreshCw, className: 'bg-blue-100 text-blue-700 animate-spin' }
  }

  const { icon: Icon, className } = config[status] || { icon: Clock, className: 'bg-gray-100 text-gray-700' }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${className}`}>
      <Icon className="w-4 h-4" />
      {status}
    </span>
  )
}

function QuickExportPanel() {
  const queryClient = useQueryClient()
  const [exporting, setExporting] = useState(false)

  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['export-preview'],
    queryFn: exportsApi.preview
  })

  const exportMutation = useMutation({
    mutationFn: exportsApi.quickExport,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['export-files'] })
      queryClient.invalidateQueries({ queryKey: ['export-runs'] })
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank')
      }
    },
    onSettled: () => {
      setExporting(false)
    }
  })

  const handleExport = () => {
    setExporting(true)
    exportMutation.mutate()
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Quick Export</h2>

      {previewLoading ? (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-1/3" />
        </div>
      ) : (
        <div className="mb-4">
          <p className="text-gray-600">
            <span className="font-semibold text-2xl">{preview?.count || 0}</span> leads ready for export
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Based on current config filters and scoring
          </p>
        </div>
      )}

      <button
        onClick={handleExport}
        disabled={exporting || !preview?.count}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {exporting ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            Export to CSV
          </>
        )}
      </button>
    </div>
  )
}

function ManualExportPanel() {
  const queryClient = useQueryClient()
  const [options, setOptions] = useState({
    minScore: '',
    maxLeads: '150',
    solarOnly: false,
    massSaveOnly: false
  })
  const [exporting, setExporting] = useState(false)

  const exportMutation = useMutation({
    mutationFn: exportsApi.createManual,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['export-files'] })
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank')
      }
    },
    onSettled: () => {
      setExporting(false)
    }
  })

  const handleExport = () => {
    setExporting(true)
    exportMutation.mutate(options)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Custom Export</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Minimum Score
          </label>
          <select
            value={options.minScore}
            onChange={(e) => setOptions({ ...options, minScore: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">All Scores</option>
            <option value="70">70+ (High)</option>
            <option value="50">50+ (Medium+)</option>
            <option value="30">30+ (Low+)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Leads
          </label>
          <input
            type="number"
            value={options.maxLeads}
            onChange={(e) => setOptions({ ...options, maxLeads: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
            min="1"
            max="1000"
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.solarOnly}
              onChange={(e) => setOptions({ ...options, solarOnly: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Solar Only</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.massSaveOnly}
              onChange={(e) => setOptions({ ...options, massSaveOnly: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Mass Save Only</span>
          </label>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 disabled:opacity-50"
        >
          {exporting ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Filter className="w-5 h-5" />
              Export with Filters
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default function Exports() {
  const { data: files, isLoading: filesLoading } = useQuery({
    queryKey: ['export-files'],
    queryFn: exportsApi.getFiles
  })

  const { data: runsData, isLoading: runsLoading } = useQuery({
    queryKey: ['export-runs'],
    queryFn: exportsApi.getRuns
  })

  const runs: ExportRun[] = runsData?.runs || []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Exports</h1>
        <p className="text-gray-500">Download and manage lead exports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <QuickExportPanel />
        <ManualExportPanel />
      </div>

      {/* Export Files */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Export Files</h2>
        </div>

        {filesLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : !files || files.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No export files yet. Create an export to see files here.
          </div>
        ) : (
          <div className="divide-y">
            {files.slice(0, 10).map((file: any) => (
              <div key={file.name} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB - {dayjs(file.date).format('MMM D, YYYY h:mm A')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => exportsApi.download(file.name)}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export Run History */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Export History</h2>
        </div>

        {runsLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : runs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No export runs yet.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Leads</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{dayjs(run.runDate).format('MMM D, YYYY h:mm A')}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      run.runType === 'scheduled' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {run.runType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ExportStatusBadge status={run.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {run.leadsExported.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-sm">
                    {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : '-'}
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
