import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { getExportFiles, manualExport, getDailyExportLeads, exportToCSV } from '../services/export.js';

const router = Router();
const prisma = new PrismaClient();

// Get list of export files
router.get('/files', async (req: Request, res: Response) => {
  try {
    const files = getExportFiles();
    res.json(files);
  } catch (error) {
    logger.error('Error fetching export files:', error);
    res.status(500).json({ error: 'Failed to fetch export files' });
  }
});

// Download export file
router.get('/download/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;

    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const exportsDir = path.join(process.cwd(), '..', 'exports');
    const filePath = path.join(exportsDir, sanitizedFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath, sanitizedFilename);
  } catch (error) {
    logger.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Create manual export
router.post('/manual', async (req: Request, res: Response) => {
  try {
    const { minScore, maxLeads, status, solarOnly, massSaveOnly } = req.body;

    const csvPath = await manualExport({
      minScore: minScore ? parseInt(minScore) : undefined,
      maxLeads: maxLeads ? parseInt(maxLeads) : undefined,
      status,
      solarOnly,
      massSaveOnly
    });

    const filename = path.basename(csvPath);

    res.json({
      success: true,
      filename,
      downloadUrl: `/api/exports/download/${filename}`
    });
  } catch (error) {
    logger.error('Error creating manual export:', error);
    res.status(500).json({ error: 'Failed to create export' });
  }
});

// Get export runs history
router.get('/runs', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [runs, total] = await Promise.all([
      prisma.exportRun.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.exportRun.count()
    ]);

    res.json({
      runs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Error fetching export runs:', error);
    res.status(500).json({ error: 'Failed to fetch export runs' });
  }
});

// Get single export run details
router.get('/runs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const run = await prisma.exportRun.findUnique({
      where: { id }
    });

    if (!run) {
      return res.status(404).json({ error: 'Export run not found' });
    }

    // Parse logs if exists
    const runWithParsed = {
      ...run,
      logsParsed: run.logs ? JSON.parse(run.logs) : null
    };

    res.json(runWithParsed);
  } catch (error) {
    logger.error('Error fetching export run:', error);
    res.status(500).json({ error: 'Failed to fetch export run' });
  }
});

// Preview what would be exported with current config
router.get('/preview', async (req: Request, res: Response) => {
  try {
    const leads = await getDailyExportLeads();

    res.json({
      count: leads.length,
      preview: leads.slice(0, 10).map(lead => ({
        id: lead.id,
        address: lead.address,
        city: lead.city,
        fitScore: lead.fitScore,
        solarCandidate: lead.solarCandidate,
        massSaveCandidate: lead.massSaveCandidate,
        suggestedAction: lead.suggestedAction
      }))
    });
  } catch (error) {
    logger.error('Error previewing export:', error);
    res.status(500).json({ error: 'Failed to preview export' });
  }
});

// Quick export current view
router.post('/quick', async (req: Request, res: Response) => {
  try {
    const leads = await getDailyExportLeads();

    if (leads.length === 0) {
      return res.status(400).json({ error: 'No leads to export' });
    }

    const csvPath = await exportToCSV(leads);
    const filename = path.basename(csvPath);

    res.json({
      success: true,
      count: leads.length,
      filename,
      downloadUrl: `/api/exports/download/${filename}`
    });
  } catch (error) {
    logger.error('Error creating quick export:', error);
    res.status(500).json({ error: 'Failed to create export' });
  }
});

export default router;
