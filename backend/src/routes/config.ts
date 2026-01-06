import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { getConfig, loadConfig, saveConfig, getConfigYaml, Config } from '../utils/config.js';

const router = Router();

// Get current configuration
router.get('/', async (req: Request, res: Response) => {
  try {
    const config = getConfig();
    res.json(config);
  } catch (error) {
    logger.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// Get raw YAML config
router.get('/yaml', async (req: Request, res: Response) => {
  try {
    const yaml = getConfigYaml();
    res.type('text/yaml').send(yaml);
  } catch (error) {
    logger.error('Error fetching config YAML:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// Update configuration
router.put('/', async (req: Request, res: Response) => {
  try {
    const newConfig = req.body as Partial<Config>;

    // Merge with existing config
    const currentConfig = getConfig();
    const mergedConfig = {
      ...currentConfig,
      ...newConfig,
      filters: { ...currentConfig.filters, ...newConfig.filters },
      output: { ...currentConfig.output, ...newConfig.output },
      scheduler: { ...currentConfig.scheduler, ...newConfig.scheduler },
      scoring: { ...currentConfig.scoring, ...newConfig.scoring },
      programs: {
        solar: { ...currentConfig.programs.solar, ...newConfig.programs?.solar },
        mass_save: { ...currentConfig.programs.mass_save, ...newConfig.programs?.mass_save }
      },
      ai_notes: { ...currentConfig.ai_notes, ...newConfig.ai_notes }
    } as Config;

    saveConfig(mergedConfig);

    // Reload config
    loadConfig();

    res.json({ success: true, config: mergedConfig });
  } catch (error) {
    logger.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Update targeting (counties/towns)
router.patch('/targeting', async (req: Request, res: Response) => {
  try {
    const { target_counties, target_towns, radius_zip, radius_miles } = req.body;

    const config = getConfig();

    if (target_towns !== undefined) {
      config.target_towns = target_towns;
      config.target_counties = undefined;
      config.radius_zip = undefined;
      config.radius_miles = undefined;
    } else if (target_counties !== undefined) {
      config.target_counties = target_counties;
      config.target_towns = undefined;
      config.radius_zip = undefined;
      config.radius_miles = undefined;
    } else if (radius_zip !== undefined) {
      config.radius_zip = radius_zip;
      config.radius_miles = radius_miles || 15;
      config.target_counties = undefined;
      config.target_towns = undefined;
    }

    saveConfig(config);
    loadConfig();

    res.json({ success: true, config });
  } catch (error) {
    logger.error('Error updating targeting:', error);
    res.status(500).json({ error: 'Failed to update targeting' });
  }
});

// Update filters
router.patch('/filters', async (req: Request, res: Response) => {
  try {
    const filters = req.body;

    const config = getConfig();
    config.filters = { ...config.filters, ...filters };

    saveConfig(config);
    loadConfig();

    res.json({ success: true, filters: config.filters });
  } catch (error) {
    logger.error('Error updating filters:', error);
    res.status(500).json({ error: 'Failed to update filters' });
  }
});

// Update scoring weights
router.patch('/scoring', async (req: Request, res: Response) => {
  try {
    const scoring = req.body;

    // Validate weights sum to ~100
    const weights = [
      scoring.single_family_weight,
      scoring.sqft_weight,
      scoring.age_weight,
      scoring.value_weight,
      scoring.owner_occupied_weight,
      scoring.data_completeness_weight
    ].filter(Boolean);

    const total = weights.reduce((a, b) => a + b, 0);
    if (total > 110) {
      return res.status(400).json({ error: 'Scoring weights should roughly sum to 100' });
    }

    const config = getConfig();
    config.scoring = { ...config.scoring, ...scoring };

    saveConfig(config);
    loadConfig();

    res.json({ success: true, scoring: config.scoring });
  } catch (error) {
    logger.error('Error updating scoring:', error);
    res.status(500).json({ error: 'Failed to update scoring' });
  }
});

// Update scheduler settings
router.patch('/scheduler', async (req: Request, res: Response) => {
  try {
    const { enabled, cron, timezone } = req.body;

    const config = getConfig();
    if (enabled !== undefined) config.scheduler.enabled = enabled;
    if (cron) config.scheduler.cron = cron;
    if (timezone) config.scheduler.timezone = timezone;

    saveConfig(config);
    loadConfig();

    res.json({ success: true, scheduler: config.scheduler });
  } catch (error) {
    logger.error('Error updating scheduler:', error);
    res.status(500).json({ error: 'Failed to update scheduler' });
  }
});

// Get available MA counties
router.get('/counties', async (req: Request, res: Response) => {
  const counties = [
    'Barnstable',
    'Berkshire',
    'Bristol',
    'Dukes',
    'Essex',
    'Franklin',
    'Hampden',
    'Hampshire',
    'Middlesex',
    'Nantucket',
    'Norfolk',
    'Plymouth',
    'Suffolk',
    'Worcester'
  ];

  res.json(counties);
});

export default router;
