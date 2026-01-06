# Database Schema

The Massachusetts Solar + Mass Save Lead Bot uses SQLite with Prisma ORM.

## Tables

### Lead

The main table storing all prospect information.

| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| createdAt | DateTime | Record creation timestamp |
| updatedAt | DateTime | Last update timestamp |
| **Address Fields** | | |
| address | String | Full street address |
| streetNumber | String? | House number |
| streetName | String? | Street name |
| unit | String? | Unit/apt number |
| city | String | City/town |
| state | String | State (default: MA) |
| zipCode | String | ZIP code |
| county | String? | County name |
| **Property Fields** | | |
| propertyType | String? | single_family, multi_family, condo |
| yearBuilt | Int? | Year constructed |
| sqft | Int? | Square footage |
| lotSizeAcres | Float? | Lot size in acres |
| bedrooms | Int? | Number of bedrooms |
| bathrooms | Float? | Number of bathrooms |
| assessedValue | Float? | Total assessed value |
| lastSalePrice | Float? | Most recent sale price |
| lastSaleDate | DateTime? | Most recent sale date |
| **Owner Fields** | | |
| ownerName | String? | Property owner name |
| ownerMailingAddr | String? | Owner mailing address |
| isOwnerOccupied | Boolean? | Derived: mailing matches property |
| **Parcel Fields** | | |
| parcelId | String? | Assessor parcel ID |
| mapLot | String? | Map/lot reference |
| landUseCode | String? | Land use classification |
| **Geocoding** | | |
| latitude | Float? | GPS latitude |
| longitude | Float? | GPS longitude |
| **Program Fit** | | |
| solarCandidate | Boolean | Eligible for solar |
| massSaveCandidate | Boolean | Eligible for Mass Save |
| **Scoring** | | |
| fitScore | Int | 0-100 composite score |
| scoreBreakdown | String? | JSON of factor scores |
| scoreExplainer | String? | Human-readable explanation |
| **AI Content** | | |
| doorKnockNote | String? | AI-generated door knock script |
| smsDraft | String? | AI-generated SMS draft |
| emailDraft | String? | AI-generated email draft |
| suggestedAction | String? | Knock, Mailer, Wait, Skip |
| **Status** | | |
| status | String | Lead status (default: not_contacted) |
| statusUpdatedAt | DateTime? | When status last changed |
| statusNotes | String? | Notes about status |
| **Source** | | |
| dataSource | String | user_csv, open_data, enrichment |
| sourceFile | String? | Original import filename |
| importBatch | String? | Batch ID reference |
| addressHash | String? | MD5 hash for deduplication (unique) |

**Indexes:** city, zipCode, county, fitScore, status, solarCandidate, massSaveCandidate, createdAt

---

### ExportRun

Tracks each pipeline/export execution.

| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| createdAt | DateTime | Record creation timestamp |
| runDate | DateTime | Date of the run |
| runType | String | scheduled, manual |
| status | String | running, completed, failed |
| totalLeadsProcessed | Int | Leads processed |
| newLeadsAdded | Int | New leads ingested |
| leadsExported | Int | Leads in export |
| csvFilePath | String? | Path to export CSV |
| sqliteRowCount | Int | DB rows affected |
| sheetsRowCount | Int | Google Sheets rows |
| startedAt | DateTime? | Run start time |
| completedAt | DateTime? | Run end time |
| durationMs | Int? | Duration in milliseconds |
| errorMessage | String? | Error message if failed |
| errorStack | String? | Error stack trace |
| logs | String? | JSON array of log entries |

**Indexes:** runDate, status

---

### ImportBatch

Tracks CSV import operations.

| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| createdAt | DateTime | Record creation timestamp |
| fileName | String | Original filename |
| fileSize | Int | File size in bytes |
| fileType | String | csv, xlsx |
| sourceType | String | user_upload, open_data |
| status | String | pending, processing, completed, failed |
| processedAt | DateTime? | Processing completion time |
| totalRows | Int | Total rows in file |
| validRows | Int | Successfully imported rows |
| duplicateRows | Int | Updated existing records |
| errorRows | Int | Failed rows |
| columnMapping | String? | JSON of column mappings |
| errors | String? | JSON array of errors |

**Indexes:** status, createdAt

---

### DataSourceStatus

Tracks health of data sources.

| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| createdAt | DateTime | Record creation timestamp |
| updatedAt | DateTime | Last update timestamp |
| sourceName | String | Source identifier (unique) |
| sourceType | String | open_data, user_csv |
| sourceUrl | String? | Source URL if applicable |
| isHealthy | Boolean | Current health status |
| lastCheckAt | DateTime? | Last health check |
| lastSuccessAt | DateTime? | Last successful fetch |
| lastErrorAt | DateTime? | Last error occurrence |
| errorMessage | String? | Latest error message |
| cacheFilePath | String? | Path to cached data |
| cacheUpdatedAt | DateTime? | Cache last updated |
| cacheRowCount | Int | Records in cache |
| towns | String? | JSON array of covered towns |
| records | Int | Total records |

---

### ConfigSnapshot

Stores configuration at time of runs for reproducibility.

| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| createdAt | DateTime | Record creation timestamp |
| configYaml | String | Full config file contents |
| configHash | String | MD5 hash of config |
| exportRunId | String? | Associated export run |

**Indexes:** createdAt

---

### StatusHistory

Audit trail for lead status changes.

| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| createdAt | DateTime | Record creation timestamp |
| leadId | String | Reference to Lead |
| oldStatus | String | Previous status |
| newStatus | String | New status |
| notes | String? | Change notes |
| changedBy | String? | user, system |

**Indexes:** leadId, createdAt

---

## Lead Status Values

| Status | Description |
|--------|-------------|
| not_contacted | Default - not yet contacted |
| knocked | Door knock attempted |
| interested | Expressed interest |
| not_home | Not home during visit |
| not_qualified | Does not meet criteria |
| converted | Became a customer |
| do_not_contact | Requested no contact |

---

## Suggested Action Values

| Action | Description |
|--------|-------------|
| Knock | High priority - door knock recommended |
| Mailer | Medium priority - send mailer |
| Wait | Low priority - wait for more data |
| Skip | Very low priority - skip for now |

---

## Migrations

Run migrations with:

```bash
cd backend
npx prisma migrate dev
```

View database with:

```bash
npx prisma studio
```
