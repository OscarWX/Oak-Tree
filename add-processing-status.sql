-- Add processing_status column to materials table
-- This column will track the status of text extraction and AI analysis

ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS processing_status text;

-- Update existing rows to set status based on existing data
UPDATE materials
SET processing_status = 
  CASE 
    WHEN content IS NULL OR content = '' THEN 'pending'
    WHEN content LIKE '[Failed to extract%' THEN 'extraction_failed'
    WHEN content IS NOT NULL AND ai_summary IS NULL THEN 'extraction_successful'
    WHEN content IS NOT NULL AND ai_summary IS NOT NULL THEN 'completed_successfully'
    ELSE 'unknown'
  END;

-- Add index for faster filtering by processing status
CREATE INDEX IF NOT EXISTS idx_materials_processing_status ON materials(processing_status);

COMMENT ON COLUMN materials.processing_status IS 
'Tracks the processing status of materials. Possible values:
- pending: Initial state, no processing attempted
- extraction_successful: Text extracted but no AI analysis yet
- extraction_failed: Failed to extract text from file
- ai_analysis_failed: Text extraction succeeded but AI analysis failed
- partial_success: Some processing succeeded but with issues
- completed_successfully: Both text extraction and AI analysis succeeded'; 