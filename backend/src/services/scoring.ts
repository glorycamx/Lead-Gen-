import { PrismaClient, Lead } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { getConfig, Config } from '../utils/config.js';

const prisma = new PrismaClient();

export interface ScoreBreakdown {
  propertyType: number;
  sqft: number;
  age: number;
  value: number;
  ownerOccupied: number;
  dataCompleteness: number;
  total: number;
  factors: string[];
}

export interface ScoredLead extends Lead {
  scoreBreakdownParsed?: ScoreBreakdown;
}

// Scoring normalization functions
function normalizeToRange(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

// Calculate score for a single lead
export function calculateLeadScore(lead: Lead, config: Config): ScoreBreakdown {
  const scoring = config.scoring;
  const filters = config.filters;
  const factors: string[] = [];

  // Property Type Score
  let propertyTypeScore = 0;
  if (lead.propertyType === 'single_family') {
    propertyTypeScore = scoring.single_family_weight;
    factors.push(`Single-family home (+${scoring.single_family_weight})`);
  } else if (lead.propertyType === 'multi_family') {
    propertyTypeScore = scoring.multi_family_weight;
    factors.push(`Multi-family home (+${scoring.multi_family_weight})`);
  } else if (lead.propertyType === 'condo') {
    propertyTypeScore = scoring.condo_weight;
    factors.push(`Condo (+${scoring.condo_weight})`);
  } else if (lead.propertyType) {
    propertyTypeScore = scoring.condo_weight; // Default for unknown types
  }

  // SQFT Score (normalized between typical MA home sizes)
  let sqftScore = 0;
  if (lead.sqft && lead.sqft > 0) {
    const sqftNormalized = normalizeToRange(lead.sqft, 800, 4000);
    sqftScore = Math.round(sqftNormalized * scoring.sqft_weight);
    if (sqftScore > scoring.sqft_weight * 0.7) {
      factors.push(`Large home: ${lead.sqft.toLocaleString()} sqft (+${sqftScore})`);
    } else if (sqftScore > scoring.sqft_weight * 0.4) {
      factors.push(`Average size: ${lead.sqft.toLocaleString()} sqft (+${sqftScore})`);
    }
  }

  // Age Score (older homes = more efficiency opportunities)
  let ageScore = 0;
  if (lead.yearBuilt && lead.yearBuilt > 1800 && lead.yearBuilt <= new Date().getFullYear()) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - lead.yearBuilt;

    // Homes built 1950-2000 typically need the most efficiency upgrades
    // Very old homes (pre-1950) may have historical restrictions
    let ageNormalized = 0;
    if (age >= 25 && age <= 75) {
      ageNormalized = 1.0; // Sweet spot for efficiency upgrades
      factors.push(`Built ${lead.yearBuilt} - prime for efficiency upgrades (+${scoring.age_weight})`);
    } else if (age > 75) {
      ageNormalized = 0.7; // Older homes may have restrictions
      factors.push(`Built ${lead.yearBuilt} - older home, verify restrictions (+${Math.round(scoring.age_weight * 0.7)})`);
    } else if (age >= 15) {
      ageNormalized = 0.5;
      factors.push(`Built ${lead.yearBuilt} - moderate upgrade potential (+${Math.round(scoring.age_weight * 0.5)})`);
    } else {
      ageNormalized = 0.2; // Newer homes less likely to need upgrades
    }
    ageScore = Math.round(ageNormalized * scoring.age_weight);
  }

  // Value Score (higher value = more financing capacity)
  let valueScore = 0;
  if (lead.assessedValue && lead.assessedValue > 0) {
    // Normalize between typical MA assessment range
    const valueNormalized = normalizeToRange(lead.assessedValue, 200000, 1000000);
    valueScore = Math.round(valueNormalized * scoring.value_weight);
    if (valueScore > scoring.value_weight * 0.7) {
      factors.push(`High assessed value: $${lead.assessedValue.toLocaleString()} (+${valueScore})`);
    }
  }

  // Owner Occupied Score
  let ownerOccupiedScore = 0;
  if (lead.isOwnerOccupied === true) {
    ownerOccupiedScore = scoring.owner_occupied_weight;
    factors.push(`Owner-occupied (+${scoring.owner_occupied_weight})`);
  } else if (lead.isOwnerOccupied === false) {
    ownerOccupiedScore = Math.round(scoring.owner_occupied_weight * 0.3);
    factors.push(`Likely rental/investment property (+${ownerOccupiedScore})`);
  } else {
    // Unknown - give partial credit
    ownerOccupiedScore = Math.round(scoring.owner_occupied_weight * 0.5);
  }

  // Data Completeness Score
  let dataCompletenessScore = 0;
  const fields = [
    lead.address,
    lead.city,
    lead.zipCode,
    lead.propertyType,
    lead.yearBuilt,
    lead.sqft,
    lead.assessedValue,
    lead.ownerName,
    lead.isOwnerOccupied !== null
  ];
  const completeness = fields.filter(Boolean).length / fields.length;
  dataCompletenessScore = Math.round(completeness * scoring.data_completeness_weight);

  if (completeness >= 0.8) {
    factors.push(`Complete data profile (+${dataCompletenessScore})`);
  }

  // Calculate total
  const total = Math.min(100, Math.max(0,
    propertyTypeScore +
    sqftScore +
    ageScore +
    valueScore +
    ownerOccupiedScore +
    dataCompletenessScore
  ));

  return {
    propertyType: propertyTypeScore,
    sqft: sqftScore,
    age: ageScore,
    value: valueScore,
    ownerOccupied: ownerOccupiedScore,
    dataCompleteness: dataCompletenessScore,
    total,
    factors
  };
}

