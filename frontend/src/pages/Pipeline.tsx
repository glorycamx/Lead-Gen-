import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pipelineApi } from '../utils/api'
import {
  Play,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  Calculator,
  MessageSquare,
  Download,
  Zap
} from 'lucide-react'
import dayjs from 'dayjs'
import { useState } from 'react'

function StepCard({
  title,
  description,
  icon: Icon,
  onRun,
  isRunning,
  result
}: {
  title: string
  description: string
  icon: React.ElementType
  onRun: () => void
  isRunning: boolean
  result?: { success: boolean; message: string } | null
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Icon className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        <button
          onClick={onRun}
          disabled={isRunning}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
        >
          {isRunning ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          Run
        </button>
      </div>

      {result && (
        <div className={`p-3 rounded-lg ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          <div className="flex items-center gap-2">
            {result.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            <span className="text-sm">{result.message}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Pipeline() {
  const queryClient = useQueryClient()
  const [stepResults, setStepResults] = useState<Record<string, any>>({})

  const { data: status, isLoading } = useQuery({
    queryKey: ['pipeline-status'],
    queryFn: pipelineApi.getStatus,
    refetchInterval: 5000
  })

  const runPipelineMutation = useMutation({
    mutationFn: pipelineApi.run,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-status'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    }
  })

  const ingestMutation = useMutation({
    mutationFn: pipelineApi.ingest,
    onSuccess: (data) => {
      setStepResults(prev => ({ ...prev, ingest: { success: true, message: `Processed ${data.filesProcessed} files` } }))
      queryClient.invalidateQueries({ queryKey: ['pipeline-status'] })
    },
    onError: (err: any) => {
      setStepResults(prev => ({ ...prev, ingest: { success: false, message: err.message } }))
    }
  })

  const scoreMutation = useMutation({
    mutationFn: pipelineApi.score,
    onSuccess: (data) => {
      setStepResults(prev => ({ ...prev, score: { success: true, message: `Scored ${data.leadsScored} leads` } }))
      queryClient.invalidateQueries({ queryKey: ['pipeline-status'] })
    },
    onError: (err: any) => {
      setStepResults(prev => ({ ...prev, score: { success: false, message: err.message } }))
    }
  })

  const notesMutation = useMutation({
    mutationFn: pipelineApi.generateNotes,
    onSuccess: (data) => {
      setStepResults(prev => ({ ...prev, notes: { success: true, message: `Generated ${data.notesGenerated} notes` } }))
      queryClient.invalidateQueries({ queryKey: ['pipeline-status'] })
    },
    onError: (err: any) => {
      setStepResults(prev => ({ ...prev, notes: { success: false, message: err.message } }))
    }
  })

  const recentRuns = status?.recentRuns || []
  const lastRun = recentRuns[0]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-gray-500">Run and monitor the lead generation pipeline</p>
        </div>
      </div>

      {/* Full Pipeline Run */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">Run Full Pipeline</h2>
            <p className="text-blue-100">
              Executes all steps: Ingest CSVs → Score Leads → Generate Notes → Export
            </p>
            {lastRun && (
              <p className="text-blue-200 text-sm mt-2">
                Last run: {dayjs(lastRun.completedAt).format('MMM D, h:mm A')} -
                {lastRun.status === 'completed' ? ` ${lastRun.leadsExported} leads exported` : ` ${lastRun.status}`}
              </p>
            )}
          </div>
          <button
            onClick={() => runPipelineMutation.mutate()}
            disabled={runPipelineMutation.isPending}
            className="flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 disabled:opacity-50"
          >
            {runPipelineMutation.isPending ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Run Now
              </>
            )}
          </button>
        </div>

        {runPipelineMutation.isSuccess && (
          <div className="mt-4 bg-blue-500 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>Pipeline completed successfully!</span>
            </div>
          </div>
        )}
      </div>

      {/* Individual Steps */}
      <h2 className="text-lg font-semibold mb-4">Individual Steps</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <StepCard
          title="1. Ingest CSVs"
          description="Process new CSV files from imports directory"
          icon={Upload}
          onRun={() => ingestMutation.mutate()}
          isRunning={ingestMutation.isPending}
          result={stepResults.ingest}
        />

        <StepCard
          title="2. Score Leads"
          description="Calculate fit scores for all leads"
          icon={Calculator}
          onRun={() => scoreMutation.mutate()}
          isRunning={scoreMutation.isPending}
          result={stepResults.score}
        />

        <StepCard
          title="3. Generate Notes"
          description="Create AI-generated outreach drafts"
          icon={MessageSquare}
          onRun={() => notesMutation.mutate()}
          isRunning={notesMutation.isPending}
          result={stepResults.notes}
        />

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Download className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold">4. Export</h3>
              <p className="text-sm text-gray-500">Go to Exports page for export options</p>
            </div>
          </div>
        </div>
      </div>

      {/* Run History */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Run History</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : recentRuns.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No pipeline runs yet. Click "Run Now" to start.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">New Leads</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Exported</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentRuns.map((run: any) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>{dayjs(run.runDate).format('MMM D, h:mm A')}</span>
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
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${
                      run.status === 'completed' ? 'bg-green-100 text-green-700' :
                      run.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {run.status === 'completed' ? <CheckCircle className="w-4 h-4" /> :
                       run.status === 'failed' ? <XCircle className="w-4 h-4" /> :
                       <RefreshCw className="w-4 h-4 animate-spin" />}
                      {run.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {run.newLeadsAdded?.toLocaleString() || 0}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {run.leadsExported?.toLocaleString() || 0}
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

      {/* Scheduler Status */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Scheduler Status</h2>
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${status?.scheduler?.running ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className={status?.scheduler?.running ? 'text-green-700' : 'text-gray-500'}>
            {status?.scheduler?.running ? 'Scheduler Active' : 'Scheduler Inactive'}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          The scheduler runs daily at 7:00 AM Eastern to automatically process new data and export leads.
          Configure in Settings.
        </p>
      </div>
    </div>
  )
}
