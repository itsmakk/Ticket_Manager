const CONFIG = {
  SUPABASE_URL: window.VITE_SUPABASE_URL || 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: window.VITE_SUPABASE_ANON_KEY || 'your-anon-key',
  RAZORPAY_KEY_ID: window.VITE_RAZORPAY_KEY_ID || 'rzp_test_key',
  SITE_URL: window.VITE_SITE_URL || window.location.origin,
  get FUNCTIONS_URL() { return `${this.SUPABASE_URL}/functions/v1` },
}
