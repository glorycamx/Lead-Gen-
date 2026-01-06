import { stringify } from 'csv-stringify/sync';
import fs from 'fs';
import path from 'path';
import { PrismaClient, Lead } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { getConfig } from '../utils/config.js';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const prisma = new PrismaClient();

export interface ExportResult {
  csvPath: string | null;
  csvRows: number;
  sqliteRows: number;
  sheetsRows: number;
}

// Ensure exports directory exists
function ensureExportsDir(): string {
  const exportsDir = path.join(process.cwd(), '..', 'exports');
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }
  return exportsDir;
}

// Format lead for CSV export
function formatLeadForCSV(lead: Lead): Record<string, any> {
  return {
    // Basic Info
    address: lead.address,
    city: lead.city,
    state: lead.state,
    zip_code: lead.zipCode,
    county: lead.county || '',

    // Property Info
    property_type: lead.propertyType || '',
    year_built: lead.yearBuilt || '',
    sqft: lead.sqft || '',
    lot_size_acres: lead.lotSizeAcres || '',
    bedrooms: lead.bedrooms || '',
    bathrooms: lead.bathrooms || '',
    assessed_value: lead.assessedValue || '',

    // Owner Info
    owner_name: lead.ownerName || '',
    owner_occupied: lead.isOwnerOccupied === true ? 'Yes' : lead.isOwnerOccupied === false ? 'No' : 'Unknown',

    // Program Fit
    solar_candidate: lead.solarCandidate ? 'Yes' : 'No',
    mass_save_candidate: lead.massSaveCandidate ? 'Yes' : 'No',

    // Scoring
    fit_score: lead.fitScore,
    score_explanation: lead.scoreExplainer || '',

    // Suggested Action
    suggested_action: lead.suggestedAction || '',

    // AI Notes
    door_knock_note: lead.doorKnockNote || '',
    sms_draft: lead.smsDraft || '',
    email_draft: lead.emailDraft || '',

    // Status
    status: lead.status,

    // Metadata
    data_source: lead.dataSource,
    created_at: lead.createdAt.toISOString(),
    updated_at: lead.updatedAt.toISOString()
  };
}

// Export leads to CSV
export async function exportToCSV(leads: Lead[], filename?: string): Promise<string> {
  const exportsDir = ensureExportsDir();
  const config = getConfig();

  // Generate filename with date
  const date = dayjs().tz(config.scheduler.timezone).format('YYYY-MM-DD');
  const csvFilename = filename || `${date}.csv`;
  const csvPath = path.join(exportsDir, csvFilename);

  // Format leads
  const csvData = leads.map(formatLeadForCSV);

  // Generate CSV
  const csv = stringify(csvData, {
    header: true,
    columns: Object.keys(csvData[0] || {})
  });

  // Write file
  fs.writeFileSync(csvPath, csv, 'utf8');

  logger.info(`Exported ${leads.length} leads to ${csvPath}`);
  return csvPath;
}

// Get daily export leads
export async function getDailyExportLeads(): Promise<Lead[]> {
  const config = getConfig();
  const output = config.output;
  const filters = config.filters;

  // Build where clause
  const where: any = {
    state: 'MA',
    fitScore: { gte: 1 } // Only export scored leads
  };

  // Apply targeting
  if (config.target_towns && config.target_towns.length > 0) {
    // Case-insensitive town matching
    where.OR = config.target_towns.map(town => ({
      city: { equals: town, mode: 'insensitive' }
    }));
  } else if (config.target_counties && config.target_counties.length > 0) {
    where.county = { in: config.target_counties };
  }

  // Apply filters
  if (filters.exclude_condos) {
    where.NOT = { ...where.NOT, propertyType: 'condo' };
  }

  if (filters.prefer_owner_occupied) {
    // Prefer owner-occupied but don't exclude others
    // This is handled by scoring, not filtering
  }

  // Get leads sorted by score, limited by config
  const leads = await prisma.lead.findMany({
    where,
    orderBy: { fitScore: 'desc' },
    take: output.max_leads_per_day
  });

  // Ensure minimum leads
  if (leads.length < output.min_leads_per_day) {
    logger.warn(`Only found ${leads.length} leads, below minimum of ${output.min_leads_per_day}`);
  }

  return leads;
}

// Run full export pipeline
export async function runDailyExport(): Promise<ExportResult> {
  const config = getConfig();
  const startTime = Date.now();

  logger.info('Starting daily export');

  // Create export run record
  const exportRun = await prisma.exportRun.create({
    data: {
      runDate: new Date(),
      runType: 'scheduled',
      status: 'running',
      startedAt: new Date()
    }
  });

  const result: ExportResult = {
    csvPath: null,
    csvRows: 0,
    sqliteRows: 0,
    sheetsRows: 0
  };

  try {
    // Get leads for export
    const leads = await getDailyExportLeads();
    result.sqliteRows = leads.length;

    logger.info(`Found ${leads.length} leads for export`);

    // Export to CSV
    if (config.output.export_csv && leads.length > 0) {
      result.csvPath = await exportToCSV(leads);
      result.csvRows = leads.length;
    }

    // Google Sheets export (placeholder for future implementation)
    if (config.output.export_google_sheets && config.google_sheets?.enabled) {
      // TODO: Implement Google Sheets integration
      logger.info('Google Sheets export not yet implemented');
    }

    // Update export run record
    const duration = Date.now() - startTime;
    await prisma.exportRun.update({
      where: { id: exportRun.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        durationMs: duration,
        leadsExported: leads.length,
        csvFilePath: result.csvPath,
        sqliteRowCount: result.sqliteRows,
        sheetsRowCount: result.sheetsRows
      }
    });

    logger.info(`Export completed in ${duration}ms: ${leads.length} leads`);
    return result;

  } catch (error) {
    // Update export run with error
    await prisma.exportRun.update({
      where: { id: exportRun.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      }
    });

    logger.error('Export failed:', error);
    throw error;
  }
}

// Get recent exports
export async function getRecentExports(limit: number = 10) {
  return prisma.exportRun.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

// Get export files list
export function getExportFiles(): { name: string; path: string; size: number; date: Date }[] {
  const exportsDir = ensureExportsDir();

  if (!fs.existsSync(exportsDir)) {
    return [];
  }

  const files = fs.readdirSync(exportsDir)
    .filter(f => f.endsWith('.csv'))
    .map(f => {
      const fullPath = path.join(exportsDir, f);
      const stats = fs.statSync(fullPath);
      return {
        name: f,
        path: fullPath,
        size: stats.size,
        date: stats.mtime
      };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  return files;
}

// Manual export with custom filters
export async function manualExport(options: {
  minScore?: number;
  maxLeads?: number;
  status?: string;
  solarOnly?: boolean;
  massSaveOnly?: boolean;
}): Promise<string> {
  const where: any = {
    state: 'MA'
  };

  if (options.minScore) {
    where.fitScore = { gte: options.minScore };
  }

  if (options.status) {
    where.status = options.status;
  }

  if (options.solarOnly) {
    where.solarCandidate = true;
  }

  if (options.massSaveOnly) {
    where.massSaveCandidate = true;
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { fitScore: 'desc' },
    take: options.maxLeads || 500
  });

  const timestamp = dayjs().format('YYYY-MM-DD_HHmmss');
  const filename = `manual_export_${timestamp}.csv`;

  return exportToCSV(leads, filename);
}
