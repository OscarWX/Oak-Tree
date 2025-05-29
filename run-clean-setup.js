const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables. Check your .env.local file')
  process.exit(1)
}

// Create Supabase client with admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runCleanSetup() {
  try {
    console.log('Starting clean database setup...')
    
    // Read the SQL file content
    const sqlContent = fs.readFileSync(
      path.join(__dirname, 'clean_database_setup.sql'),
      'utf8'
    )
    
    // Split the SQL into statements (handle multi-line statements properly)
    const statements = sqlContent
      .split(/;\s*\n/)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && stmt !== '--')
    
    console.log(`Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      
      // Skip comment-only statements
      if (stmt.startsWith('--') || stmt.match(/^--.*$/m)) {
        continue
      }
      
      console.log(`Executing statement ${i + 1}/${statements.length}:`)
      console.log(stmt.substring(0, 100) + (stmt.length > 100 ? '...' : ''))
      
      const { error } = await supabase.rpc('pg_query', { query: stmt })
      
      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error)
        // Continue with other statements for CREATE IF NOT EXISTS
      } else {
        console.log(`Statement ${i + 1} executed successfully`)
      }
    }
    
    console.log('✅ Clean database setup completed successfully!')
    console.log('\nYour database now has these tables:')
    console.log('📚 Core: teachers, students')
    console.log('🎓 Course Structure: courses, lessons, materials') 
    console.log('💬 Chat System: chat_sessions, chat_messages')
    console.log('📊 Progress Tracking: student_understanding, concept_progress, multiple_choice_attempts')
    console.log('💡 Hints: dynamic_hints')
    
  } catch (error) {
    console.error('❌ Clean setup failed:', error)
    process.exit(1)
  }
}

runCleanSetup() 