/**
 * Demo Server - Works without Prisma/Database
 * Shows the UI and core functionality with mock data
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Mock Data
const mockLeads = [
  {
    id: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    address: '123 Main Street',
    city: 'Haverhill',
    state: 'MA',
    zipCode: '01830',
    county: 'Essex',
    propertyType: 'single_family',
    yearBuilt: 1985,
    sqft: 2100,
    assessedValue: 450000,
    ownerName: 'John Smith',
    isOwnerOccupied: true,
    solarCandidate: true,
    massSaveCandidate: true,
    fitScore: 82,
    scoreBreakdown: JSON.stringify({
      propertyType: 20,
      sqft: 9,
      age: 15,
      value: 8,
      ownerOccupied: 20,
      dataCompleteness: 10,
      total: 82,
      factors: ['Single-family home (+20)', 'Built 1985 - prime for efficiency upgrades (+15)', 'Owner-occupied (+20)']
    }),
    scoreExplainer: 'Excellent prospect: Single-family home; Built 1985 - prime for efficiency upgrades; Owner-occupied',
    doorKnockNote: 'Good candidate for both solar and Mass Save. Your home was built in 1985, which often means great potential for efficiency upgrades.\n\nSuggested opener: Hi! I\'m helping neighbors in Haverhill learn about solar and efficiency rebates. Would you like to know what options might be available - no commitment needed?',
    smsDraft: 'Hi neighbor, this is [Your Name] helping Haverhill homeowners explore energy options. Interested in learning about solar or Mass Save incentives for your home? Reply STOP to opt out.',
    emailDraft: 'Subject: Energy Options for Haverhill Homeowners\n\nHi John,\n\nI\'m reaching out to homeowners in Haverhill who might be interested in exploring energy efficiency and solar options.\n\nBetween solar incentives and programs like Mass Save, there are often options worth exploring - though what\'s available depends on your specific situation.\n\nWould you be interested in a quick, no-pressure overview?\n\nBest,\n[Your Name]',
    suggestedAction: 'Knock',
    status: 'not_contacted',
    dataSource: 'user_csv'
  },
  {
    id: '2',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    address: '456 Oak Avenue',
    city: 'Methuen',
    state: 'MA',
    zipCode: '01844',
    county: 'Essex',
    propertyType: 'single_family',
    yearBuilt: 1962,
    sqft: 1850,
    assessedValue: 385000,
    ownerName: 'Jane Doe',
    isOwnerOccupied: false,
    solarCandidate: true,
    massSaveCandidate: true,
    fitScore: 68,
    scoreBreakdown: JSON.stringify({
      propertyType: 20,
      sqft: 6,
      age: 15,
      value: 6,
      ownerOccupied: 6,
      dataCompleteness: 10,
      total: 63,
      factors: ['Single-family home (+20)', 'Built 1962 - prime for efficiency upgrades (+15)']
    }),
    scoreExplainer: 'Good prospect: Single-family home; Built 1962 - prime for efficiency upgrades',
    doorKnockNote: 'Solar-focused prospect. Single-family homes often have the best options for solar installations.',
    suggestedAction: 'Mailer',
    status: 'not_contacted',
    dataSource: 'user_csv'
  },
  {
    id: '3',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    address: '789 Elm Court',
    city: 'Andover',
    state: 'MA',
    zipCode: '01810',
    county: 'Essex',
    propertyType: 'single_family',
    yearBuilt: 1978,
    sqft: 2400,
    assessedValue: 520000,
    ownerName: 'Robert Johnson',
    isOwnerOccupied: true,
    solarCandidate: true,
    massSaveCandidate: true,
    fitScore: 85,
    scoreBreakdown: JSON.stringify({
      propertyType: 20,
      sqft: 12,
      age: 15,
      value: 10,
      ownerOccupied: 20,
      dataCompleteness: 10,
      total: 87,
      factors: ['Single-family home (+20)', 'Large home: 2,400 sqft (+12)', 'Owner-occupied (+20)']
    }),
    scoreExplainer: 'Excellent prospect: Single-family home; Large home: 2,400 sqft; Owner-occupied',
    doorKnockNote: 'Excellent candidate for both programs. Larger homes like yours often see significant savings from energy improvements.',
    suggestedAction: 'Knock',
    status: 'interested',
    dataSource: 'user_csv'
  },
  {
    id: '4',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    address: '321 Pine Road',
    city: 'Lawrence',
    state: 'MA',
    zipCode: '01841',
    county: 'Essex',
    propertyType: 'multi_family',
    yearBuilt: 1955,
    sqft: 3200,
    assessedValue: 425000,
    ownerName: 'Maria Garcia',
    isOwnerOccupied: false,
    solarCandidate: true,
    massSaveCandidate: true,
    fitScore: 55,
    scoreBreakdown: JSON.stringify({
      propertyType: 10,
      sqft: 15,
      age: 15,
      value: 7,
      ownerOccupied: 6,
      dataCompleteness: 8,
      total: 61,
      factors: ['Multi-family home (+10)', 'Large home: 3,200 sqft (+15)', 'Built 1955 - prime for efficiency upgrades (+15)']
    }),
    scoreExplainer: 'Good prospect: Multi-family home; Large home; older building with upgrade potential',
    suggestedAction: 'Mailer',
    status: 'not_contacted',
    dataSource: 'user_csv'
  },
  {
    id: '5',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    address: '654 Maple Lane',
    city: 'Haverhill',
    state: 'MA',
    zipCode: '01835',
    county: 'Essex',
    propertyType: 'single_family',
    yearBuilt: 1992,
    sqft: 1950,
    assessedValue: 410000,
    ownerName: 'Michael Brown',
    isOwnerOccupied: true,
    solarCandidate: true,
    massSaveCandidate: true,
    fitScore: 72,
    scoreBreakdown: JSON.stringify({
      propertyType: 20,
      sqft: 7,
      age: 10,
      value: 7,
      ownerOccupied: 20,
      dataCompleteness: 9,
      total: 73,
      factors: ['Single-family home (+20)', 'Owner-occupied (+20)', 'Built 1992 - moderate upgrade potential (+10)']
    }),
    scoreExplainer: 'Good prospect: Single-family; Owner-occupied; moderate efficiency upgrade potential',
    suggestedAction: 'Knock',
    status: 'knocked',
    dataSource: 'user_csv'
  }
];

const mockImportBatches = [
  {
    id: 'batch1',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    fileName: 'essex_county_assessor_2024.csv',
    fileSize: 245000,
    fileType: 'csv',
    sourceType: 'user_upload',
    status: 'completed',
    totalRows: 150,
    validRows: 145,
    duplicateRows: 3,
    errorRows: 2
  }
];

const mockExportRuns = [
  {
    id: 'run1',
    createdAt: new Date().toISOString(),
    runDate: new Date().toISOString(),
    runType: 'manual',
    status: 'completed',
    totalLeadsProcessed: 145,
    newLeadsAdded: 145,
    leadsExported: 75,
    durationMs: 2340
  }
];

// File upload setup
const upload = multer({ dest: path.join(__dirname, '../../imports') });

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', mode: 'demo', timestamp: new Date().toISOString() });
});

// Leads
app.get('/api/leads', (req, res) => {
  const { page = '1', limit = '25', search, status, minScore, solarCandidate, massSaveCandidate } = req.query;

  let filtered = [...mockLeads];

  if (search) {
    const s = (search as string).toLowerCase();
    filtered = filtered.filter(l =>
      l.address.toLowerCase().includes(s) ||
      l.city.toLowerCase().includes(s) ||
      l.ownerName?.toLowerCase().includes(s)
    );
  }

  if (status) filtered = filtered.filter(l => l.status === status);
  if (minScore) filtered = filtered.filter(l => l.fitScore >= parseInt(minScore as string));
  if (solarCandidate === 'true') filtered = filtered.filter(l => l.solarCandidate);
  if (massSaveCandidate === 'true') filtered = filtered.filter(l => l.massSaveCandidate);

  filtered.sort((a, b) => b.fitScore - a.fitScore);

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const start = (pageNum - 1) * limitNum;
  const paged = filtered.slice(start, start + limitNum);

  res.json({
    leads: paged,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limitNum)
    }
  });
});

app.get('/api/leads/:id', (req, res) => {
  const lead = mockLeads.find(l => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  res.json({
    ...lead,
    scoreBreakdownParsed: JSON.parse(lead.scoreBreakdown)
  });
});

app.patch('/api/leads/:id/status', (req, res) => {
  const lead = mockLeads.find(l => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  lead.status = req.body.status;
  lead.updatedAt = new Date().toISOString();

  res.json(lead);
});

app.get('/api/leads/:id/history', (req, res) => {
  res.json([
    { id: '1', createdAt: new Date().toISOString(), leadId: req.params.id, oldStatus: 'not_contacted', newStatus: 'knocked', changedBy: 'user' }
  ]);
});

// Stats
app.get('/api/stats/dashboard', (req, res) => {
  res.json({
    totalLeads: mockLeads.length,
    statusCounts: {
      not_contacted: mockLeads.filter(l => l.status === 'not_contacted').length,
      knocked: mockLeads.filter(l => l.status === 'knocked').length,
      interested: mockLeads.filter(l => l.status === 'interested').length
    },
    programFit: {
      solarCandidates: mockLeads.filter(l => l.solarCandidate).length,
      massSaveCandidates: mockLeads.filter(l => l.massSaveCandidate).length,
      bothCandidates: mockLeads.filter(l => l.solarCandidate && l.massSaveCandidate).length
    },
    scores: {
      average: Math.round(mockLeads.reduce((sum, l) => sum + l.fitScore, 0) / mockLeads.length),
      max: Math.max(...mockLeads.map(l => l.fitScore)),
      min: Math.min(...mockLeads.map(l => l.fitScore)),
      distribution: {
        high: mockLeads.filter(l => l.fitScore >= 70).length,
        medium: mockLeads.filter(l => l.fitScore >= 50 && l.fitScore < 70).length,
        low: mockLeads.filter(l => l.fitScore >= 30 && l.fitScore < 50).length,
        veryLow: mockLeads.filter(l => l.fitScore < 30).length
      }
    },
    topCities: [
      { city: 'Haverhill', count: 2 },
      { city: 'Methuen', count: 1 },
      { city: 'Andover', count: 1 },
      { city: 'Lawrence', count: 1 }
    ],
    recentActivity: {
      imports: mockImportBatches,
      exports: mockExportRuns
    }
  });
});

// Imports
app.get('/api/imports/batches', (req, res) => {
  res.json({ batches: mockImportBatches, pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } });
});

app.post('/api/imports/upload', upload.single('file'), (req, res) => {
  res.json({
    success: true,
    batchId: 'new-batch',
    totalRows: 10,
    validRows: 9,
    duplicateRows: 1,
    errorRows: 0,
    errors: []
  });
});

// Exports
app.get('/api/exports/files', (req, res) => {
  res.json([
    { name: '2026-01-06.csv', path: '/exports/2026-01-06.csv', size: 15420, date: new Date().toISOString() }
  ]);
});

app.get('/api/exports/runs', (req, res) => {
  res.json({ runs: mockExportRuns, pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } });
});

app.get('/api/exports/preview', (req, res) => {
  res.json({ count: mockLeads.length, preview: mockLeads.slice(0, 3) });
});

app.post('/api/exports/quick', (req, res) => {
  res.json({ success: true, count: mockLeads.length, filename: '2026-01-06.csv', downloadUrl: '/api/exports/download/2026-01-06.csv' });
});

app.post('/api/exports/manual', (req, res) => {
  res.json({ success: true, filename: 'manual_export.csv', downloadUrl: '/api/exports/download/manual_export.csv' });
});

// Pipeline
app.get('/api/pipeline/status', (req, res) => {
  res.json({
    recentRuns: mockExportRuns,
    lastSuccessful: mockExportRuns[0],
    stats: { totalLeads: mockLeads.length, scoredLeads: mockLeads.length },
    scheduler: { running: true }
  });
});

app.post('/api/pipeline/run', (req, res) => {
  setTimeout(() => {
    res.json({
      success: true,
      result: {
        runId: 'demo-run',
        status: 'completed',
        stats: { filesIngested: 1, leadsIngested: 5, leadsScored: 5, notesGenerated: 5, leadsExported: 5 }
      }
    });
  }, 1000);
});

app.post('/api/pipeline/ingest', (req, res) => {
  res.json({ success: true, filesProcessed: 1, results: [] });
});

app.post('/api/pipeline/score', (req, res) => {
  res.json({ success: true, leadsScored: mockLeads.length });
});

app.post('/api/pipeline/generate-notes', (req, res) => {
  res.json({ success: true, notesGenerated: mockLeads.length });
});

// Config
app.get('/api/config', (req, res) => {
  res.json({
    target_counties: ['Essex', 'Middlesex'],
    filters: {
      exclude_condos: false,
      prefer_single_family: true,
      prefer_older_homes: true,
      min_sqft: 1000,
      min_assessed_value: 200000,
      prefer_owner_occupied: true
    },
    output: { min_leads_per_day: 25, max_leads_per_day: 150 },
    scheduler: { enabled: true, cron: '0 7 * * *', timezone: 'America/New_York' },
    scoring: {
      single_family_weight: 20,
      multi_family_weight: 10,
      condo_weight: 5,
      sqft_weight: 15,
      age_weight: 15,
      value_weight: 15,
      owner_occupied_weight: 20,
      data_completeness_weight: 10
    }
  });
});

app.put('/api/config', (req, res) => {
  res.json({ success: true, config: req.body });
});

app.patch('/api/config/targeting', (req, res) => res.json({ success: true }));
app.patch('/api/config/filters', (req, res) => res.json({ success: true }));
app.patch('/api/config/scoring', (req, res) => res.json({ success: true }));

app.get('/api/config/counties', (req, res) => {
  res.json(['Barnstable', 'Berkshire', 'Bristol', 'Dukes', 'Essex', 'Franklin', 'Hampden', 'Hampshire', 'Middlesex', 'Nantucket', 'Norfolk', 'Plymouth', 'Suffolk', 'Worcester']);
});

// Start server
const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
========================================
  MA Solar + Mass Save Lead Bot
  DEMO MODE
========================================

Backend running at: http://localhost:${PORT}
Frontend will be at: http://localhost:5173

Demo includes:
- ${mockLeads.length} sample leads with scores
- Scoring breakdown visualization
- AI-generated outreach drafts
- Status management
- Export simulation

Note: This is demo mode with mock data.
For production, set up the database with:
  npx prisma generate && npx prisma db push

========================================
`);
});
