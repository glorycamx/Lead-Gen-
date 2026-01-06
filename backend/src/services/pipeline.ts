import { PrismaClient } from '@prisma/client';
import { logger, createPipelineLogger } from '../utils/logger.js';
import { getConfig, getConfigYaml } from '../utils/config.js';
import { scanAndIngestImports } from './ingestion.js';
import { scoreAllLeads } from './scoring.js';
import { generateAllNotes } from './ai-notes.js';
import { runDailyExport } from './export.js';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface PipelineResult {
  runId: string;
  runType: 'scheduled' | 'manual';
  status: 'completed' | 'failed';
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  stats: {
    filesIngested: number;
    leadsIngested: number;
    leadsScored: number;
    notesGenerated: number;
    leadsExported: number;
    csvPath: string | null;
  };
  errors: string[];
}

export async function runPipeline(runType: 'scheduled' | 'manual' = 'manual'): Promise<PipelineResult> {
  const runId = crypto.randomUUID().slice(0, 8);
  const pipelineLogger = createPipelineLogger(runId);
  const startedAt = new Date();

  pipelineLogger.info(`Pipeline run started: ${runType}`);

  const result: PipelineResult = {
    runId,
    runType,
    status: 'completed',
    startedAt,
    completedAt: new Date(),
    durationMs: 0,
    stats: {
      filesIngested: 0,
      leadsIngested: 0,
      leadsScored: 0,
      notesGenerated: 0,
      leadsExported: 0,
      csvPath: null
    },
    errors: []
  };

  // Create export run record
  const exportRun = await prisma.exportRun.create({
    data: {
      runDate: new Date(),
      runType,
      status: 'running',
      startedAt
    }
  });

  // Save config snapshot
  const configYaml = getConfigYaml();
  await prisma.configSnapshot.create({
    data: {
      configYaml,
      configHash: crypto.createHash('md5').update(configYaml).digest('hex'),
      exportRunId: exportRun.id
    }
  });

  try {
    // Step 1: Ingest new CSV files
    pipelineLogger.info('Step 1: Ingesting CSV files');
    const ingestionResults = await scanAndIngestImports();
    result.stats.filesIngested = ingestionResults.length;
    result.stats.leadsIngested = ingestionResults.reduce((sum, r) => sum + r.validRows, 0);
    pipelineLogger.info(`Ingested ${result.stats.filesIngested} files, ${result.stats.leadsIngested} new leads`);

    // Step 2: Score all leads
    pipelineLogger.info('Step 2: Scoring leads');
    result.stats.leadsScored = await scoreAllLeads();
    pipelineLogger.info(`Scored ${result.stats.leadsScored} leads`);

    // Step 3: Generate AI notes
    pipelineLogger.info('Step 3: Generating AI notes');
    result.stats.notesGenerated = await generateAllNotes();
    pipelineLogger.info(`Generated notes for ${result.stats.notesGenerated} leads`);

    // Step 4: Export
    pipelineLogger.info('Step 4: Exporting leads');
    const exportResult = await runDailyExport();
    result.stats.leadsExported = exportResult.csvRows;
    result.stats.csvPath = exportResult.csvPath;
    pipelineLogger.info(`Exported ${result.stats.leadsExported} leads to ${result.stats.csvPath}`);

    // Update export run record
    result.completedAt = new Date();
    result.durationMs = result.completedAt.getTime() - startedAt.getTime();

    await prisma.exportRun.update({
      where: { id: exportRun.id },
      data: {
        status: 'completed',
        completedAt: result.completedAt,
        durationMs: result.durationMs,
        totalLeadsProcessed: result.stats.leadsScored,
        newLeadsAdded: result.stats.leadsIngested,
        leadsExported: result.stats.leadsExported,
        csvFilePath: result.stats.csvPath,
        logs: JSON.stringify([
          `Ingested ${result.stats.filesIngested} files`,
          `Added ${result.stats.leadsIngested} new leads`,
          `Scored ${result.stats.leadsScored} leads`,
          `Generated ${result.stats.notesGenerated} notes`,
          `Exported ${result.stats.leadsExported} leads`
        ])
      }
    });

    pipelineLogger.info(`Pipeline completed in ${result.durationMs}ms`);

  } catch (error) {
    result.status = 'failed';
    result.completedAt = new Date();
    result.durationMs = result.completedAt.getTime() - startedAt.getTime();
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');

    await prisma.exportRun.update({
      where: { id: exportRun.id },
      data: {
        status: 'failed',
        completedAt: result.completedAt,
        durationMs: result.durationMs,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      }
    });

    pipelineLogger.error('Pipeline failed:', error);
  }

  return result;
}

// Get pipeline status and history
export async function getPipelineStatus() {
  const recentRuns = await prisma.exportRun.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  const lastSuccessful = await prisma.exportRun.findFirst({
    where: { status: 'completed' },
    orderBy: { createdAt: 'desc' }
  });

  const totalLeads = await prisma.lead.count();
  const scoredLeads = await prisma.lead.count({
    where: { fitScore: { gt: 0 } }
  });

  return {
    recentRuns,
    lastSuccessful,
    stats: {
      totalLeads,
      scoredLeads
    }
  };
}
