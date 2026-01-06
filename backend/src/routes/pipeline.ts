import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { runPipeline, getPipelineStatus } from '../services/pipeline.js';
import { triggerManualRun, getSchedulerStatus } from '../services/scheduler.js';
import { scoreAllLeads } from '../services/scoring.js';
import { generateAllNotes } from '../services/ai-notes.js';
import { scanAndIngestImports } from '../services/ingestion.js';

const router = Router();

// Get pipeline status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await getPipelineStatus();
    const schedulerStatus = getSchedulerStatus();

    res.json({
      ...status,
      scheduler: schedulerStatus
    });
  } catch (error) {
    logger.error('Error fetching pipeline status:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline status' });
  }
});

// Trigger manual pipeline run
router.post('/run', async (req: Request, res: Response) => {
  try {
    logger.info('Manual pipeline run requested');

    // Run asynchronously
    const result = await runPipeline('manual');

    res.json({
      success: true,
      result
    });
  } catch (error) {
    logger.error('Pipeline run failed:', error);
    res.status(500).json({
      error: 'Pipeline run failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Run individual pipeline steps
router.post('/ingest', async (req: Request, res: Response) => {
  try {
    logger.info('Manual ingestion requested');
    const results = await scanAndIngestImports();

    res.json({
      success: true,
      filesProcessed: results.length,
      results
    });
  } catch (error) {
    logger.error('Ingestion failed:', error);
    res.status(500).json({ error: 'Ingestion failed' });
  }
});

router.post('/score', async (req: Request, res: Response) => {
  try {
    logger.info('Manual scoring requested');
    const count = await scoreAllLeads();

    res.json({
      success: true,
      leadsScored: count
    });
  } catch (error) {
    logger.error('Scoring failed:', error);
    res.status(500).json({ error: 'Scoring failed' });
  }
});

router.post('/generate-notes', async (req: Request, res: Response) => {
  try {
    logger.info('Manual notes generation requested');
    const count = await generateAllNotes();

    res.json({
      success: true,
      notesGenerated: count
    });
  } catch (error) {
    logger.error('Notes generation failed:', error);
    res.status(500).json({ error: 'Notes generation failed' });
  }
});

export default router;