// Determine program fit flags
export function determineProgramFit(lead: Lead, config: Config): { solarCandidate: boolean; massSaveCandidate: boolean } {
  const programs = config.programs;
  let solarCandidate = false;
  let massSaveCandidate = false;

  // Solar candidacy
  if (programs.solar.enabled) {
    const meetsSqft = !programs.solar.min_sqft || (lead.sqft && lead.sqft >= programs.solar.min_sqft);
    const meetsValue = !programs.solar.min_value || (lead.assessedValue && lead.assessedValue >= programs.solar.min_value);
    const meetsSingleFamily = !programs.solar.prefer_single_family || lead.propertyType === 'single_family' || lead.propertyType === 'multi_family';

    solarCandidate = Boolean(meetsSqft && meetsValue && meetsSingleFamily);
  }

  // Mass Save candidacy
  if (programs.mass_save.enabled) {
    const meetsSqft = !programs.mass_save.min_sqft || (lead.sqft && lead.sqft >= programs.mass_save.min_sqft);
    const meetsYear = !programs.mass_save.max_year_built || (lead.yearBuilt && lead.yearBuilt <= programs.mass_save.max_year_built);

    massSaveCandidate = Boolean(meetsSqft && meetsYear);
  }

  return { solarCandidate, massSaveCandidate };
}

// Generate score explanation
function generateScoreExplanation(breakdown: ScoreBreakdown, lead: Lead): string {
  const parts: string[] = [];

  if (breakdown.total >= 70) {
    parts.push('Excellent prospect:');
  } else if (breakdown.total >= 50) {
    parts.push('Good prospect:');
  } else if (breakdown.total >= 30) {
    parts.push('Moderate prospect:');
  } else {
    parts.push('Lower priority:');
  }

  // Add top factors
  const topFactors = breakdown.factors.slice(0, 3);
  parts.push(topFactors.join('; '));

  return parts.join(' ');
}

// Determine suggested action
function determineSuggestedAction(breakdown: ScoreBreakdown, lead: Lead): string {
  if (breakdown.total >= 70) {
    return 'Knock'; // High priority - door knock
  } else if (breakdown.total >= 50) {
    if (lead.isOwnerOccupied) {
      return 'Knock';
    }
    return 'Mailer'; // Medium priority - send mailer
  } else if (breakdown.total >= 30) {
    return 'Mailer'; // Lower priority - mailer ok
  } else {
    return 'Wait'; // Low priority - wait for more data
  }
}

