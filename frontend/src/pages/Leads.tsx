import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { leadsApi } from '../utils/api'
import { Lead, STATUS_LABELS, PROPERTY_TYPE_LABELS } from '../types'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Sun,
  Leaf,
  ExternalLink
} from 'lucide-react'

function ScoreBadge({ score }: { score: number }) {
  const getScoreClass = (score: number) => {
    if (score >= 70) return 'score-high'
    if (score >= 50) return 'score-medium'
    if (score >= 30) return 'score-low'
    return 'score-very-low'
  }

  return (
    <span className={`px-2 py-1 rounded text-sm font-medium ${getScoreClass(score)}`}>
      {score}
    </span>
  )
}

function StatusDropdown({
  currentStatus,
  onStatusChange
}: {
  currentStatus: string
  onStatusChange: (status: string) => void
}) {
  return (
    <select
      value={currentStatus}
      onChange={(e) => onStatusChange(e.target.value)}
      className={`status-${currentStatus} px-2 py-1 rounded text-sm border-0 cursor-pointer`}
    >
      {Object.entries(STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  )
}

export default function Leads() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    minScore: '',
    city: '',
    propertyType: '',
    solarCandidate: '',
    massSaveCandidate: ''
  })
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['leads', page, search, filters],
    queryFn: () => leadsApi.getAll({
      page,
      limit: 25,
      search: search || undefined,
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      )
    })
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      leadsApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    }
  })

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) =>
      leadsApi.bulkUpdateStatus(ids, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      setSelectedLeads([])
    }
  })

  const leads: Lead[] = data?.leads || []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 }

  const toggleSelectAll = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([])
    } else {
      setSelectedLeads(leads.map(l => l.id))
    }
  }

  const toggleSelect = (id: string) => {
    if (selectedLeads.includes(id)) {
      setSelectedLeads(selectedLeads.filter(i => i !== id))
    } else {
      setSelectedLeads([...selectedLeads, id])
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-gray-500">{pagination.total} total leads</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search address, city, owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* Min Score Filter */}
          <select
            value={filters.minScore}
            onChange={(e) => setFilters({ ...filters, minScore: e.target.value })}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Scores</option>
            <option value="70">70+ (High)</option>
            <option value="50">50+ (Medium+)</option>
            <option value="30">30+ (Low+)</option>
          </select>

          {/* Property Type Filter */}
          <select
            value={filters.propertyType}
            onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Types</option>
            {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* Program Filters */}
          <select
            value={filters.solarCandidate}
            onChange={(e) => setFilters({ ...filters, solarCandidate: e.target.value })}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">Solar: All</option>
            <option value="true">Solar Candidates</option>
          </select>

          <select
            value={filters.massSaveCandidate}
            onChange={(e) => setFilters({ ...filters, massSaveCandidate: e.target.value })}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">Mass Save: All</option>
            <option value="true">Mass Save Candidates</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedLeads.length > 0 && (
          <div className="mt-4 pt-4 border-t flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {selectedLeads.length} selected
            </span>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  bulkUpdateMutation.mutate({ ids: selectedLeads, status: e.target.value })
                }
              }}
              className="border rounded-lg px-3 py-1 text-sm"
              defaultValue=""
            >
              <option value="" disabled>Bulk update status...</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No leads found. Upload a CSV to get started.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedLeads.length === leads.length}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Address</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">City</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Score</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Programs</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Action</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/leads/${lead.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {lead.address}
                    </Link>
                    {lead.unit && <span className="text-gray-400 ml-1">#{lead.unit}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{lead.city}</td>
                  <td className="px-4 py-3 text-gray-600 text-sm">
                    {PROPERTY_TYPE_LABELS[lead.propertyType || ''] || lead.propertyType || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBadge score={lead.fitScore} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {lead.solarCandidate && (
                        <Sun className="w-5 h-5 text-orange-500" />
                      )}
                      {lead.massSaveCandidate && (
                        <Leaf className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {lead.suggestedAction || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusDropdown
                      currentStatus={lead.status}
                      onStatusChange={(status) =>
                        updateStatusMutation.mutate({ id: lead.id, status })
                      }
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/leads/${lead.id}`}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
