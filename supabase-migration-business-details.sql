-- Create favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id BIGINT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, business_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_business_id ON public.favorites(business_id);

-- Enable Row Level Security
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to manage their own favorites
CREATE POLICY "Users can view their own favorites"
ON public.favorites
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorites"
ON public.favorites
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
ON public.favorites
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create business_reports table
CREATE TABLE IF NOT EXISTS public.business_reports (
    id BIGSERIAL PRIMARY KEY,
    business_id BIGINT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    details TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_business_reports_business_id ON public.business_reports(business_id);
CREATE INDEX IF NOT EXISTS idx_business_reports_user_id ON public.business_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_business_reports_status ON public.business_reports(status);
CREATE INDEX IF NOT EXISTS idx_business_reports_created_at ON public.business_reports(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.business_reports ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to submit reports
CREATE POLICY "Anyone can submit reports"
ON public.business_reports
FOR INSERT
TO public
WITH CHECK (true);

-- Create policy to allow users to view their own reports
CREATE POLICY "Users can view their own reports"
ON public.business_reports
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Add whatsapp_number column to businesses table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'businesses'
                   AND column_name = 'whatsapp_number') THEN
        ALTER TABLE public.businesses ADD COLUMN whatsapp_number TEXT;
    END IF;
END $$;

-- Add total_reviews column to businesses table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'businesses'
                   AND column_name = 'total_reviews') THEN
        ALTER TABLE public.businesses ADD COLUMN total_reviews INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add opening_hours column to businesses table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'businesses'
                   AND column_name = 'opening_hours') THEN
        ALTER TABLE public.businesses ADD COLUMN opening_hours JSONB;
    END IF;
END $$;

-- Create function to automatically update updated_at timestamp on business_reports
CREATE OR REPLACE FUNCTION update_business_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at on row changes
DROP TRIGGER IF EXISTS update_business_reports_updated_at_trigger ON public.business_reports;
CREATE TRIGGER update_business_reports_updated_at_trigger
BEFORE UPDATE ON public.business_reports
FOR EACH ROW
EXECUTE PROCEDURE update_business_reports_updated_at();

-- Update some sample businesses with WhatsApp numbers
UPDATE public.businesses
SET whatsapp_number = phone,
    total_reviews = FLOOR(RANDOM() * 100 + 10)::INTEGER
WHERE whatsapp_number IS NULL
AND phone IS NOT NULL
LIMIT 10;

COMMENT ON TABLE public.favorites IS 'User favorite businesses';
COMMENT ON TABLE public.business_reports IS 'User-submitted reports about businesses';
