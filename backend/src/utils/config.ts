import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { logger } from './logger.js';

// Configuration schema with Zod
const FilterSchema = z.object({
  exclude_condos: z.boolean().default(false),
  prefer_single_family: z.boolean().default(true),
  prefer_older_homes: z.boolean().default(true),
  min_year_built: z.number().nullable().default(null),
  max_year_built: z.number().nullable().default(null),
  prefer_higher_sqft: z.boolean().default(true),
  min_sqft: z.number().nullable().default(null),
  max_sqft: z.number().nullable().default(null),
  prefer_higher_assessed_value: z.boolean().default(true),
  min_assessed_value: z.number().nullable().default(null),
  max_assessed_value: z.number().nullable().default(null),
  prefer_owner_occupied: z.boolean().default(true),
  exclude_hoa_if_detected: z.boolean().default(false)
});

const OutputSchema = z.object({
  min_leads_per_day: z.number().default(25),
  max_leads_per_day: z.number().default(150),
  export_csv: z.boolean().default(true),
  export_sqlite: z.boolean().default(true),
  export_google_sheets: z.boolean().default(false)
});

const SchedulerSchema = z.object({
  enabled: z.boolean().default(true),
  cron: z.string().default('0 7 * * *'),
  timezone: z.string().default('America/New_York')
});

const ScoringSchema = z.object({
  single_family_weight: z.number().default(20),
  multi_family_weight: z.number().default(10),
  condo_weight: z.number().default(5),
  sqft_weight: z.number().default(15),
  age_weight: z.number().default(15),
  value_weight: z.number().default(15),
  owner_occupied_weight: z.number().default(20),
  data_completeness_weight: z.number().default(10)
});

const ProgramSchema = z.object({
  enabled: z.boolean().default(true),
  min_sqft: z.number().optional(),
  min_value: z.number().optional(),
  max_year_built: z.number().optional(),
  prefer_single_family: z.boolean().optional()
});

const AINotesSchema = z.object({
  enabled: z.boolean().default(true),
  provider: z.enum(['openai', 'anthropic', 'template']).default('template'),
  generate_door_knock_notes: z.boolean().default(true),
  generate_sms_draft: z.boolean().default(true),
  generate_email_draft: z.boolean().default(true),
  include_disclaimers: z.boolean().default(true),
  avoid_guarantee_language: z.boolean().default(true)
});

const DataSourceSchema = z.object({
  user_csv: z.object({
    enabled: z.boolean().default(true),
    import_directory: z.string().default('./imports'),
    auto_detect_columns: z.boolean().default(true)
  }),
  open_data: z.object({
    enabled: z.boolean().default(true),
    cache_days: z.number().default(7),
    fallback_to_cache: z.boolean().default(true),
    sources: z.array(z.object({
      name: z.string(),
      enabled: z.boolean(),
      url: z.string().optional()
    })).default([])
  })
});

const ConfigSchema = z.object({
  target_counties: z.array(z.string()).optional(),
  target_towns: z.array(z.string()).optional(),
  radius_zip: z.string().optional(),
  radius_miles: z.number().optional(),
  filters: FilterSchema.default({}),
  output: OutputSchema.default({}),
  scheduler: SchedulerSchema.default({}),
  scoring: ScoringSchema.default({}),
  programs: z.object({
    solar: ProgramSchema.default({}),
    mass_save: ProgramSchema.default({})
  }).default({}),
  ai_notes: AINotesSchema.default({}),
  data_sources: DataSourceSchema.default({
    user_csv: { enabled: true, import_directory: './imports', auto_detect_columns: true },
    open_data: { enabled: true, cache_days: 7, fallback_to_cache: true, sources: [] }
  }),
  google_sheets: z.object({
    enabled: z.boolean().default(false),
    spreadsheet_id: z.string().optional(),
    sheet_name: z.string().optional(),
    credentials_file: z.string().optional()
  }).default({}),
  logging: z.object({
    level: z.string().default('info'),
    file: z.string().default('./logs/lead-bot.log'),
    max_size_mb: z.number().default(10),
    retain_days: z.number().default(30)
  }).default({})
});

export type Config = z.infer<typeof ConfigSchema>;

let cachedConfig: Config | null = null;

export function loadConfig(configPath?: string): Config {
  const configFile = configPath || path.join(process.cwd(), '..', 'config.yaml');

  try {
    if (!fs.existsSync(configFile)) {
      logger.warn(`Config file not found at ${configFile}, using defaults`);
      cachedConfig = ConfigSchema.parse({});
      return cachedConfig;
    }

    const fileContents = fs.readFileSync(configFile, 'utf8');
    const rawConfig = yaml.load(fileContents);

    cachedConfig = ConfigSchema.parse(rawConfig);
    logger.info(`Configuration loaded from ${configFile}`);

    return cachedConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Configuration validation error:', error.errors);
      throw new Error(`Invalid configuration: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

export function getConfig(): Config {
  if (!cachedConfig) {
    return loadConfig();
  }
  return cachedConfig;
}

export function reloadConfig(): Config {
  cachedConfig = null;
  return loadConfig();
}

export function getConfigYaml(): string {
  const configFile = path.join(process.cwd(), '..', 'config.yaml');
  if (fs.existsSync(configFile)) {
    return fs.readFileSync(configFile, 'utf8');
  }
  return '';
}

export function saveConfig(config: Config): void {
  const configFile = path.join(process.cwd(), '..', 'config.yaml');
  const yamlStr = yaml.dump(config, { indent: 2 });
  fs.writeFileSync(configFile, yamlStr, 'utf8');
  cachedConfig = config;
  logger.info('Configuration saved');
}
