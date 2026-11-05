// LocalKaam - Runtime Configuration for Static Deployed Frontend
// Supplies public environment variables to vanilla ES module clients.
// Only the PUBLIC anon key is exposed here; service-role keys are never included.
window.__ENV__ = window.__ENV__ || {
  VITE_SUPABASE_URL: 'https://dcijrqwoxkazggouvhdn.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjaWpycXdveGthemdnb3V2aGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MzEwNjIsImV4cCI6MjEwODQwNzA2Mn0.aFaK7IAkKf6YjUN09PBXNbZHOrGhqjABr9NiD9nS4g0',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_OWfosp_8VvcCS0Exlwm1vA_EFjLBBjP'
};
