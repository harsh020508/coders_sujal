// LocalKaam - Supabase Client & Configuration Manager
import { INITIAL_WORKERS } from './data.js';

const CONFIG_KEY = 'localkaam_supabase_config';

// Default Supabase project configuration (derived from your Supabase project)
const DEFAULT_CONFIG = {
  url: 'https://dcijrqwoxkazggouvhdn.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjaWpycXdveGthemdnb3V2aGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MzEwNjIsImV4cCI6MjEwODQwNzA2Mn0.aFaK7IAkKf6YjUN09PBXNbZHOrGhqjABr9NiD9nS4g0',
  publishableKey: 'sb_publishable_OWfosp_8VvcCS0Exlwm1vA_EFjLBBjP'
};

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
    // 1. Try global window.supabase (loaded from CDN script)
    if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
      return window.supabase.createClient;
    }
    // 2. Fall back to dynamic ESM import in browser
    if (typeof window !== 'undefined') {
      try {
        const module = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
        if (module && typeof module.createClient === 'function') {
          return module.createClient;
        }
      } catch (err) {
        console.error('Failed to import Supabase JS module:', err);
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
        console.warn('Supabase JS library is not available.');
        return null;
      }

      this.client = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
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
    const url = customUrl || this.getConfig().url;
    const key = customKey || this.getConfig().anonKey;

    if (!url || !key) {
      return { success: false, message: 'Please provide both Supabase Project URL and Public Anon Key.' };
    }

    try {
      const createClient = await this.getCreateClientFn();
      if (!createClient) {
        return { success: false, message: 'Supabase JS client library failed to load.' };
      }

      const tempClient = createClient(url.trim().replace(/\/+$/, ''), key.trim(), {
        auth: { persistSession: false }
      });

      // Quick test query against workers table or auth
      const { data, error } = await tempClient
        .from('workers')
        .select('id')
        .limit(1);

      if (error) {
        // If table doesn't exist yet, we still know credentials are valid if error is code 42P01 (relation doesn't exist)
        if (error.code === '42P01') {
          return {
            success: true,
            warning: true,
            message: 'Connected to Supabase! The "workers" table is not created yet. Run the schema SQL script to create tables.'
          };
        }
        return { success: false, message: `Supabase Error (${error.code || 'DB'}): ${error.message}` };
      }

      return {
        success: true,
        message: 'Successfully connected to Supabase Database and Auth!'
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
          category: w.category,
          skills: w.skills,
          experience: w.experience,
          hourly_rate: w.hourlyRate,
          base_locality: w.baseLocality,
          service_radius: w.serviceRadius,
          working_days: w.workingDays,
          working_hours: w.workingHours,
          available: w.available,
          verification_status: w.verificationStatus,
          rating_average: w.ratingAverage,
          rating_count: w.ratingCount,
          avatar: w.avatar,
          phone: w.phone,
          bio: w.bio
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