// Score all leads
export async function scoreAllLeads(): Promise<number> {
  const config = getConfig();

  // Get all leads that need scoring (or re-scoring)
  const leads = await prisma.lead.findMany({
    where: {
      state: 'MA'
    }
  });

  logger.info(`Scoring ${leads.length} leads`);

  let updated = 0;
  for (const lead of leads) {
    try {
      const breakdown = calculateLeadScore(lead, config);
      const programFit = determineProgramFit(lead, config);
      const explanation = generateScoreExplanation(breakdown, lead);
      const suggestedAction = determineSuggestedAction(breakdown, lead);

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          fitScore: breakdown.total,
          scoreBreakdown: JSON.stringify(breakdown),
          scoreExplainer: explanation,
          solarCandidate: programFit.solarCandidate,
          massSaveCandidate: programFit.massSaveCandidate,
          suggestedAction: suggestedAction
        }
      });

      updated++;
    } catch (error) {
      logger.error(`Failed to score lead ${lead.id}:`, error);
    }
  }

  logger.info(`Scored ${updated} leads`);
  return updated;
}

// Score leads with filtering
export async function scoreFilteredLeads(): Promise<ScoredLead[]> {
  const config = getConfig();
  const filters = config.filters;
  const output = config.output;

  // Build where clause
  const where: any = {
    state: 'MA'
  };

  // Apply targeting
  if (config.target_towns && config.target_towns.length > 0) {
    where.city = { in: config.target_towns.map(t => t.toLowerCase()) };
  } else if (config.target_counties && config.target_counties.length > 0) {
    where.county = { in: config.target_counties };
  }

  // Apply filters
  if (filters.exclude_condos) {
    where.NOT = { propertyType: 'condo' };
  }

  if (filters.min_year_built) {
    where.yearBuilt = { ...where.yearBuilt, gte: filters.min_year_built };
  }
  if (filters.max_year_built) {
    where.yearBuilt = { ...where.yearBuilt, lte: filters.max_year_built };
  }

  if (filters.min_sqft) {
    where.sqft = { ...where.sqft, gte: filters.min_sqft };
  }
  if (filters.max_sqft) {
    where.sqft = { ...where.sqft, lte: filters.max_sqft };
  }

  if (filters.min_assessed_value) {
    where.assessedValue = { ...where.assessedValue, gte: filters.min_assessed_value };
  }
  if (filters.max_assessed_value) {
    where.assessedValue = { ...where.assessedValue, lte: filters.max_assessed_value };
  }

  // Get leads sorted by score
  const leads = await prisma.lead.findMany({
    where,
    orderBy: { fitScore: 'desc' },
    take: output.max_leads_per_day
  });

  // Parse score breakdowns
  const scoredLeads: ScoredLead[] = leads.map(lead => ({
    ...lead,
    scoreBreakdownParsed: lead.scoreBreakdown ? JSON.parse(lead.scoreBreakdown) : undefined
  }));

  return scoredLeads;
}

// Get score statistics
export async function getScoreStats() {
  const stats = await prisma.lead.aggregate({
    _avg: { fitScore: true },
    _max: { fitScore: true },
    _min: { fitScore: true },
    _count: { id: true }
  });

  const distribution = await prisma.$queryRaw`
    SELECT
      CASE
        WHEN fitScore >= 70 THEN 'high'
        WHEN fitScore >= 50 THEN 'medium'
        WHEN fitScore >= 30 THEN 'low'
        ELSE 'very_low'
      END as tier,
      COUNT(*) as count
    FROM Lead
    GROUP BY tier
  `;

  const solarCandidates = await prisma.lead.count({ where: { solarCandidate: true } });
  const massSaveCandidates = await prisma.lead.count({ where: { massSaveCandidate: true } });

  return {
    total: stats._count.id,
    avgScore: Math.round(stats._avg.fitScore || 0),
    maxScore: stats._max.fitScore || 0,
    minScore: stats._min.fitScore || 0,
    distribution,
    solarCandidates,
    massSaveCandidates
  };
}
