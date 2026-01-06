import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { configApi } from '../utils/api'
import { Config } from '../types'
import { useState, useEffect } from 'react'
import {
  Save,
  MapPin,
  Filter,
  Calculator,
  Clock,
  AlertCircle,
  Check
} from 'lucide-react'

function Section({
  title,
  icon: Icon,
  children
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)

  const { data: config, isLoading } = useQuery<Config>({
    queryKey: ['config'],
    queryFn: configApi.get
  })

  const { data: counties } = useQuery<string[]>({
    queryKey: ['counties'],
    queryFn: configApi.getCounties
  })

  const [formState, setFormState] = useState<Partial<Config>>({})

  useEffect(() => {
    if (config) {
      setFormState(config)
    }
  }, [config])

  const updateMutation = useMutation({
    mutationFn: configApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  })

  const handleSave = () => {
    updateMutation.mutate(formState)
  }

  const updateFilters = (key: string, value: any) => {
    setFormState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [key]: value
      }
    }))
  }

  const updateScoring = (key: string, value: number) => {
    setFormState(prev => ({
      ...prev,
      scoring: {
        ...prev.scoring,
        [key]: value
      }
    }))
  }

  const updateOutput = (key: string, value: any) => {
    setFormState(prev => ({
      ...prev,
      output: {
        ...prev.output,
        [key]: value
      }
    }))
  }

  const updateScheduler = (key: string, value: any) => {
    setFormState(prev => ({
      ...prev,
      scheduler: {
        ...prev.scheduler,
        [key]: value
      }
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-gray-500">Configure targeting, filters, and scoring</p>
        </div>
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saved ? (
            <>
              <Check className="w-5 h-5" />
              Saved!
            </>
          ) : updateMutation.isPending ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Targeting */}
      <Section title="Targeting" icon={MapPin}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Counties
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {counties?.map(county => (
                <label key={county} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formState.target_counties?.includes(county) || false}
                    onChange={(e) => {
                      const current = formState.target_counties || []
                      setFormState(prev => ({
                        ...prev,
                        target_counties: e.target.checked
                          ? [...current, county]
                          : current.filter(c => c !== county)
                      }))
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">{county}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Towns (comma-separated, overrides counties)
            </label>
            <input
              type="text"
              value={formState.target_towns?.join(', ') || ''}
              onChange={(e) => {
                const towns = e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                setFormState(prev => ({ ...prev, target_towns: towns.length > 0 ? towns : undefined }))
              }}
              placeholder="e.g., Haverhill, Methuen, Andover"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>
      </Section>

      {/* Filters */}
      <Section title="Filters" icon={Filter}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-medium text-gray-700">Property Type</h3>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formState.filters?.exclude_condos || false}
                onChange={(e) => updateFilters('exclude_condos', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Exclude Condos</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formState.filters?.prefer_single_family || false}
                onChange={(e) => updateFilters('prefer_single_family', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Prefer Single Family</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formState.filters?.prefer_owner_occupied || false}
                onChange={(e) => updateFilters('prefer_owner_occupied', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Prefer Owner Occupied</span>
            </label>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-gray-700">Year Built</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min Year</label>
                <input
                  type="number"
                  value={formState.filters?.min_year_built || ''}
                  onChange={(e) => updateFilters('min_year_built', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="e.g., 1900"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Year</label>
                <input
                  type="number"
                  value={formState.filters?.max_year_built || ''}
                  onChange={(e) => updateFilters('max_year_built', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="e.g., 2000"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-gray-700">Square Feet</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min Sqft</label>
                <input
                  type="number"
                  value={formState.filters?.min_sqft || ''}
                  onChange={(e) => updateFilters('min_sqft', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="e.g., 1000"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Sqft</label>
                <input
                  type="number"
                  value={formState.filters?.max_sqft || ''}
                  onChange={(e) => updateFilters('max_sqft', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="e.g., 5000"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-gray-700">Assessed Value</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min Value ($)</label>
                <input
                  type="number"
                  value={formState.filters?.min_assessed_value || ''}
                  onChange={(e) => updateFilters('min_assessed_value', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="e.g., 200000"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Value ($)</label>
                <input
                  type="number"
                  value={formState.filters?.max_assessed_value || ''}
                  onChange={(e) => updateFilters('max_assessed_value', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="e.g., 1000000"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Scoring */}
      <Section title="Scoring Weights" icon={Calculator}>
        <p className="text-sm text-gray-500 mb-4">
          Adjust the weight of each factor in the 0-100 fit score. Weights should roughly sum to 100.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Single Family (+{formState.scoring?.single_family_weight || 0})
            </label>
            <input
              type="range"
              min="0"
              max="30"
              value={formState.scoring?.single_family_weight || 20}
              onChange={(e) => updateScoring('single_family_weight', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Square Feet (+{formState.scoring?.sqft_weight || 0})
            </label>
            <input
              type="range"
              min="0"
              max="30"
              value={formState.scoring?.sqft_weight || 15}
              onChange={(e) => updateScoring('sqft_weight', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Home Age (+{formState.scoring?.age_weight || 0})
            </label>
            <input
              type="range"
              min="0"
              max="30"
              value={formState.scoring?.age_weight || 15}
              onChange={(e) => updateScoring('age_weight', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assessed Value (+{formState.scoring?.value_weight || 0})
            </label>
            <input
              type="range"
              min="0"
              max="30"
              value={formState.scoring?.value_weight || 15}
              onChange={(e) => updateScoring('value_weight', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Owner Occupied (+{formState.scoring?.owner_occupied_weight || 0})
            </label>
            <input
              type="range"
              min="0"
              max="30"
              value={formState.scoring?.owner_occupied_weight || 20}
              onChange={(e) => updateScoring('owner_occupied_weight', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Completeness (+{formState.scoring?.data_completeness_weight || 0})
            </label>
            <input
              type="range"
              min="0"
              max="20"
              value={formState.scoring?.data_completeness_weight || 10}
              onChange={(e) => updateScoring('data_completeness_weight', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </Section>

      {/* Output Settings */}
      <Section title="Output Settings" icon={Clock}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Leads Per Day
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min</label>
                <input
                  type="number"
                  value={formState.output?.min_leads_per_day || 25}
                  onChange={(e) => updateOutput('min_leads_per_day', parseInt(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max</label>
                <input
                  type="number"
                  value={formState.output?.max_leads_per_day || 150}
                  onChange={(e) => updateOutput('max_leads_per_day', parseInt(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scheduler
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formState.scheduler?.enabled || false}
                onChange={(e) => updateScheduler('enabled', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Enable daily scheduled runs</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Runs at 7:00 AM Eastern daily
            </p>
          </div>
        </div>
      </Section>

      {/* Compliance Note */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800">Compliance Reminder</h3>
            <p className="text-sm text-yellow-700 mt-1">
              This system generates outreach <strong>drafts only</strong>. All outreach must be
              reviewed by a human before sending. Never auto-send messages. Always comply with
              CAN-SPAM, TCPA, and Massachusetts consumer protection laws.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
