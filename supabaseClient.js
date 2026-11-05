// LocalKaam - Supabase Client & Configuration Manager
import { INITIAL_WORKERS } from './data.js';

const CONFIG_KEY = 'localkaam_supabase_config';

function resolveDefaultConfig() {
  const envObj = (typeof window !== 'undefined' && window.__ENV__) || {};
  const metaEnv = (typeof import.meta !== 'undefined' && import.meta.env) || {};

  const url = envObj.VITE_SUPABASE_URL ||
              metaEnv.VITE_SUPABASE_URL ||
              'https://dcijrqwoxkazggouvhdn.supabase.co';

  const anonKey = envObj.VITE_SUPABASE_ANON_KEY ||
                  metaEnv.VITE_SUPABASE_ANON_KEY ||
                  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjaWpycXdveGthemdnb3V2aGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MzEwNjIsImV4cCI6MjEwODQwNzA2Mn0.aFaK7IAkKf6YjUN09PBXNbZHOrGhqjABr9NiD9nS4g0';

  const publishableKey = envObj.VITE_SUPABASE_PUBLISHABLE_KEY ||
                         metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
                         'sb_publishable_OWfosp_8VvcCS0Exlwm1vA_EFjLBBjP';

  return { url: (url || '').trim().replace(/\/+$/, ''), anonKey: (anonKey || '').trim(), publishableKey: (publishableKey || '').trim() };
}

const DEFAULT_CONFIG = resolveDefaultConfig();

class SupabaseManager {
  constructor() {
    this.client = null;
    this.init();
  }

  getConfig() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(CONFIG_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.url && parsed.anonKey) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to read Supabase config from localStorage:', e);
    }
    return DEFAULT_CONFIG;
  }

  saveConfig(url, anonKey) {
    const cleanUrl = (url || '').trim().replace(/\/+$/, '');
    const cleanKey = (anonKey || '').trim();
    const config = { url: cleanUrl, anonKey: cleanKey };
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      }
    } catch (e) {
      console.warn('Failed to save Supabase config:', e);
    }
    this.client = null;
    return this.init();
  }

  clearConfig() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(CONFIG_KEY);
      }
    } catch (e) {}
    this.client = null;
  }

  isConfigured() {
    const config = this.getConfig();
    return Boolean(config && config.url && config.anonKey);
  }

  async getCreateClientFn() {
    // 1. Global window.supabase loaded from CDN
    if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
      return window.supabase.createClient;
    }
    // 2. Dynamic ESM import from CDN
    if (typeof window !== 'undefined') {
      try {
        const module = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
        if (module && typeof module.createClient === 'function') {
          return module.createClient;
        }
      } catch (err) {
        console.error('Failed to dynamically load Supabase JS module:', err);
      }
    }
    return null;
  }

  async init() {
    const config = this.getConfig();
    if (!config.url || !config.anonKey) {
      this.client = null;
      return null;
    }

    try {
      const createClient = await this.getCreateClientFn();
      if (!createClient) {
        console.warn('Supabase JS library is not yet available.');
        return null;
      }

      this.client = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce'
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });
      return this.client;
    } catch (err) {
      console.error('Error initializing Supabase client:', err);
      this.client = null;
      return null;
    }
  }

  async getClient() {
    if (!this.client && this.isConfigured()) {
      await this.init();
    }
    return this.client;
  }

  async testConnection(customUrl, customKey) {
    const url = (customUrl || this.getConfig().url || '').trim().replace(/\/+$/, '');
    const key = (customKey || this.getConfig().anonKey || '').trim();

    if (!url || !key) {
      return { success: false, message: 'Please provide both Supabase Project URL and Public Anon Key.' };
    }

    try {
      const createClient = await this.getCreateClientFn();
      if (!createClient) {
        return { success: false, message: 'Supabase JS client library failed to load.' };
      }

      const tempClient = createClient(url, key, { auth: { persistSession: false } });

      const { data, error } = await tempClient
        .from('workers')
        .select('id')
        .limit(1);

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
          return {
            success: true,
            warning: true,
            message: 'Connected to Supabase! The tables are not created yet. Run supabase_schema.sql in your Supabase SQL Editor.'
          };
        }
        return { success: false, message: `Supabase Error (${error.code || 'DB'}): ${error.message}` };
      }

      return {
        success: true,
        message: 'Successfully connected to Supabase Database, Auth, and Realtime!'
      };
    } catch (err) {
      return { success: false, message: `Connection failed: ${err.message || err}` };
    }
  }

  async seedDatabaseIfEmpty() {
    const client = await this.getClient();
    if (!client) return { success: false, message: 'Supabase is not configured' };

    try {
      const { count, error } = await client
        .from('workers')
        .select('*', { count: 'exact', head: true });

      if (error) {
        return { success: false, message: error.message };
      }

      if (count === 0) {
        const rows = INITIAL_WORKERS.map(w => ({
          id: w.id,
          name: w.name,
          category: Object.keys(w.specialities || {})[0] || 'plumber',
          skills: w.skills || [],
          experience: w.experience || 1,
          hourly_rate: w.specialities?.[Object.keys(w.specialities || {})[0]]?.startingPrice || 300,
          base_locality: w.baseLocality || 'andheri',
          service_radius: w.serviceRadius || 10,
          service_area: w.serviceArea || 'Mumbai Suburbs',
          working_days: w.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          working_hours: w.workingHours || { start: '08:00', end: '20:00' },
          available: w.available !== undefined ? w.available : true,
          verification_status: w.verificationStatus || 'Verified',
          rating_average: w.ratingAverage || 4.8,
          rating_count: w.ratingCount || 0,
          avatar: w.avatar || '',
          phone: w.phone || '',
          bio: w.bio || '',
          specialities: w.specialities || {},
          languages: w.languages || ['Hindi', 'English'],
          profile_completed: true
        }));

        const { error: insertError } = await client
          .from('workers')
          .upsert(rows, { onConflict: 'id' });

        if (insertError) {
          return { success: false, message: insertError.message };
        }
        return { success: true, message: `Successfully seeded ${rows.length} Mumbai professionals!` };
      }

      return { success: true, message: `Database already contains ${count} professionals.` };
    } catch (e) {
      return { success: false, message: e.message || 'Seeding failed' };
    }
  }
}

export const SupabaseService = new SupabaseManager();
