-- =================================================================
--  Focused Schema for MealPlannerPro Check-in Feature
-- =================================================================
--  This script creates only the tables necessary to support the
--  "Preppy: Weekly Check-in" feature, which relies on historical
--  data logging.

-- =================================================================
--  1. Daily Weight Log Table
-- =================================================================
--  Stores the user's weight each day. Crucial for trend analysis.

CREATE TABLE IF NOT EXISTS public.daily_weight_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    weight_kg REAL NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, date)
);

ALTER TABLE public.daily_weight_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated user to read own weight logs" ON public.daily_weight_logs;
CREATE POLICY "Allow authenticated user to read own weight logs"
ON public.daily_weight_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow authenticated user to insert own weight logs" ON public.daily_weight_logs;
CREATE POLICY "Allow authenticated user to insert own weight logs"
ON public.daily_weight_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow authenticated user to update own weight logs" ON public.daily_weight_logs;
CREATE POLICY "Allow authenticated user to update own weight logs"
ON public.daily_weight_logs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow authenticated user to delete own weight logs" ON public.daily_weight_logs;
CREATE POLICY "Allow authenticated user to delete own weight logs"
ON public.daily_weight_logs FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- =================================================================
--  2. Daily Vitals Log Table
-- =================================================================
--  Stores subjective wellness metrics for more nuanced AI coaching.

CREATE TABLE IF NOT EXISTS public.daily_vitals_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    sleep_quality SMALLINT CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
    energy_level TEXT,
    cravings_level SMALLINT CHECK (cravings_level >= 1 AND cravings_level <= 10),
    muscle_soreness TEXT,
    activity_yesterday TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, date)
);

ALTER TABLE public.daily_vitals_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated user to read own vitals logs" ON public.daily_vitals_logs;
CREATE POLICY "Allow authenticated user to read own vitals logs"
ON public.daily_vitals_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow authenticated user to insert own vitals logs" ON public.daily_vitals_logs;
CREATE POLICY "Allow authenticated user to insert own vitals logs"
ON public.daily_vitals_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow authenticated user to update own vitals logs" ON public.daily_vitals_logs;
CREATE POLICY "Allow authenticated user to update own vitals logs"
ON public.daily_vitals_logs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow authenticated user to delete own vitals logs" ON public.daily_vitals_logs;
CREATE POLICY "Allow authenticated user to delete own vitals logs"
ON public.daily_vitals_logs FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- =================================================================
--  3. Daily Manual Macros Log Table
-- =================================================================
--  Allows users to manually log macros for days they eat off-plan,
--  ensuring TDEE calculation remains accurate.

CREATE TABLE IF NOT EXISTS public.daily_manual_macros_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    macros JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, date)
);

ALTER TABLE public.daily_manual_macros_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated user to read own manual macro logs" ON public.daily_manual_macros_logs;
CREATE POLICY "Allow authenticated user to read own manual macro logs"
ON public.daily_manual_macros_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow authenticated user to insert own manual macro logs" ON public.daily_manual_macros_logs;
CREATE POLICY "Allow authenticated user to insert own manual macro logs"
ON public.daily_manual_macros_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow authenticated user to update own manual macro logs" ON public.daily_manual_macros_logs;
CREATE POLICY "Allow authenticated user to update own manual macro logs"
ON public.daily_manual_macros_logs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow authenticated user to delete own manual macro logs" ON public.daily_manual_macros_logs;
CREATE POLICY "Allow authenticated user to delete own manual macro logs"
ON public.daily_manual_macros_logs FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

