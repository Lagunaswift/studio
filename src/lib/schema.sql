
-- Drop existing tables and types if they exist to start fresh.
DROP TABLE IF EXISTS public.planned_meals CASCADE;
DROP TABLE IF EXISTS public.pantry_items CASCADE;
DROP TABLE IF EXISTS public.favorite_recipes CASCADE;
DROP TABLE IF EXISTS public.user_recipes CASCADE;
DROP TABLE IF EXISTS public.daily_weight_logs CASCADE;
DROP TABLE IF EXISTS public.daily_vitals_logs CASCADE;
DROP TABLE IF EXISTS public.daily_manual_macros_logs CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP TYPE IF EXISTS public.meal_type;
DROP TYPE IF EXISTS public.sex;
DROP TYPE IF EXISTS public.activity_level;
DROP TYPE IF EXISTS public.training_experience;
DROP TYPE IF EXISTS public.primary_goal;
DROP TYPE IF EXISTS public.athlete_type;
DROP TYPE IF EXISTS public.subscription_status;
DROP TYPE IF EXISTS public.energy_level_v2;
DROP TYPE IF EXISTS public.soreness_level;
DROP TYPE IF EXISTS public.activity_yesterday_level;


-- Create custom ENUM types
CREATE TYPE public.sex AS ENUM ('male', 'female', 'notSpecified');
CREATE TYPE public.activity_level AS ENUM ('sedentary', 'light', 'moderate', 'active', 'veryActive');
CREATE TYPE public.training_experience AS ENUM ('beginner', 'intermediate', 'advanced', 'veryAdvanced', 'notSpecified');
CREATE TYPE public.primary_goal AS ENUM ('fatLoss', 'muscleGain', 'maintenance', 'notSpecified');
CREATE TYPE public.athlete_type AS ENUM ('endurance', 'strengthPower', 'generalFitness', 'notSpecified');
CREATE TYPE public.subscription_status AS ENUM ('active', 'inactive', 'none');
CREATE TYPE public.meal_type AS ENUM ('Breakfast', 'Lunch', 'Dinner', 'Snack');
CREATE TYPE public.energy_level_v2 AS ENUM ('low', 'moderate', 'high', 'vibrant');
CREATE TYPE public.soreness_level AS ENUM ('none', 'mild', 'moderate', 'severe');
CREATE TYPE public.activity_yesterday_level AS ENUM ('rest', 'light', 'moderate', 'strenuous');

-- Profiles Table
-- Stores all user information, settings, and calculated data.
CREATE TABLE public.profiles (
  id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  updated_at timestamp with time zone,
  name text,
  email text,
  
  -- User Physical Info
  height_cm numeric,
  weight_kg numeric,
  age int,
  sex public.sex,
  activity_level public.activity_level,
  training_experience_level public.training_experience,
  body_fat_percentage numeric,
  
  -- Body Measurements for BFP calculation
  neck_circumference_cm numeric,
  abdomen_circumference_cm numeric, -- Male
  waist_circumference_cm numeric,   -- Female
  hip_circumference_cm numeric,     -- Female
  
  -- Goals and AI settings
  athlete_type public.athlete_type,
  primary_goal public.primary_goal,
  macro_targets jsonb,
  meal_structure jsonb,
  dietary_preferences text[],
  allergens text[],
  
  -- Calculated Fields (updated via triggers or app logic)
  tdee numeric,
  lean_body_mass_kg numeric,
  rda jsonb,
  
  -- App settings
  dashboard_settings jsonb,
  
  -- Legal & Subscription
  has_accepted_terms boolean DEFAULT false,
  subscription_status public.subscription_status,
  
  -- Coaching data
  last_check_in_date date,
  target_weight_change_rate_kg numeric,

  PRIMARY KEY (id)
);

-- Planned Meals Table
CREATE TABLE public.planned_meals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  recipe_id bigint NOT NULL,
  date date NOT NULL,
  meal_type public.meal_type NOT NULL,
  servings numeric NOT NULL,
  status text NOT NULL DEFAULT 'planned', -- 'planned' or 'eaten'
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- Pantry Items Table
CREATE TABLE public.pantry_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  quantity numeric NOT NULL,
  unit text NOT NULL,
  category text,
  expiry_date date,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- Favorite Recipes Table (Join Table)
CREATE TABLE public.favorite_recipes (
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  recipe_id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (user_id, recipe_id)
);

-- User-Created Recipes Table
CREATE TABLE public.user_recipes (
  id bigserial,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image text,
  servings int NOT NULL,
  prep_time text,
  cook_time text,
  chill_time text,
  ingredients text[],
  instructions text[],
  macros_per_serving jsonb,
  micronutrients_per_serving jsonb,
  tags text[],
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- Daily Weight Logs Table
CREATE TABLE public.daily_weight_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    date date NOT NULL,
    weight_kg numeric NOT NULL,
    trend_weight_kg numeric,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (user_id, date)
);

-- Daily Vitals Logs Table
CREATE TABLE public.daily_vitals_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    date date NOT NULL,
    sleep_quality int,
    energy_level public.energy_level_v2,
    cravings_level int,
    muscle_soreness public.soreness_level,
    activity_yesterday public.activity_yesterday_level,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (user_id, date)
);

-- Daily Manual Macros Logs Table
CREATE TABLE public.daily_manual_macros_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    date date NOT NULL,
    macros jsonb,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (user_id, date)
);

-- RLS Policies
-- Enable RLS for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planned_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_vitals_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_manual_macros_logs ENABLE ROW LEVEL SECURITY;

-- Policies for 'profiles' table
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);

-- Policies for all other user-data tables
CREATE POLICY "Users can manage their own data." ON public.planned_meals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own data." ON public.pantry_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own data." ON public.favorite_recipes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own data." ON public.user_recipes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own data." ON public.daily_weight_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own data." ON public.daily_vitals_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own data." ON public.daily_manual_macros_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Function to handle new user setup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, macro_targets, dietary_preferences, allergens, meal_structure, has_accepted_terms, subscription_status)
  values (
    new.id, 
    new.raw_user_meta_data->>'name',
    new.email,
    '{"calories": 2000, "protein": 150, "carbs": 200, "fat": 60}'::jsonb,
    '{}'::text[],
    '{}'::text[],
    '[{"id": "1", "name": "Breakfast", "type": "Breakfast"}, {"id": "2", "name": "Lunch", "type": "Lunch"}, {"id": "3", "name": "Dinner", "type": "Dinner"}, {"id": "4", "name": "Snack", "type": "Snack"}]'::jsonb,
    false,
    'none'::public.subscription_status
  );
  return new;
end;
$$;

-- Trigger to call the function when a new user signs up
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Optional: Function to update 'updated_at' timestamp on profile change
CREATE OR REPLACE FUNCTION public.handle_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_profile_update();
