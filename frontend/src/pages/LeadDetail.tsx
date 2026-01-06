import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leadsApi } from '../utils/api'
import { Lead, STATUS_LABELS, PROPERTY_TYPE_LABELS } from '../types'
import {
  ArrowLeft,
  Sun,
  Leaf,
  Home,
  Calendar,
  Ruler,
  DollarSign,
  User,
  MapPin,
  Copy,
  Check
} from 'lucide-react'
import { useState } from 'react'
import dayjs from 'dayjs'

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  )
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="w-5 h-5 text-gray-400 mt-0.5" />}
      <div className="flex-1">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="font-medium">{value || '-'}</p>
      </div>
    </div>
  )
}

function CopyableText({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <button
          onClick={handleCopy}
          className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </button>
      </div>
      <p className="text-sm text-gray-600 whitespace-pre-wrap">{text}</p>
    </div>
  )
}

function ScoreBreakdownChart({ breakdown }: { breakdown: any }) {
  if (!breakdown) return null

  const factors = [
    { label: 'Property Type', value: breakdown.propertyType, max: 20 },
    { label: 'Size (sqft)', value: breakdown.sqft, max: 15 },
    { label: 'Age', value: breakdown.age, max: 15 },
    { label: 'Value', value: breakdown.value, max: 15 },
    { label: 'Owner Occupied', value: breakdown.ownerOccupied, max: 20 },
    { label: 'Data Complete', value: breakdown.dataCompleteness, max: 10 }
  ]

  return (
    <div className="space-y-3">
      {factors.map(({ label, value, max }) => (
        <div key={label}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">{label}</span>
            <span className="font-medium">{value}/{max}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${(value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const { data: lead, isLoading } = useQuery<Lead>({
    queryKey: ['lead', id],
    queryFn: () => leadsApi.getById(id!),
    enabled: !!id
  })

  const { data: history } = useQuery({
    queryKey: ['lead-history', id],
    queryFn: () => leadsApi.getHistory(id!),
    enabled: !!id
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ status, notes }: { status: string; notes?: string }) =>
      leadsApi.updateStatus(id!, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] })
      queryClient.invalidateQueries({ queryKey: ['lead-history', id] })
    }
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Lead not found</p>
        <Link to="/leads" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to leads
        </Link>
      </div>
    )
  }

  const scoreBreakdown = lead.scoreBreakdownParsed || (lead.scoreBreakdown ? JSON.parse(lead.scoreBreakdown) : null)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/leads" className="text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
          <ArrowLeft className="w-4 h-4" />
          Back to leads
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{lead.address}</h1>
            <p className="text-gray-500">{lead.city}, {lead.state} {lead.zipCode}</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Score Badge */}
            <div className={`px-4 py-2 rounded-lg text-center ${
              lead.fitScore >= 70 ? 'bg-green-100' :
              lead.fitScore >= 50 ? 'bg-yellow-100' :
              lead.fitScore >= 30 ? 'bg-orange-100' : 'bg-red-100'
            }`}>
              <p className="text-3xl font-bold">{lead.fitScore}</p>
              <p className="text-xs text-gray-600">Fit Score</p>
            </div>

            {/* Program Badges */}
            <div className="flex flex-col gap-2">
              {lead.solarCandidate && (
                <div className="flex items-center gap-2 bg-orange-50 px-3 py-1 rounded">
                  <Sun className="w-4 h-4 text-orange-500" />
                  <span className="text-sm">Solar</span>
                </div>
              )}
              {lead.massSaveCandidate && (
                <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded">
                  <Leaf className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Mass Save</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Property Details */}
        <div className="space-y-6">
          <InfoCard title="Property Details">
            <div className="space-y-1">
              <InfoRow
                label="Property Type"
                value={PROPERTY_TYPE_LABELS[lead.propertyType || ''] || lead.propertyType}
                icon={Home}
              />
              <InfoRow
                label="Year Built"
                value={lead.yearBuilt}
                icon={Calendar}
              />
              <InfoRow
                label="Square Feet"
                value={lead.sqft?.toLocaleString()}
                icon={Ruler}
              />
              <InfoRow
                label="Bedrooms / Bathrooms"
                value={lead.bedrooms || lead.bathrooms ? `${lead.bedrooms || '-'} bed / ${lead.bathrooms || '-'} bath` : null}
                icon={Home}
              />
              <InfoRow
                label="Lot Size"
                value={lead.lotSizeAcres ? `${lead.lotSizeAcres} acres` : null}
              />
              <InfoRow
                label="Assessed Value"
                value={lead.assessedValue ? `$${lead.assessedValue.toLocaleString()}` : null}
                icon={DollarSign}
              />
              {lead.lastSalePrice && (
                <InfoRow
                  label="Last Sale"
                  value={`$${lead.lastSalePrice.toLocaleString()} (${lead.lastSaleDate ? dayjs(lead.lastSaleDate).format('MMM YYYY') : 'unknown date'})`}
                />
              )}
            </div>
          </InfoCard>

          <InfoCard title="Owner Information">
            <div className="space-y-1">
              <InfoRow
                label="Owner Name"
                value={lead.ownerName}
                icon={User}
              />
              <InfoRow
                label="Mailing Address"
                value={lead.ownerMailingAddr}
                icon={MapPin}
              />
              <InfoRow
                label="Owner Occupied"
                value={lead.isOwnerOccupied === true ? 'Yes' : lead.isOwnerOccupied === false ? 'No' : 'Unknown'}
              />
            </div>
          </InfoCard>
        </div>

        {/* Middle Column - Score & Status */}
        <div className="space-y-6">
          <InfoCard title="Score Breakdown">
            <ScoreBreakdownChart breakdown={scoreBreakdown} />
            {lead.scoreExplainer && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{lead.scoreExplainer}</p>
              </div>
            )}
            {scoreBreakdown?.factors && scoreBreakdown.factors.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Key Factors:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {scoreBreakdown.factors.map((factor: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5" />
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </InfoCard>

          <InfoCard title="Status & Actions">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Status
                </label>
                <select
                  value={lead.status}
                  onChange={(e) => updateStatusMutation.mutate({ status: e.target.value })}
                  className={`status-${lead.status} w-full px-3 py-2 rounded-lg border`}
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Suggested Action
                </label>
                <p className="text-lg font-semibold">{lead.suggestedAction || 'No suggestion'}</p>
              </div>

              {lead.statusNotes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <p className="text-gray-600">{lead.statusNotes}</p>
                </div>
              )}

              {/* Status History */}
              {history && history.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">History</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {history.map((entry: any) => (
                      <div key={entry.id} className="text-sm">
                        <span className="text-gray-500">
                          {dayjs(entry.createdAt).format('MMM D, h:mm A')}
                        </span>
                        <span className="mx-2">:</span>
                        <span>{entry.oldStatus} → {entry.newStatus}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </InfoCard>
        </div>

        {/* Right Column - Outreach Drafts */}
        <div className="space-y-6">
          <InfoCard title="Outreach Drafts (Human Approval Required)">
            <p className="text-sm text-gray-500 mb-4">
              These are AI-generated drafts. Review and personalize before any outreach.
              Never auto-send.
            </p>

            <div className="space-y-4">
              {lead.doorKnockNote && (
                <CopyableText
                  label="Door Knock Note"
                  text={lead.doorKnockNote}
                />
              )}

              {lead.smsDraft && (
                <CopyableText
                  label="SMS Draft"
                  text={lead.smsDraft}
                />
              )}

              {lead.emailDraft && (
                <CopyableText
                  label="Email Draft"
                  text={lead.emailDraft}
                />
              )}

              {!lead.doorKnockNote && !lead.smsDraft && !lead.emailDraft && (
                <p className="text-gray-500 text-center py-4">
                  No drafts generated yet. Run the pipeline to generate.
                </p>
              )}
            </div>
          </InfoCard>

          <InfoCard title="Data Source">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Source:</span>
                <span>{lead.dataSource}</span>
              </div>
              {lead.sourceFile && (
                <div className="flex justify-between">
                  <span className="text-gray-500">File:</span>
                  <span className="truncate max-w-[200px]">{lead.sourceFile}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Added:</span>
                <span>{dayjs(lead.createdAt).format('MMM D, YYYY')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Updated:</span>
                <span>{dayjs(lead.updatedAt).format('MMM D, YYYY')}</span>
              </div>
            </div>
          </InfoCard>
        </div>
      </div>
    </div>
  )
}
