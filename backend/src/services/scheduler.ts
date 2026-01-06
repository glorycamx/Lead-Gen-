import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { Config } from '../utils/config.js';
import { runPipeline } from './pipeline.js';

let scheduledTask: cron.ScheduledTask | null = null;

export function initScheduler(config: Config): void {
  if (!config.scheduler.enabled) {
    logger.info('Scheduler disabled in config');
    return;
  }

  const cronExpression = config.scheduler.cron;
  const timezone = config.scheduler.timezone;

  // Validate cron expression
  if (!cron.validate(cronExpression)) {
    logger.error(`Invalid cron expression: ${cronExpression}`);
    return;
  }

  // Stop existing task if any
  if (scheduledTask) {
    scheduledTask.stop();
    logger.info('Stopped existing scheduled task');
  }

  // Schedule new task
  scheduledTask = cron.schedule(cronExpression, async () => {
    logger.info('Scheduled pipeline run starting');

    try {
      const result = await runPipeline('scheduled');
      logger.info('Scheduled pipeline run completed:', result);
    } catch (error) {
      logger.error('Scheduled pipeline run failed:', error);
    }
  }, {
    scheduled: true,
    timezone: timezone
  });

  logger.info(`Scheduler initialized: "${cronExpression}" (${timezone})`);
}

export function stopScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    logger.info('Scheduler stopped');
  }
}

export function getSchedulerStatus(): { running: boolean; cronExpression: string | null; nextRun: Date | null } {
  if (!scheduledTask) {
    return { running: false, cronExpression: null, nextRun: null };
  }

  // node-cron doesn't expose next run time directly
  // We'll calculate it based on the cron expression
  return {
    running: true,
    cronExpression: null, // Would need to store this separately
    nextRun: null // Would need to calculate from cron expression
  };
}

// Manual trigger for testing
export async function triggerManualRun(): Promise<void> {
  logger.info('Manual pipeline run triggered');

  try {
    const result = await runPipeline('manual');
    logger.info('Manual pipeline run completed:', result);
  } catch (error) {
    logger.error('Manual pipeline run failed:', error);
    throw error;
  }
}
