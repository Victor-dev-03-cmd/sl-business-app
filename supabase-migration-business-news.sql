-- Create business_news table
CREATE TABLE IF NOT EXISTS public.business_news (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT,
    image_url TEXT,
    source TEXT,
    source_url TEXT,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    category TEXT DEFAULT 'business',
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_business_news_published_at ON public.business_news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_news_category ON public.business_news(category);

-- Enable Row Level Security
ALTER TABLE public.business_news ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all users to read news
CREATE POLICY "Allow public read access to business news"
ON public.business_news
FOR SELECT
TO public
USING (true);

-- Create policy to allow authenticated users to update views
CREATE POLICY "Allow authenticated users to update views"
ON public.business_news
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Insert sample data
INSERT INTO public.business_news (title, description, content, image_url, source, source_url, published_at, category, views) VALUES
(
    'Sri Lanka''s Tech Sector Sees 40% Growth in 2024',
    'The technology sector in Sri Lanka has experienced remarkable growth, with exports reaching $1.5 billion.',
    'Full article content here...',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
    'Daily FT',
    'https://www.ft.lk',
    NOW() - INTERVAL '2 hours',
    'technology',
    125
),
(
    'New Investment Opportunities Open in Colombo Port City',
    'Government announces new tax incentives for foreign investors in the Port City development.',
    'Full article content here...',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
    'Business Times',
    'https://www.businesstimes.lk',
    NOW() - INTERVAL '5 hours',
    'business',
    89
),
(
    'Sri Lankan Rupee Stabilizes Against Major Currencies',
    'Central Bank reports improved forex reserves and currency stability in Q1 2024.',
    'Full article content here...',
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
    'The Island',
    'https://www.island.lk',
    NOW() - INTERVAL '1 day',
    'economy',
    156
),
(
    'Fintech Startups Attract $200M in Funding',
    'Sri Lanka''s fintech ecosystem continues to grow with significant venture capital interest.',
    'Full article content here...',
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800',
    'Daily Mirror',
    'https://www.dailymirror.lk',
    NOW() - INTERVAL '1 day',
    'finance',
    203
),
(
    'Tourism Sector Records 25% Growth Year-on-Year',
    'Sri Lanka welcomes record number of tourists as the sector continues its recovery.',
    'Full article content here...',
    'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800',
    'Ceylon Today',
    'https://www.ceylontoday.lk',
    NOW() - INTERVAL '2 days',
    'business',
    178
);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at on row changes
CREATE TRIGGER update_business_news_updated_at BEFORE UPDATE
ON public.business_news FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

COMMENT ON TABLE public.business_news IS 'Business news articles for the SL Business Index app';
