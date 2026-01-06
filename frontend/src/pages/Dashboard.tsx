import { useQuery } from '@tanstack/react-query'
import { statsApi, pipelineApi } from '../utils/api'
import { DashboardStats } from '../types'
import {
  Users,
  Sun,
  Leaf,
  TrendingUp,
  Home,
  Activity,
  Clock
} from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

function StatCard({
  title,
  value,
  icon: Icon,
  color = 'blue'
}: {
  title: string
  value: string | number
  icon: React.ElementType
  color?: string
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600'
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

function ScoreDistribution({ distribution }: { distribution: DashboardStats['scores']['distribution'] }) {
  const total = distribution.high + distribution.medium + distribution.low + distribution.veryLow
  if (total === 0) return null

  const getWidth = (count: number) => `${(count / total) * 100}%`

  return (
    <div className="mt-4">
      <div className="flex h-4 rounded-full overflow-hidden">
        <div
          className="bg-green-500"
          style={{ width: getWidth(distribution.high) }}
          title={`High: ${distribution.high}`}
        />
        <div
          className="bg-yellow-500"
          style={{ width: getWidth(distribution.medium) }}
          title={`Medium: ${distribution.medium}`}
        />
        <div
          className="bg-orange-500"
          style={{ width: getWidth(distribution.low) }}
          title={`Low: ${distribution.low}`}
        />
        <div
          className="bg-red-500"
          style={{ width: getWidth(distribution.veryLow) }}
          title={`Very Low: ${distribution.veryLow}`}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>High ({distribution.high})</span>
        <span>Medium ({distribution.medium})</span>
        <span>Low ({distribution.low})</span>
        <span>V.Low ({distribution.veryLow})</span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: statsApi.getDashboard
  })

  const { data: pipelineStatus } = useQuery({
    queryKey: ['pipeline-status'],
    queryFn: pipelineApi.getStatus
  })

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  const lastRun = pipelineStatus?.recentRuns?.[0]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-500">Massachusetts Solar + Mass Save Lead Bot</p>
        </div>
        {lastRun && (
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Last run: {dayjs(lastRun.completedAt).fromNow()}
            <span className={`px-2 py-0.5 rounded text-xs ${
              lastRun.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {lastRun.status}
            </span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Leads"
          value={stats?.totalLeads || 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Solar Candidates"
          value={stats?.programFit.solarCandidates || 0}
          icon={Sun}
          color="orange"
        />
        <StatCard
          title="Mass Save Candidates"
          value={stats?.programFit.massSaveCandidates || 0}
          icon={Leaf}
          color="green"
        />
        <StatCard
          title="Average Score"
          value={stats?.scores.average || 0}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Score Distribution</h2>
          {stats?.scores.distribution && (
            <ScoreDistribution distribution={stats.scores.distribution} />
          )}
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Highest Score:</span>
              <span className="ml-2 font-semibold">{stats?.scores.max || 0}</span>
            </div>
            <div>
              <span className="text-gray-500">Lowest Score:</span>
              <span className="ml-2 font-semibold">{stats?.scores.min || 0}</span>
            </div>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Lead Status</h2>
          <div className="space-y-3">
            {Object.entries(stats?.statusCounts || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className={`status-${status} px-2 py-1 rounded text-sm capitalize`}>
                  {status.replace('_', ' ')}
                </span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Cities */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Home className="w-5 h-5" />
            Top Cities
          </h2>
          <div className="space-y-2">
            {stats?.topCities.slice(0, 5).map(({ city, count }) => (
              <div key={city} className="flex items-center justify-between">
                <span className="text-gray-700">{city}</span>
                <span className="bg-gray-100 px-2 py-1 rounded text-sm">{count} leads</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </h2>
          <div className="space-y-3">
            {stats?.recentActivity.imports.slice(0, 3).map((batch) => (
              <div key={batch.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">Import:</span>
                  <span className="ml-2 text-gray-600">{batch.fileName}</span>
                </div>
                <span className="text-gray-500">{dayjs(batch.createdAt).fromNow()}</span>
              </div>
            ))}
            {stats?.recentActivity.exports.slice(0, 3).map((run) => (
              <div key={run.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">Export:</span>
                  <span className="ml-2 text-gray-600">{run.leadsExported} leads</span>
                </div>
                <span className="text-gray-500">{dayjs(run.createdAt).fromNow()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Program Fit Summary */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Program Fit Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4 text-center">
            <Sun className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats?.programFit.solarCandidates || 0}</p>
            <p className="text-sm text-gray-500">Solar Candidates</p>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <Leaf className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats?.programFit.massSaveCandidates || 0}</p>
            <p className="text-sm text-gray-500">Mass Save Candidates</p>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <div className="flex justify-center gap-1 mb-2">
              <Sun className="w-6 h-6 text-orange-500" />
              <span className="text-gray-400">+</span>
              <Leaf className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{stats?.programFit.bothCandidates || 0}</p>
            <p className="text-sm text-gray-500">Both Programs</p>
          </div>
        </div>
      </div>
    </div>
  )
}
