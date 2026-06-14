const CONFIG = {
  SUPABASE_URL: window.VITE_SUPABASE_URL || 'https://swyfbvcljwgnyiepesov.supabase.co',
  SUPABASE_ANON_KEY: window.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eWZidmNsandnbnlpZXBlc292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MTgyOTQsImV4cCI6MjA5Njk5NDI5NH0.Z9LX5o5eoxJlW74jCMEbyYb7_vzzdFl0iXpPqurcfss',
  RAZORPAY_KEY_ID: window.VITE_RAZORPAY_KEY_ID || 'rzp_test_SUJNzsokchNZZd',
  SITE_URL: window.VITE_SITE_URL || window.location.origin,
  get FUNCTIONS_URL() { return `${this.SUPABASE_URL}/functions/v1` },
}
