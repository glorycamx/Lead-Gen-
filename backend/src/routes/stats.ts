import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { getScoreStats } from '../services/scoring.js';

const router = Router();
const prisma = new PrismaClient();

// Get dashboard stats
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    // Get total leads
    const totalLeads = await prisma.lead.count();

    // Get leads by status
    const statusCounts = await prisma.lead.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    // Get leads by program fit
    const solarCandidates = await prisma.lead.count({
      where: { solarCandidate: true }
    });
    const massSaveCandidates = await prisma.lead.count({
      where: { massSaveCandidate: true }
    });
    const bothCandidates = await prisma.lead.count({
      where: { solarCandidate: true, massSaveCandidate: true }
    });

    // Get average score
    const scoreStats = await prisma.lead.aggregate({
      _avg: { fitScore: true },
      _max: { fitScore: true },
      _min: { fitScore: true }
    });

    // Get leads by city (top 10)
    const cityCounts = await prisma.lead.groupBy({
      by: ['city'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    });

    // Get recent activity
    const recentImports = await prisma.importBatch.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const recentExports = await prisma.exportRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // Get score distribution
    const scoreDistribution = {
      high: await prisma.lead.count({ where: { fitScore: { gte: 70 } } }),
      medium: await prisma.lead.count({ where: { fitScore: { gte: 50, lt: 70 } } }),
      low: await prisma.lead.count({ where: { fitScore: { gte: 30, lt: 50 } } }),
      veryLow: await prisma.lead.count({ where: { fitScore: { lt: 30 } } })
    };

    res.json({
      totalLeads,
      statusCounts: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      programFit: {
        solarCandidates,
        massSaveCandidates,
        bothCandidates
      },
      scores: {
        average: Math.round(scoreStats._avg.fitScore || 0),
        max: scoreStats._max.fitScore || 0,
        min: scoreStats._min.fitScore || 0,
        distribution: scoreDistribution
      },
      topCities: cityCounts.map(c => ({
        city: c.city,
        count: c._count.id
      })),
      recentActivity: {
        imports: recentImports,
        exports: recentExports
      }
    });
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get detailed scoring statistics
router.get('/scoring', async (req: Request, res: Response) => {
  try {
    const stats = await getScoreStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching scoring stats:', error);
    res.status(500).json({ error: 'Failed to fetch scoring stats' });
  }
});

// Get data source status
router.get('/sources', async (req: Request, res: Response) => {
  try {
    const sources = await prisma.dataSourceStatus.findMany({
      orderBy: { sourceName: 'asc' }
    });

    // Get counts by source type
    const leadsBySource = await prisma.lead.groupBy({
      by: ['dataSource'],
      _count: { id: true }
    });

    res.json({
      sources,
      leadsBySource: leadsBySource.reduce((acc, item) => {
        acc[item.dataSource] = item._count.id;
        return acc;
      }, {} as Record<string, number>)
    });
  } catch (error) {
    logger.error('Error fetching source stats:', error);
    res.status(500).json({ error: 'Failed to fetch source stats' });
  }
});

// Get suggested action breakdown
router.get('/actions', async (req: Request, res: Response) => {
  try {
    const actionCounts = await prisma.lead.groupBy({
      by: ['suggestedAction'],
      _count: { id: true },
      where: { suggestedAction: { not: null } }
    });

    res.json(
      actionCounts.reduce((acc, item) => {
        if (item.suggestedAction) {
          acc[item.suggestedAction] = item._count.id;
        }
        return acc;
      }, {} as Record<string, number>)
    );
  } catch (error) {
    logger.error('Error fetching action stats:', error);
    res.status(500).json({ error: 'Failed to fetch action stats' });
  }
});

// Get property type breakdown
router.get('/property-types', async (req: Request, res: Response) => {
  try {
    const typeCounts = await prisma.lead.groupBy({
      by: ['propertyType'],
      _count: { id: true }
    });

    res.json(
      typeCounts.reduce((acc, item) => {
        const type = item.propertyType || 'unknown';
        acc[type] = item._count.id;
        return acc;
      }, {} as Record<string, number>)
    );
  } catch (error) {
    logger.error('Error fetching property type stats:', error);
    res.status(500).json({ error: 'Failed to fetch property type stats' });
  }
});

export default router;
