# Massachusetts Solar + Mass Save Lead Bot

A compliant lead generation system for residential solar and Mass Save energy efficiency programs in Massachusetts.

## Features

- **CSV Import**: Upload assessor data exports and CRM data
- **Automated Scoring**: 0-100 fit score based on property characteristics
- **Program Fit Flags**: Identifies solar and Mass Save candidates
- **AI-Generated Drafts**: Door-knock notes, SMS, and email templates (human approval required)
- **Daily Scheduling**: Automatic daily runs with CSV exports
- **Dashboard**: View, filter, and manage leads with status tracking

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd Lead-Gen-

# Install backend dependencies
cd backend
npm install

# Set up the database
cp ../.env.example .env
npx prisma generate
npx prisma db push

# Install frontend dependencies
cd ../frontend
npm install
```

### Running the Application

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

### First Steps

1. **Configure targeting** in `config.yaml` or via Settings page
2. **Upload CSV** with assessor data via Imports page
3. **Run pipeline** to score leads and generate notes
4. **Export** ranked leads to CSV

## Project Structure

```
Lead-Gen-/
├── config.yaml          # Main configuration file
├── .env.example         # Environment variables template
├── imports/             # Drop CSV files here for auto-ingestion
├── exports/             # Daily exports saved here
├── backend/
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic
│   │   └── utils/       # Helpers
│   └── prisma/          # Database schema
├── frontend/
│   ├── src/
│   │   ├── pages/       # React pages
│   │   └── components/  # React components
└── docs/                # Additional documentation
```

## Configuration

Edit `config.yaml` to customize:

### Targeting
```yaml
# Option 1: Target by county
target_counties:
  - Essex
  - Middlesex

# Option 2: Target by town (overrides counties)
target_towns:
  - Haverhill
  - Methuen
```

### Filters
```yaml
filters:
  exclude_condos: false
  prefer_single_family: true
  max_year_built: 2000     # Older homes = more efficiency opportunities
  min_sqft: 1000
  min_assessed_value: 200000
```

### Output
```yaml
output:
  min_leads_per_day: 25
  max_leads_per_day: 150
```

## CSV Import Format

### Required Columns
- `address` - Property street address
- `city` - City/town name

### Recommended Columns
- `zip_code` - ZIP code
- `property_type` - single_family, multi_family, condo
- `year_built` - Year constructed
- `sqft` - Square footage
- `assessed_value` - Total assessed value
- `owner_name` - Property owner name
- `mailing_address` - Owner mailing address (for owner-occupied detection)

### Example CSV
```csv
address,city,zip_code,property_type,year_built,sqft,assessed_value,owner_name,mailing_address
123 Main St,Haverhill,01830,single_family,1985,2100,450000,John Smith,123 Main St Haverhill MA 01830
456 Oak Ave,Methuen,01844,multi_family,1960,3200,550000,Jane Doe,789 Other St Boston MA 02101
```

## Scoring Formula

Leads receive a 0-100 score based on configurable weights:

| Factor | Default Weight | Description |
|--------|---------------|-------------|
| Property Type | 20 | Single family scores highest |
| Square Feet | 15 | Larger homes score higher |
| Home Age | 15 | 1950-2000 homes score highest (efficiency upgrade potential) |
| Assessed Value | 15 | Higher value = more financing capacity |
| Owner Occupied | 20 | Owner-occupied properties preferred |
| Data Completeness | 10 | More complete data = higher confidence |

## API Endpoints

### Leads
- `GET /api/leads` - List leads with filtering
- `GET /api/leads/:id` - Get lead details
- `PATCH /api/leads/:id/status` - Update lead status

### Imports
- `POST /api/imports/upload` - Upload CSV file
- `GET /api/imports/batches` - List import history

### Exports
- `GET /api/exports/files` - List export files
- `GET /api/exports/download/:filename` - Download CSV
- `POST /api/exports/quick` - Create quick export

### Pipeline
- `POST /api/pipeline/run` - Run full pipeline
- `GET /api/pipeline/status` - Get pipeline status

## Deployment

### Docker (Coming Soon)

```bash
docker-compose up -d
```

### Manual Deployment

1. Build frontend: `cd frontend && npm run build`
2. Build backend: `cd backend && npm run build`
3. Set production environment variables
4. Run: `cd backend && npm start`

## Compliance

This system is designed with compliance in mind:

**What it DOES:**
- Processes user-provided assessor data
- Generates outreach drafts for human review
- Exports ranked leads for manual follow-up

**What it does NOT do:**
- Scrape private data
- Bypass login/paywall/CAPTCHA
- Auto-send SMS, email, or robocalls
- Infer roof/solar viability from imagery
- Store or transmit PII without consent

See [COMPLIANCE.md](./docs/COMPLIANCE.md) for full details.

## License

Private - All rights reserved

## Support

For issues and feature requests, please open a GitHub issue.
