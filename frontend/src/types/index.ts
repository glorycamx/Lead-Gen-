export interface Lead {
  id: string
  createdAt: string
  updatedAt: string
  address: string
  streetNumber?: string
  streetName?: string
  unit?: string
  city: string
  state: string
  zipCode: string
  county?: string
  propertyType?: string
  yearBuilt?: number
  sqft?: number
  lotSizeAcres?: number
  bedrooms?: number
  bathrooms?: number
  assessedValue?: number
  lastSalePrice?: number
  lastSaleDate?: string
  ownerName?: string
  ownerMailingAddr?: string
  isOwnerOccupied?: boolean
  parcelId?: string
  mapLot?: string
  landUseCode?: string
  latitude?: number
  longitude?: number
  solarCandidate: boolean
  massSaveCandidate: boolean
  fitScore: number
  scoreBreakdown?: string
  scoreBreakdownParsed?: ScoreBreakdown
  scoreExplainer?: string
  doorKnockNote?: string
  smsDraft?: string
  emailDraft?: string
  suggestedAction?: string
  status: string
  statusUpdatedAt?: string
  statusNotes?: string
  dataSource: string
  sourceFile?: string
  importBatch?: string
  addressHash?: string
}

export interface ScoreBreakdown {
  propertyType: number
  sqft: number
  age: number
  value: number
  ownerOccupied: number
  dataCompleteness: number
  total: number
  factors: string[]
}

export interface ImportBatch {
  id: string
  createdAt: string
  fileName: string
  fileSize: number
  fileType: string
  sourceType: string
  status: string
  processedAt?: string
  totalRows: number
  validRows: number
  duplicateRows: number
  errorRows: number
  columnMapping?: string
  errors?: string
}

export interface ExportRun {
  id: string
  createdAt: string
  runDate: string
  runType: string
  status: string
  totalLeadsProcessed: number
  newLeadsAdded: number
  leadsExported: number
  csvFilePath?: string
  sqliteRowCount: number
  sheetsRowCount: number
  startedAt?: string
  completedAt?: string
  durationMs?: number
  errorMessage?: string
  logs?: string
}

export interface DashboardStats {
  totalLeads: number
  statusCounts: Record<string, number>
  programFit: {
    solarCandidates: number
    massSaveCandidates: number
    bothCandidates: number
  }
  scores: {
    average: number
    max: number
    min: number
    distribution: {
      high: number
      medium: number
      low: number
      veryLow: number
    }
  }
  topCities: { city: string; count: number }[]
  recentActivity: {
    imports: ImportBatch[]
    exports: ExportRun[]
  }
}

export interface Config {
  target_counties?: string[]
  target_towns?: string[]
  radius_zip?: string
  radius_miles?: number
  filters: {
    exclude_condos: boolean
    prefer_single_family: boolean
    prefer_older_homes: boolean
    min_year_built?: number
    max_year_built?: number
    prefer_higher_sqft: boolean
    min_sqft?: number
    max_sqft?: number
    prefer_higher_assessed_value: boolean
    min_assessed_value?: number
    max_assessed_value?: number
    prefer_owner_occupied: boolean
    exclude_hoa_if_detected: boolean
  }
  output: {
    min_leads_per_day: number
    max_leads_per_day: number
    export_csv: boolean
    export_sqlite: boolean
    export_google_sheets: boolean
  }
  scheduler: {
    enabled: boolean
    cron: string
    timezone: string
  }
  scoring: {
    single_family_weight: number
    multi_family_weight: number
    condo_weight: number
    sqft_weight: number
    age_weight: number
    value_weight: number
    owner_occupied_weight: number
    data_completeness_weight: number
  }
}

export type LeadStatus =
  | 'not_contacted'
  | 'knocked'
  | 'interested'
  | 'not_home'
  | 'not_qualified'
  | 'converted'
  | 'do_not_contact'

export const STATUS_LABELS: Record<LeadStatus, string> = {
  not_contacted: 'Not Contacted',
  knocked: 'Knocked',
  interested: 'Interested',
  not_home: 'Not Home',
  not_qualified: 'Not Qualified',
  converted: 'Converted',
  do_not_contact: 'Do Not Contact'
}

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  single_family: 'Single Family',
  multi_family: 'Multi Family',
  condo: 'Condo',
  other: 'Other'
}
