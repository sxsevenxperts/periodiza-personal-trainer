import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing SUPABASE env vars')
}

const supabase = createClient(supabaseUrl, serviceKey)

;(async () => {
  try {
    console.log('🔗 Testing Supabase connection...')
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1)

    if (error) {
      console.error('❌ Connection failed:', error)
      process.exit(1)
    }

    console.log('✅ Connected to Supabase')
    console.log('📊 Sample tables:', data)
  } catch (e) {
    console.error('❌ Error:', e)
    process.exit(1)
  }
})()
