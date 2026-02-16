-- Create merchants table
CREATE TABLE IF NOT EXISTS public.merchants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_merchants_admin_user_id ON public.merchants(admin_user_id);
CREATE INDEX idx_merchants_name ON public.merchants(name);
CREATE INDEX idx_merchants_deleted_at ON public.merchants(deleted_at) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own merchants"
  ON public.merchants
  FOR SELECT
  USING (auth.uid() = admin_user_id);

CREATE POLICY "Users can insert their own merchants"
  ON public.merchants
  FOR INSERT
  WITH CHECK (auth.uid() = admin_user_id);

CREATE POLICY "Users can update their own merchants"
  ON public.merchants
  FOR UPDATE
  USING (auth.uid() = admin_user_id)
  WITH CHECK (auth.uid() = admin_user_id);

CREATE POLICY "Users can delete their own merchants"
  ON public.merchants
  FOR DELETE
  USING (auth.uid() = admin_user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_merchants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER merchants_updated_at
  BEFORE UPDATE ON public.merchants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_merchants_updated_at();
