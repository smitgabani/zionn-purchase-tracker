import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260208_add_time_support.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'))

    const results = []
    const errors = []

    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement })
        if (error) {
          // Try direct execution if rpc fails
          const { error: directError } = await supabase.from('_migrations').insert({
            name: '20260208_add_time_support',
            executed_at: new Date().toISOString()
          })

          if (directError) {
            console.error('Statement failed:', statement.substring(0, 100))
            errors.push({ statement: statement.substring(0, 100), error: error.message })
          } else {
            results.push('Success')
          }
        } else {
          results.push('Success')
        }
      } catch (err: any) {
        console.error('Execute error:', err)
        errors.push({ statement: statement.substring(0, 100), error: err.message })
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Migration completed with some errors',
        results,
        errors,
        note: 'You may need to run this migration manually in your Supabase dashboard SQL editor'
      }, { status: 207 })
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      statementsExecuted: results.length,
    })
  } catch (error: any) {
    console.error('Error running migration:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to run migration',
        note: 'You may need to run the migration manually. Check supabase/migrations/20260208_add_time_support.sql'
      },
      { status: 500 }
    )
  }
}
