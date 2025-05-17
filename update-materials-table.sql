-- We don't need to add extracted_text column since we'll use the existing content column

-- Add file_name column to materials table if it doesn't exist yet
-- (We're using this in our code but it doesn't appear to be in the schema)
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS file_name text;

-- Add updated_at column to materials table if it doesn't exist yet
-- (We're using this in our code but it doesn't appear to be in the schema)
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone; 