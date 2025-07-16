--
-- Main User Profiles Table
-- Stores comprehensive user information, settings, and calculated values.
--
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMP WITH TIME ZONE,
  name TEXT,
  email TEXT UNIQUE,
  
  -- Physical Attributes
  height_cm REAL,
  weight_kg REAL,
  age REAL,
  sex TEXT,
  body_fat_percentage REAL,
  neck_circumference_cm REAL,
  abdomen_circumference_cm REAL,
  waist_circumference_cm REAL,
  hip_circumference_cm REAL,

  -- Goals & Activity
  activity_level TEXT,
  training_experience_level TEXT,
  athlete_type TEXT,
  primary_goal TEXT,
  target_weight_change_rate_kg REAL,
  
  -- Calculated Estimates
  tdee REAL, -- Total Daily Energy Expenditure
  lean_body_mass_kg REAL,

  -- App Settings
  macro_targets JSONB,
  dietary_preferences TEXT[],
  allergens TEXT[],
  meal_structure JSONB[],
  dashboard_settings JSONB,
  
  -- App State
  has_accepted_terms BOOLEAN DEFAULT FALSE,
  last_check_in_date DATE,
  
  -- Subscription Info (for future use)
  subscription_status TEXT,
  subscription_end_date TIMESTAMP WITH TIME ZONE
);

-- RLS Policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile." ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete their own profile." ON profiles FOR DELETE USING (auth.uid() = id);


--
-- User-Created Custom Recipes Table
--
CREATE TABLE user_recipes (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image TEXT,
  servings REAL NOT NULL,
  prep_time TEXT,
  cook_time TEXT,
  chill_time TEXT,
  ingredients TEXT[] NOT NULL,
  instructions TEXT[] NOT NULL,
  macros_per_serving JSONB NOT NULL,
  micronutrients_per_serving JSONB,
  tags TEXT[]
);

-- RLS Policies for user_recipes
ALTER TABLE user_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own recipes." ON user_recipes FOR ALL USING (auth.uid() = user_id);


--
-- Favorite Recipes Junction Table
-- Links users to their favorite recipes (both static and custom).
--
CREATE TABLE favorite_recipes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id BIGINT NOT NULL, -- Can reference both static and user_recipes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, recipe_id)
);

-- RLS Policies for favorite_recipes
ALTER TABLE favorite_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own favorite recipes." ON favorite_recipes FOR ALL USING (auth.uid() = user_id);


--
-- Planned Meals Table
-- Stores meals planned by the user for specific dates.
--
CREATE TABLE planned_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  recipe_id BIGINT NOT NULL,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  servings REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' -- 'planned' or 'eaten'
);

-- RLS Policies for planned_meals
ALTER TABLE planned_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own meal plans." ON planned_meals FOR ALL USING (auth.uid() = user_id);


--
-- Pantry Items Table
-- Tracks ingredients the user has on hand.
--
CREATE TABLE pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  category TEXT NOT NULL,
  expiry_date DATE
);

-- RLS Policies for pantry_items
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own pantry items." ON pantry_items FOR ALL USING (auth.uid() = user_id);


--
-- Daily Weight Log Table
--
CREATE TABLE daily_weight_logs (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    weight_kg REAL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, date)
);

-- RLS Policies for daily_weight_logs
ALTER TABLE daily_weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own weight logs." ON daily_weight_logs FOR ALL USING (auth.uid() = user_id);


--
-- Daily Vitals Log Table
--
CREATE TABLE daily_vitals_logs (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    sleep_quality REAL,
    energy_level TEXT,
    cravings_level REAL,
    muscle_soreness TEXT,
    activity_yesterday TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, date)
);

-- RLS Policies for daily_vitals_logs
ALTER TABLE daily_vitals_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own vitals logs." ON daily_vitals_logs FOR ALL USING (auth.uid() = user_id);


--
-- Daily Manual Macros Log Table
--
CREATE TABLE daily_manual_macros_logs (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    macros JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, date)
);

-- RLS Policies for daily_manual_macros_logs
ALTER TABLE daily_manual_macros_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own manual macro logs." ON daily_manual_macros_logs FOR ALL USING (auth.uid() = user_id);


--
-- Function to create a user profile automatically on new user sign-up.
--
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

--
-- Trigger to execute the function after a new user is created.
--
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Set up Storage for user avatars (optional)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible." ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated users can upload an avatar." ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own avatar." ON storage.objects FOR UPDATE USING (auth.uid() = owner) WITH CHECK (bucket_id = 'avatars');
