import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = env.analytics.configPath;

let configCache = {
  general: null,
  rules: null,
  models: null,
  smartSearchProfiles: null,
  lastSync: null
};

export const configLoaders = {
  async loadGeneralConfig() {
    try {
      const data = await fs.readFile(path.join(CONFIG_PATH, 'config.json'), 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load general config:', error);
      return {};
    }
  },

  async loadRuleConfig() {
    try {
      const data = await fs.readFile(path.join(CONFIG_PATH, 'rule_config.json'), 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load rule config:', error);
      return {};
    }
  },

  async loadModelConfig() {
    try {
      const data = await fs.readFile(path.join(CONFIG_PATH, 'model_config.json'), 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load model config:', error);
      return {};
    }
  },

  async loadSmartSearchProfiles() {
    try {
      const data = await fs.readFile(path.join(CONFIG_PATH, 'smart_search_profiles_config.json'), 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load smart search profiles:', error);
      return {};
    }
  },

  async syncAllConfigs() {
    const [general, rules, models, profiles] = await Promise.all([
      this.loadGeneralConfig(),
      this.loadRuleConfig(),
      this.loadModelConfig(),
      this.loadSmartSearchProfiles()
    ]);

    configCache = {
      general,
      rules,
      models,
      smartSearchProfiles: profiles,
      lastSync: new Date().toISOString()
    };

    return configCache;
  },

  getCachedConfig() {
    return configCache;
  },

  getCameraRules(cameraId) {
    const rules = configCache.rules || {};
    return rules[cameraId] || [];
  },

  getSmartSearchProfile(profileId) {
    const profiles = configCache.smartSearchProfiles?.profiles || [];
    return profiles.find(p => p.id === profileId);
  }
};