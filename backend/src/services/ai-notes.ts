import { Lead, PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { getConfig, Config } from '../utils/config.js';

const prisma = new PrismaClient();

// Compliant messaging templates
const DOOR_KNOCK_TEMPLATES = [
  "Hi! I'm {{FIRST_NAME_OR_NEIGHBOR}} in {{TOWN}}. Many homeowners here are exploring solar and energy efficiency options - would you be open to a quick chat about what programs might be available for your home?",
  "Good {{TIME_OF_DAY}}! I work with homeowners in {{TOWN}} to explore energy savings options. Have you had a chance to look into programs like Mass Save for your home?",
  "Hi there! I'm helping neighbors in {{TOWN}} learn about solar and efficiency rebates. Would you like to know what options might be available - no commitment needed?",
  "Hello! I noticed several homes on this street have been exploring energy upgrades. There are some great programs available in {{TOWN}} - would you be interested in learning more?",
  "Hi! I'm with a local energy consultation service. Many {{TOWN}} homeowners don't know about the rebates and incentives available. Mind if I share some quick info?"
];

const SMS_TEMPLATES = [
  "Hi {{FIRST_NAME_OR_NEIGHBOR}}, this is {{SENDER}} helping {{TOWN}} homeowners explore energy options. Interested in learning about solar or Mass Save incentives for your home? Reply STOP to opt out.",
  "Hello! Many {{TOWN}} homeowners are saving with solar and efficiency programs. Would you like a free, no-obligation overview of what might be available for your property? Reply STOP to opt out.",
  "Hi, I help homeowners in {{TOWN}} navigate energy rebates and solar options. Would you be open to a quick call to see what programs might fit your home? Reply STOP to opt out."
];

const EMAIL_TEMPLATES = [
  {
    subject: "Energy Options for {{TOWN}} Homeowners",
    body: `Hi {{FIRST_NAME_OR_HOMEOWNER}},

I'm reaching out to homeowners in {{TOWN}} who might be interested in exploring energy efficiency and solar options for their homes.

{{PROGRAMS_MENTION}}

I'd love to help you understand what might be available for your property at {{ADDRESS}} - completely free and no commitment.

Would you be open to a brief conversation?

Best,
{{SENDER}}

P.S. This is a one-time outreach. If you'd prefer not to be contacted, simply reply and let me know.`
  },
  {
    subject: "Quick Question About Your Home in {{TOWN}}",
    body: `Hello {{FIRST_NAME_OR_HOMEOWNER}},

Many homeowners in {{TOWN}} have been taking advantage of energy programs that can significantly reduce utility costs.

I wanted to check if you've had a chance to explore what might be available for your home at {{ADDRESS}}.

{{PROGRAMS_MENTION}}

Would you be interested in a quick, no-pressure overview?

Regards,
{{SENDER}}

If you prefer not to receive messages from us, please reply with "unsubscribe."`
  }
];

// Program-specific messaging (compliant)
const SOLAR_MENTION = "Solar installations in Massachusetts often qualify for federal tax credits and state incentives, though eligibility varies by home and situation.";
const MASS_SAVE_MENTION = "The Mass Save program offers free home energy assessments and rebates for efficiency upgrades in many cases - though specific eligibility depends on your utility provider and home characteristics.";
const BOTH_MENTION = "Between solar incentives and programs like Mass Save, there are often options worth exploring - though what's available depends on your specific situation and home.";

interface AINotesResult {
  doorKnockNote: string;
  smsDraft: string;
  emailDraft: string;
}

// Generate notes using templates (no API required)
function generateTemplateNotes(lead: Lead, config: Config): AINotesResult {
  const aiConfig = config.ai_notes;

  // Determine which programs to mention
  let programsMention = '';
  if (lead.solarCandidate && lead.massSaveCandidate) {
    programsMention = BOTH_MENTION;
  } else if (lead.solarCandidate) {
    programsMention = SOLAR_MENTION;
  } else if (lead.massSaveCandidate) {
    programsMention = MASS_SAVE_MENTION;
  } else {
    programsMention = "There are various energy programs that might be worth exploring for your home.";
  }

  // Get time of day
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  // Extract first name from owner name if available
  const firstName = lead.ownerName?.split(' ')[0] || 'neighbor';

  // Select random templates
  const doorKnockTemplate = DOOR_KNOCK_TEMPLATES[Math.floor(Math.random() * DOOR_KNOCK_TEMPLATES.length)];
  const smsTemplate = SMS_TEMPLATES[Math.floor(Math.random() * SMS_TEMPLATES.length)];
  const emailTemplate = EMAIL_TEMPLATES[Math.floor(Math.random() * EMAIL_TEMPLATES.length)];

  // Replace placeholders
  const replacePlaceholders = (text: string): string => {
    return text
      .replace(/\{\{FIRST_NAME_OR_NEIGHBOR\}\}/g, firstName)
      .replace(/\{\{FIRST_NAME_OR_HOMEOWNER\}\}/g, firstName || 'Homeowner')
      .replace(/\{\{TOWN\}\}/g, lead.city || 'your area')
      .replace(/\{\{ADDRESS\}\}/g, lead.address || 'your property')
      .replace(/\{\{TIME_OF_DAY\}\}/g, timeOfDay)
      .replace(/\{\{SENDER\}\}/g, '[Your Name]')
      .replace(/\{\{PROGRAMS_MENTION\}\}/g, programsMention)
      .replace(/\{\{PROGRAMS_ENABLED\}\}/g,
        [
          lead.solarCandidate ? 'Solar' : null,
          lead.massSaveCandidate ? 'Mass Save' : null
        ].filter(Boolean).join(', ') || 'Energy Programs'
      );
  };

  // Generate notes
  const doorKnockNote = aiConfig.generate_door_knock_notes
    ? replacePlaceholders(doorKnockTemplate)
    : '';

  const smsDraft = aiConfig.generate_sms_draft
    ? replacePlaceholders(smsTemplate)
    : '';

  const emailDraft = aiConfig.generate_email_draft
    ? `Subject: ${replacePlaceholders(emailTemplate.subject)}\n\n${replacePlaceholders(emailTemplate.body)}`
    : '';

  return { doorKnockNote, smsDraft, emailDraft };
}

// Generate contextual door knock angle based on lead data
function generateContextualDoorKnock(lead: Lead): string {
  const angles: string[] = [];

  // Property-specific angles
  if (lead.yearBuilt && lead.yearBuilt < 1980) {
    angles.push(`Your home was built in ${lead.yearBuilt}, which often means great potential for efficiency upgrades.`);
  }

  if (lead.sqft && lead.sqft > 2000) {
    angles.push(`Larger homes like yours often see significant savings from energy improvements.`);
  }

  if (lead.propertyType === 'single_family') {
    angles.push(`Single-family homes often have the best options for solar installations.`);
  }

  // Select best angle based on score
  if (lead.solarCandidate && lead.massSaveCandidate) {
    return `Good candidate for both solar and Mass Save. ${angles[0] || 'Many neighbors are exploring energy options.'}`;
  } else if (lead.solarCandidate) {
    return `Solar-focused prospect. ${angles.find(a => a.includes('solar')) || angles[0] || 'Could benefit from solar evaluation.'}`;
  } else if (lead.massSaveCandidate) {
    return `Mass Save-focused prospect. ${angles.find(a => a.includes('efficiency')) || angles[0] || 'Strong candidate for efficiency rebates.'}`;
  }

  return `General prospect. ${angles[0] || 'Worth exploring energy options.'}`;
}

// Main function to generate AI notes for a lead
export async function generateNotesForLead(lead: Lead): Promise<AINotesResult> {
  const config = getConfig();

  if (!config.ai_notes.enabled) {
    return { doorKnockNote: '', smsDraft: '', emailDraft: '' };
  }

  // For MVP, always use template-based generation
  // This ensures the system works without any API keys
  const notes = generateTemplateNotes(lead, config);

  // Add contextual note
  const contextualNote = generateContextualDoorKnock(lead);

  return {
    doorKnockNote: `${contextualNote}\n\nSuggested opener: ${notes.doorKnockNote}`,
    smsDraft: notes.smsDraft,
    emailDraft: notes.emailDraft
  };
}

// Generate notes for all leads without notes
export async function generateAllNotes(): Promise<number> {
  const config = getConfig();

  if (!config.ai_notes.enabled) {
    logger.info('AI notes generation disabled');
    return 0;
  }

  // Get leads without notes
  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { doorKnockNote: null },
        { doorKnockNote: '' }
      ]
    }
  });

  logger.info(`Generating notes for ${leads.length} leads`);

  let generated = 0;
  for (const lead of leads) {
    try {
      const notes = await generateNotesForLead(lead);

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          doorKnockNote: notes.doorKnockNote,
          smsDraft: notes.smsDraft,
          emailDraft: notes.emailDraft
        }
      });

      generated++;
    } catch (error) {
      logger.error(`Failed to generate notes for lead ${lead.id}:`, error);
    }
  }

  logger.info(`Generated notes for ${generated} leads`);
  return generated;
}

