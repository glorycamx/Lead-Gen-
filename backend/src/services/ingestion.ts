import { parse } from 'csv-parse';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { getConfig } from '../utils/config.js';

const prisma = new PrismaClient();

// Column mapping patterns for auto-detection
const COLUMN_MAPPINGS: Record<string, string[]> = {
  address: ['address', 'property_address', 'street_address', 'location', 'addr', 'full_address', 'property address', 'street address'],
  streetNumber: ['street_number', 'streetnumber', 'house_number', 'housenumber', 'st_num', 'house_num', 'street number', 'house number'],
  streetName: ['street_name', 'streetname', 'street', 'st_name', 'street name'],
  unit: ['unit', 'apt', 'apartment', 'unit_number', 'apt_number', 'suite', 'unit number'],
  city: ['city', 'town', 'municipality', 'city_town', 'city/town'],
  zipCode: ['zip', 'zipcode', 'zip_code', 'postal_code', 'postal', 'zip code', 'postal code'],
  county: ['county', 'county_name', 'county name'],
  propertyType: ['property_type', 'propertytype', 'use_code', 'land_use', 'type', 'use', 'property type', 'land use'],
  yearBuilt: ['year_built', 'yearbuilt', 'year', 'built_year', 'yr_built', 'year built', 'built year'],
  sqft: ['sqft', 'square_feet', 'squarefeet', 'living_area', 'total_sqft', 'gross_area', 'living_sqft', 'square feet', 'living area'],
  lotSizeAcres: ['lot_size', 'lotsize', 'lot_acres', 'acres', 'land_area', 'lot size'],
  bedrooms: ['bedrooms', 'beds', 'bed', 'num_bedrooms', 'bedroom_count'],
  bathrooms: ['bathrooms', 'baths', 'bath', 'num_bathrooms', 'bathroom_count'],
  assessedValue: ['assessed_value', 'assessedvalue', 'total_value', 'assessment', 'value', 'total_assessment', 'assessed value', 'total value'],
  lastSalePrice: ['sale_price', 'saleprice', 'last_sale', 'lastsale', 'sold_price', 'sale price', 'last sale price'],
  lastSaleDate: ['sale_date', 'saledate', 'last_sale_date', 'sold_date', 'sale date'],
  ownerName: ['owner', 'owner_name', 'ownername', 'owner1', 'owner_1', 'property_owner', 'owner name'],
  ownerMailingAddr: ['mailing_address', 'mailingaddress', 'owner_address', 'mail_addr', 'mailing_addr', 'mailing address', 'owner address'],
  parcelId: ['parcel_id', 'parcelid', 'parcel', 'pid', 'map_lot', 'map_par', 'parcel id'],
  mapLot: ['map_lot', 'maplot', 'map', 'lot', 'map lot'],
  landUseCode: ['land_use_code', 'use_code', 'usecode', 'luc', 'land use code'],
  latitude: ['latitude', 'lat', 'y_coord', 'y'],
  longitude: ['longitude', 'lon', 'lng', 'long', 'x_coord', 'x']
};

// Property type normalization
const PROPERTY_TYPE_MAP: Record<string, string> = {
  'single family': 'single_family',
  'single-family': 'single_family',
  'singlefamily': 'single_family',
  'sf': 'single_family',
  '101': 'single_family',
  'r1': 'single_family',
  'res1': 'single_family',
  'multi family': 'multi_family',
  'multi-family': 'multi_family',
  'multifamily': 'multi_family',
  'mf': 'multi_family',
  'two family': 'multi_family',
  'three family': 'multi_family',
  '104': 'multi_family',
  '105': 'multi_family',
  'condo': 'condo',
  'condominium': 'condo',
  '102': 'condo',
  'apartment': 'multi_family',
  'apt': 'multi_family'
};

export interface ImportResult {
  batchId: string;
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  errorRows: number;
  errors: string[];
}

export interface ColumnMapping {
  [fileColumn: string]: string;
}

// Detect column mappings from CSV headers
export function detectColumnMappings(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());

  for (const [dbField, patterns] of Object.entries(COLUMN_MAPPINGS)) {
    for (let i = 0; i < normalizedHeaders.length; i++) {
      const header = normalizedHeaders[i];
      if (patterns.some(pattern => header === pattern || header.includes(pattern))) {
        mapping[headers[i]] = dbField;
        break;
      }
    }
  }

  logger.info('Detected column mappings:', mapping);
  return mapping;
}

// Generate address hash for deduplication
function generateAddressHash(address: string, city: string, zipCode: string): string {
  const normalized = `${address.toLowerCase().trim()}-${city.toLowerCase().trim()}-${zipCode.trim()}`;
  return crypto.createHash('md5').update(normalized).digest('hex');
}

