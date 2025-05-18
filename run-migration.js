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

async function runMigration() {
  try {
    console.log('Starting migration to add processing_status field...')
    
    // Read the SQL file content
    const sqlContent = fs.readFileSync(
      path.join(__dirname, 'add-processing-status.sql'),
      'utf8'
    )
    
    // Split the SQL into statements (simple splitting by semicolon)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)
    
    console.log(`Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      console.log(`Executing statement ${i + 1}/${statements.length}:`)
      console.log(stmt.substring(0, 100) + (stmt.length > 100 ? '...' : ''))
      
      const { error } = await supabase.rpc('pg_query', { query: stmt })
      
      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error)
        // Continue with other statements
      } else {
        console.log(`Statement ${i + 1} executed successfully`)
      }
    }
    
    // Verify the column was added
    const { data, error } = await supabase
      .from('materials')
      .select('processing_status')
      .limit(1)
    
    if (error) {
      console.error('Error verifying migration:', error)
    } else {
      console.log('Migration verification successful: processing_status field exists')
    }
    
    // Update existing records
    console.log('Updating existing materials with processing status...')
    
    const { data: materials, error: fetchError } = await supabase
      .from('materials')
      .select('id, content, ai_summary, content_type')
      .is('processing_status', null)
    
    if (fetchError) {
      console.error('Error fetching materials:', fetchError)
    } else {
      console.log(`Found ${materials?.length || 0} materials that need status updates`)
      
      // Process in batches to avoid timeout
      const batchSize = 50
      for (let i = 0; i < (materials?.length || 0); i += batchSize) {
        const batch = materials.slice(i, i + batchSize)
        
        for (const material of batch) {
          let status = 'unknown'
          
          if (!material.content || material.content === '') {
            status = 'pending'
          } else if (material.content.startsWith('[Failed to extract')) {
            status = 'extraction_failed'
          } else if (material.content && !material.ai_summary) {
            status = 'extraction_successful'
          } else if (material.content && material.ai_summary) {
            status = 'completed_successfully'
          }
          
          const { error: updateError } = await supabase
            .from('materials')
            .update({ processing_status: status })
            .eq('id', material.id)
          
          if (updateError) {
            console.error(`Error updating material ${material.id}:`, updateError)
          }
        }
        
        console.log(`Updated batch ${i/batchSize + 1}, ${Math.min(i + batchSize, materials.length)}/${materials.length} materials`)
      }
    }
    
    console.log('Migration completed!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

runMigration() 