// Compliance check for generated content
export function checkCompliance(text: string): { compliant: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for guarantee language
  const guaranteePatterns = [
    /you will save/i,
    /guaranteed savings/i,
    /you qualify/i,
    /you're eligible/i,
    /definitely save/i,
    /100% free/i,
    /no cost to you/i
  ];

  for (const pattern of guaranteePatterns) {
    if (pattern.test(text)) {
      issues.push(`Contains guarantee language matching: ${pattern.source}`);
    }
  }

  // Check for deceptive claims
  const deceptivePatterns = [
    /government program paying/i,
    /stimulus/i,
    /limited time only/i,
    /act now/i,
    /last chance/i,
    /selected for/i,
    /chosen for/i
  ];

  for (const pattern of deceptivePatterns) {
    if (pattern.test(text)) {
      issues.push(`Contains potentially deceptive language: ${pattern.source}`);
    }
  }

  return {
    compliant: issues.length === 0,
    issues
  };
}

// Validate all generated content
export async function validateAllContent(): Promise<{ total: number; compliant: number; issues: any[] }> {
  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { doorKnockNote: { not: null } },
        { smsDraft: { not: null } },
        { emailDraft: { not: null } }
      ]
    },
    select: {
      id: true,
      doorKnockNote: true,
      smsDraft: true,
      emailDraft: true
    }
  });

  let compliant = 0;
  const allIssues: any[] = [];

  for (const lead of leads) {
    const texts = [lead.doorKnockNote, lead.smsDraft, lead.emailDraft].filter(Boolean) as string[];
    let hasIssues = false;

    for (const text of texts) {
      const check = checkCompliance(text);
      if (!check.compliant) {
        hasIssues = true;
        allIssues.push({
          leadId: lead.id,
          issues: check.issues
        });
      }
    }

    if (!hasIssues) compliant++;
  }

  return {
    total: leads.length,
    compliant,
    issues: allIssues
  };
}
