
-- Profiles table (auto-created on signup)
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Any authenticated family member can see all family profiles
CREATE POLICY "Authenticated can view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Latest known location per user
CREATE TABLE public.latest_locations (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.latest_locations TO authenticated;
GRANT ALL ON public.latest_locations TO service_role;
ALTER TABLE public.latest_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view all latest" ON public.latest_locations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users upsert own latest" ON public.latest_locations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own latest" ON public.latest_locations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- History of every recorded point
CREATE TABLE public.location_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_location_history_user_time ON public.location_history(user_id, recorded_at DESC);
GRANT SELECT, INSERT ON public.location_history TO authenticated;
GRANT USAGE ON SEQUENCE public.location_history_id_seq TO authenticated;
GRANT ALL ON public.location_history TO service_role;
GRANT ALL ON SEQUENCE public.location_history_id_seq TO service_role;
ALTER TABLE public.location_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view all history" ON public.location_history
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own history" ON public.location_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, color)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    '#' || lpad(to_hex((abs(hashtext(NEW.id::text)) % 16777215)), 6, '0')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for live map updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.latest_locations;
ALTER TABLE public.latest_locations REPLICA IDENTITY FULL;
