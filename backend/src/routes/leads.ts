import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';

const router = Router();
const prisma = new PrismaClient();

// Get all leads with filtering, sorting, and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '25',
      sortBy = 'fitScore',
      sortOrder = 'desc',
      status,
      minScore,
      maxScore,
      city,
      county,
      propertyType,
      solarCandidate,
      massSaveCandidate,
      search
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: Prisma.LeadWhereInput = {};

    if (status) {
      where.status = status as string;
    }

    if (minScore) {
      where.fitScore = { ...where.fitScore as any, gte: parseInt(minScore as string) };
    }

    if (maxScore) {
      where.fitScore = { ...where.fitScore as any, lte: parseInt(maxScore as string) };
    }

    if (city) {
      where.city = { contains: city as string, mode: 'insensitive' };
    }

    if (county) {
      where.county = county as string;
    }

    if (propertyType) {
      where.propertyType = propertyType as string;
    }

    if (solarCandidate === 'true') {
      where.solarCandidate = true;
    }

    if (massSaveCandidate === 'true') {
      where.massSaveCandidate = true;
    }

    if (search) {
      where.OR = [
        { address: { contains: search as string, mode: 'insensitive' } },
        { city: { contains: search as string, mode: 'insensitive' } },
        { ownerName: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Build orderBy
    const orderBy: Prisma.LeadOrderByWithRelationInput = {};
    orderBy[sortBy as string] = sortOrder as 'asc' | 'desc';

    // Get leads
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy,
        skip,
        take: limitNum
      }),
      prisma.lead.count({ where })
    ]);

    res.json({
      leads,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Get single lead by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.findUnique({
      where: { id }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Parse score breakdown if exists
    const leadWithBreakdown = {
      ...lead,
      scoreBreakdownParsed: lead.scoreBreakdown ? JSON.parse(lead.scoreBreakdown) : null
    };

    res.json(leadWithBreakdown);
  } catch (error) {
    logger.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// Update lead status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['not_contacted', 'knocked', 'interested', 'not_home', 'not_qualified', 'converted', 'do_not_contact'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Get current lead
    const currentLead = await prisma.lead.findUnique({ where: { id } });
    if (!currentLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Update lead
    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        status,
        statusUpdatedAt: new Date(),
        statusNotes: notes || null
      }
    });

    // Create status history entry
    await prisma.statusHistory.create({
      data: {
        leadId: id,
        oldStatus: currentLead.status,
        newStatus: status,
        notes: notes || null,
        changedBy: 'user'
      }
    });

    res.json(updatedLead);
  } catch (error) {
    logger.error('Error updating lead status:', error);
    res.status(500).json({ error: 'Failed to update lead status' });
  }
});

// Bulk update status
router.post('/bulk-status', async (req: Request, res: Response) => {
  try {
    const { ids, status, notes } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' });
    }

    const validStatuses = ['not_contacted', 'knocked', 'interested', 'not_home', 'not_qualified', 'converted', 'do_not_contact'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Update all leads
    const result = await prisma.lead.updateMany({
      where: { id: { in: ids } },
      data: {
        status,
        statusUpdatedAt: new Date(),
        statusNotes: notes || null
      }
    });

    res.json({ updated: result.count });
  } catch (error) {
    logger.error('Error bulk updating lead status:', error);
    res.status(500).json({ error: 'Failed to bulk update lead status' });
  }
});

// Get status history for a lead
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const history = await prisma.statusHistory.findMany({
      where: { leadId: id },
      orderBy: { createdAt: 'desc' }
    });

    res.json(history);
  } catch (error) {
    logger.error('Error fetching lead history:', error);
    res.status(500).json({ error: 'Failed to fetch lead history' });
  }
});

// Delete lead
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.lead.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

export default router;
