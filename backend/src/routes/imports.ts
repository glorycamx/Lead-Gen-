import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { ingestCSVFile, detectColumnMappings } from '../services/ingestion.js';
import { parse } from 'csv-parse';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const importsDir = path.join(process.cwd(), '..', 'imports');
    if (!fs.existsSync(importsDir)) {
      fs.mkdirSync(importsDir, { recursive: true });
    }
    cb(null, importsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    cb(null, `${timestamp}_${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  }
});

// Upload and process CSV file
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    logger.info(`File uploaded: ${filePath}`);

    // Start ingestion
    const result = await ingestCSVFile(filePath);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error processing upload:', error);
    res.status(500).json({
      error: 'Failed to process file',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Preview CSV file (first N rows)
router.post('/preview', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const previewRows: any[] = [];
    let headers: string[] = [];
    let rowCount = 0;

    // Read first 10 rows
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
          to_line: 11 // Header + 10 rows
        }))
        .on('data', (row) => {
          if (headers.length === 0) {
            headers = Object.keys(row);
          }
          if (rowCount < 10) {
            previewRows.push(row);
          }
          rowCount++;
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Detect column mappings
    const mappings = detectColumnMappings(headers);

    // Count total rows
    const totalRows = await new Promise<number>((resolve, reject) => {
      let count = 0;
      fs.createReadStream(filePath)
        .pipe(parse({ skip_empty_lines: true }))
        .on('data', () => count++)
        .on('end', () => resolve(count - 1)) // Subtract header
        .on('error', reject);
    });

    res.json({
      fileName: req.file.originalname,
      filePath,
      totalRows,
      headers,
      detectedMappings: mappings,
      previewRows
    });
  } catch (error) {
    logger.error('Error previewing file:', error);
    res.status(500).json({ error: 'Failed to preview file' });
  }
});

// Process previously uploaded file with custom mapping
router.post('/process', async (req: Request, res: Response) => {
  try {
    const { filePath, columnMapping } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'filePath is required' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const result = await ingestCSVFile(filePath, columnMapping);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error processing file:', error);
    res.status(500).json({ error: 'Failed to process file' });
  }
});

// Get import batches
router.get('/batches', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [batches, total] = await Promise.all([
      prisma.importBatch.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.importBatch.count()
    ]);

    res.json({
      batches,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Error fetching import batches:', error);
    res.status(500).json({ error: 'Failed to fetch import batches' });
  }
});

// Get single batch details
router.get('/batches/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const batch = await prisma.importBatch.findUnique({
      where: { id }
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    // Parse JSON fields
    const batchWithParsed = {
      ...batch,
      columnMappingParsed: batch.columnMapping ? JSON.parse(batch.columnMapping) : null,
      errorsParsed: batch.errors ? JSON.parse(batch.errors) : null
    };

    res.json(batchWithParsed);
  } catch (error) {
    logger.error('Error fetching batch:', error);
    res.status(500).json({ error: 'Failed to fetch batch' });
  }
});

export default router;