// Normalize property type
function normalizePropertyType(value: string | undefined | null): string | null {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  return PROPERTY_TYPE_MAP[normalized] || normalized;
}

// Parse CSV file
async function parseCSV(filePath: string): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = [];
    let headers: string[] = [];

    fs.createReadStream(filePath)
      .pipe(parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
      }))
      .on('data', (row: Record<string, string>) => {
        if (headers.length === 0) {
          headers = Object.keys(row);
        }
        rows.push(row);
      })
      .on('end', () => resolve({ headers, rows }))
      .on('error', reject);
  });
}

// Determine if owner-occupied based on mailing address
function determineOwnerOccupied(propertyAddr: string | null, mailingAddr: string | null): boolean | null {
  if (!propertyAddr || !mailingAddr) return null;

  // Normalize both addresses for comparison
  const normalizeAddr = (addr: string) => addr.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|way|boulevard|blvd/g, '');

  const normalizedProperty = normalizeAddr(propertyAddr);
  const normalizedMailing = normalizeAddr(mailingAddr);

  // Check if they share significant overlap
  if (normalizedProperty.length < 10 || normalizedMailing.length < 10) return null;

  return normalizedMailing.includes(normalizedProperty.slice(0, 15)) ||
    normalizedProperty.includes(normalizedMailing.slice(0, 15));
}

// Transform row to lead data
function transformRowToLead(
  row: Record<string, string>,
  mapping: ColumnMapping,
  sourceFile: string,
  batchId: string
): Prisma.LeadCreateInput | null {
  const getValue = (dbField: string): string | null => {
    for (const [fileCol, mappedField] of Object.entries(mapping)) {
      if (mappedField === dbField) {
        const value = row[fileCol];
        return value && value.trim() !== '' ? value.trim() : null;
      }
    }
    return null;
  };

  const address = getValue('address');
  const city = getValue('city');
  const zipCode = getValue('zipCode');

  // Address and city are required
  if (!address || !city) {
    return null;
  }

  // Use '00000' as placeholder if zip is missing
  const zip = zipCode || '00000';

  // Build full address if only components provided
  let fullAddress = address;
  const streetNum = getValue('streetNumber');
  const streetName = getValue('streetName');
  if (!address && streetNum && streetName) {
    fullAddress = `${streetNum} ${streetName}`;
  }

  const addressHash = generateAddressHash(fullAddress, city, zip);

  // Determine owner-occupied status
  const ownerMailingAddr = getValue('ownerMailingAddr');
  const isOwnerOccupied = determineOwnerOccupied(fullAddress, ownerMailingAddr);

  // Parse numeric values
  const parseNumber = (val: string | null): number | null => {
    if (!val) return null;
    const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? null : num;
  };

  const parseDate = (val: string | null): Date | null => {
    if (!val) return null;
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : date;
  };

  return {
    address: fullAddress,
    streetNumber: streetNum,
    streetName: streetName,
    unit: getValue('unit'),
    city: city,
    state: 'MA',
    zipCode: zip,
    county: getValue('county'),
    propertyType: normalizePropertyType(getValue('propertyType')),
    yearBuilt: parseNumber(getValue('yearBuilt')) as number | null,
    sqft: parseNumber(getValue('sqft')) as number | null,
    lotSizeAcres: parseNumber(getValue('lotSizeAcres')),
    bedrooms: parseNumber(getValue('bedrooms')) as number | null,
    bathrooms: parseNumber(getValue('bathrooms')),
    assessedValue: parseNumber(getValue('assessedValue')),
    lastSalePrice: parseNumber(getValue('lastSalePrice')),
    lastSaleDate: parseDate(getValue('lastSaleDate')),
    ownerName: getValue('ownerName'),
    ownerMailingAddr: ownerMailingAddr,
    isOwnerOccupied: isOwnerOccupied,
    parcelId: getValue('parcelId'),
    mapLot: getValue('mapLot'),
    landUseCode: getValue('landUseCode'),
    latitude: parseNumber(getValue('latitude')),
    longitude: parseNumber(getValue('longitude')),
    dataSource: 'user_csv',
    sourceFile: sourceFile,
    importBatch: batchId,
    addressHash: addressHash
  };
}

