-- Create storage bucket for event poster images
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-posters', 'event-posters', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public can view event posters"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-posters');

-- Allow authenticated users (admins) to upload posters
CREATE POLICY "Authenticated users can upload event posters"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-posters'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete posters
CREATE POLICY "Authenticated users can delete event posters"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'event-posters'
  AND auth.role() = 'authenticated'
);