// Main ingestion function
export async function ingestCSVFile(filePath: string, customMapping?: ColumnMapping): Promise<ImportResult> {
  const fileName = path.basename(filePath);
  const fileStats = fs.statSync(filePath);

  logger.info(`Starting ingestion of ${fileName}`);

  // Create import batch record
  const batch = await prisma.importBatch.create({
    data: {
      fileName: fileName,
      fileSize: fileStats.size,
      fileType: 'csv',
      sourceType: 'user_upload',
      status: 'processing'
    }
  });

  const result: ImportResult = {
    batchId: batch.id,
    totalRows: 0,
    validRows: 0,
    duplicateRows: 0,
    errorRows: 0,
    errors: []
  };

  try {
    // Parse CSV
    const { headers, rows } = await parseCSV(filePath);
    result.totalRows = rows.length;

    // Detect or use custom mapping
    const mapping = customMapping || detectColumnMappings(headers);

    // Update batch with column mapping
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { columnMapping: JSON.stringify(mapping), totalRows: rows.length }
    });

    // Process rows
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const leadData = transformRowToLead(row, mapping, fileName, batch.id);

        if (!leadData) {
          result.errorRows++;
          result.errors.push(`Row ${i + 2}: Missing required fields (address, city)`);
          continue;
        }

        // Check for duplicate
        const existing = await prisma.lead.findUnique({
          where: { addressHash: leadData.addressHash! }
        });

        if (existing) {
          // Update existing record with new data
          await prisma.lead.update({
            where: { id: existing.id },
            data: {
              ...leadData,
              addressHash: undefined, // Don't update the hash
              updatedAt: new Date()
            }
          });
          result.duplicateRows++;
        } else {
          // Create new lead
          await prisma.lead.create({ data: leadData });
          result.validRows++;
        }
      } catch (error) {
        result.errorRows++;
        const msg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Row ${i + 2}: ${msg}`);
      }
    }

    // Update batch status
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: 'completed',
        processedAt: new Date(),
        validRows: result.validRows,
        duplicateRows: result.duplicateRows,
        errorRows: result.errorRows,
        errors: result.errors.length > 0 ? JSON.stringify(result.errors.slice(0, 100)) : null
      }
    });

    logger.info(`Ingestion complete: ${result.validRows} new, ${result.duplicateRows} updated, ${result.errorRows} errors`);
    return result;

  } catch (error) {
    logger.error('Ingestion failed:', error);

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: 'failed',
        errors: JSON.stringify([error instanceof Error ? error.message : 'Unknown error'])
      }
    });

    throw error;
  }
}

// Scan imports directory and ingest new files
export async function scanAndIngestImports(): Promise<ImportResult[]> {
  const config = getConfig();
  const importsDir = path.resolve(config.data_sources.user_csv.import_directory);

  if (!fs.existsSync(importsDir)) {
    fs.mkdirSync(importsDir, { recursive: true });
    logger.info(`Created imports directory: ${importsDir}`);
    return [];
  }

  const files = fs.readdirSync(importsDir).filter(f => f.endsWith('.csv'));
  const results: ImportResult[] = [];

  for (const file of files) {
    const filePath = path.join(importsDir, file);

    // Check if already processed
    const existing = await prisma.importBatch.findFirst({
      where: {
        fileName: file,
        status: 'completed'
      }
    });

    if (existing) {
      logger.info(`Skipping already processed file: ${file}`);
      continue;
    }

    try {
      const result = await ingestCSVFile(filePath);
      results.push(result);

      // Move to processed directory
      const processedDir = path.join(importsDir, 'processed');
      if (!fs.existsSync(processedDir)) {
        fs.mkdirSync(processedDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      fs.renameSync(filePath, path.join(processedDir, `${timestamp}_${file}`));

    } catch (error) {
      logger.error(`Failed to ingest ${file}:`, error);
    }
  }

  return results;
}

// Apply filters from config
export async function applyConfigFilters(): Promise<number> {
  const config = getConfig();
  const filters = config.filters;

  // Build where clause
  const where: Prisma.LeadWhereInput = {
    state: 'MA'
  };

  // County/Town filtering
  if (config.target_towns && config.target_towns.length > 0) {
    where.city = { in: config.target_towns };
  } else if (config.target_counties && config.target_counties.length > 0) {
    where.county = { in: config.target_counties };
  }

  // Property type filtering
  if (filters.exclude_condos) {
    where.NOT = { propertyType: 'condo' };
  }

  // Year built filtering
  if (filters.min_year_built || filters.max_year_built) {
    where.yearBuilt = {};
    if (filters.min_year_built) where.yearBuilt.gte = filters.min_year_built;
    if (filters.max_year_built) where.yearBuilt.lte = filters.max_year_built;
  }

  // Sqft filtering
  if (filters.min_sqft || filters.max_sqft) {
    where.sqft = {};
    if (filters.min_sqft) where.sqft.gte = filters.min_sqft;
    if (filters.max_sqft) where.sqft.lte = filters.max_sqft;
  }

  // Assessed value filtering
  if (filters.min_assessed_value || filters.max_assessed_value) {
    where.assessedValue = {};
    if (filters.min_assessed_value) where.assessedValue.gte = filters.min_assessed_value;
    if (filters.max_assessed_value) where.assessedValue.lte = filters.max_assessed_value;
  }

  // Count matching leads
  const count = await prisma.lead.count({ where });
  logger.info(`Leads matching filters: ${count}`);

  return count;
}
