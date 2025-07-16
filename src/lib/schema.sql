
-- Drop existing tables and types if they exist to ensure a clean slate.
DROP TABLE IF EXISTS "public"."daily_manual_macros_logs" CASCADE;
DROP TABLE IF EXISTS "public"."daily_vitals_logs" CASCADE;
DROP TABLE IF EXISTS "public"."daily_weight_logs" CASCADE;
DROP TABLE IF EXISTS "public"."user_recipes" CASCADE;
DROP TABLE IF EXISTS "public"."pantry_items" CASCADE;
DROP TABLE IF EXISTS "public"."planned_meals" CASCADE;
DROP TABLE IF EXISTS "public"."favorite_recipes" CASCADE;
DROP TABLE IF EXISTS "public"."profiles" CASCADE;

DROP TYPE IF EXISTS "public"."meal_type";
DROP TYPE IF EXISTS "public"."sex_type";
DROP TYPE IF EXISTS "public"."activity_level_type";
DROP TYPE IF EXISTS "public"."athlete_type";
DROP TYPE IF EXISTS "public"."primary_goal_type";
DROP TYPE IF EXISTS "public"."training_experience_level_type";
DROP TYPE IF EXISTS "public"."subscription_status_type";
DROP TYPE IF EXISTS "public"."energy_level_v2_type";
DROP TYPE IF EXISTS "public"."soreness_level_type";
DROP TYPE IF EXISTS "public"."activity_yesterday_level_type";


-- Create custom ENUM types
CREATE TYPE "public"."meal_type" AS ENUM ('Breakfast', 'Lunch', 'Dinner', 'Snack');
CREATE TYPE "public"."sex_type" AS ENUM ('male', 'female', 'notSpecified');
CREATE TYPE "public"."activity_level_type" AS ENUM ('sedentary', 'light', 'moderate', 'active', 'veryActive');
CREATE TYPE "public"."athlete_type" AS ENUM ('endurance', 'strengthPower', 'generalFitness', 'notSpecified');
CREATE TYPE "public"."primary_goal_type" AS ENUM ('fatLoss', 'muscleGain', 'maintenance', 'notSpecified');
CREATE TYPE "public"."training_experience_level_type" AS ENUM ('beginner', 'intermediate', 'advanced', 'veryAdvanced', 'notSpecified');
CREATE TYPE "public"."subscription_status_type" AS ENUM ('active', 'inactive', 'none');
CREATE TYPE "public"."energy_level_v2_type" AS ENUM ('low', 'moderate', 'high', 'vibrant');
CREATE TYPE "public"."soreness_level_type" AS ENUM ('none', 'mild', 'moderate', 'severe');
CREATE TYPE "public"."activity_yesterday_level_type" AS ENUM ('rest', 'light', 'moderate', 'strenuous');


-- Profiles Table
-- Stores all user-specific settings and calculated data.
CREATE TABLE "public"."profiles" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "name" "text",
    "email" "text",
    "macro_targets" "jsonb",
    "dietary_preferences" "text"[],
    "allergens" "text"[],
    "meal_structure" "jsonb",
    "height_cm" real,
    "weight_kg" real,
    "age" smallint,
    "sex" "public"."sex_type",
    "activity_level" "public"."activity_level_type",
    "training_experience_level" "public"."training_experience_level_type",
    "body_fat_percentage" real,
    "athlete_type" "public"."athlete_type",
    "primary_goal" "public"."primary_goal_type",
    "tdee" integer,
    "lean_body_mass_kg" real,
    "rda" "jsonb",
    "neck_circumference_cm" real,
    "abdomen_circumference_cm" real,
    "waist_circumference_cm" real,
    "hip_circumference_cm" real,
    "dashboard_settings" "jsonb",
    "subscription_status" "public"."subscription_status_type" DEFAULT 'none'::public.subscription_status_type,
    "plan_name" "text",
    "subscription_start_date" timestamp with time zone,
    "subscription_end_date" timestamp with time zone,
    "subscription_duration" "text",
    "has_accepted_terms" boolean DEFAULT false,
    "last_check_in_date" "date",
    "target_weight_change_rate_kg" real,
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users" ON "public"."profiles" FOR SELECT TO "authenticated" USING (auth.uid() = id);
CREATE POLICY "Enable update for users based on user_id" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Enable insert for authenticated users" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (auth.uid() = id);


-- Planned Meals Table
-- Stores meals planned by users for specific dates.
CREATE TABLE "public"."planned_meals" (
    "id" "uuid" PRIMARY KEY DEFAULT "gen_random_uuid"(),
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recipe_id" integer NOT NULL,
    "date" "date" NOT NULL,
    "meal_type" "public"."meal_type" NOT NULL,
    "servings" real NOT NULL,
    "status" "text" DEFAULT 'planned'::text NOT NULL,
    CONSTRAINT "planned_meals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);
ALTER TABLE "public"."planned_meals" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable CRUD for users based on user_id" ON "public"."planned_meals" FOR ALL TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- Pantry Items Table
-- Stores ingredients the user has in their pantry.
CREATE TABLE "public"."pantry_items" (
    "id" "uuid" PRIMARY KEY DEFAULT "gen_random_uuid"(),
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "name" "text" NOT NULL,
    "quantity" real NOT NULL,
    "unit" "text",
    "category" "text",
    "expiry_date" "date",
    CONSTRAINT "pantry_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);
ALTER TABLE "public"."pantry_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable CRUD for users based on user_id" ON "public"."pantry_items" FOR ALL TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- User Recipes Table
-- Stores custom recipes created by users.
CREATE TABLE "public"."user_recipes" (
    "id" SERIAL PRIMARY KEY,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "image" "text",
    "servings" real,
    "prep_time" "text",
    "cook_time" "text",
    "chill_time" "text",
    "ingredients" "text"[],
    "macros_per_serving" "jsonb",
    "micronutrients_per_serving" "jsonb",
    "instructions" "text"[],
    "tags" "text"[],
    CONSTRAINT "user_recipes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);
ALTER TABLE "public"."user_recipes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable CRUD for users based on user_id" ON "public"."user_recipes" FOR ALL TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- Favorite Recipes Table
-- Stores the relationship between users and their favorited recipes.
CREATE TABLE "public"."favorite_recipes" (
    "user_id" "uuid" NOT NULL,
    "recipe_id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("user_id", "recipe_id"),
    CONSTRAINT "favorite_recipes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);
ALTER TABLE "public"."favorite_recipes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable CRUD for users based on user_id" ON "public"."favorite_recipes" FOR ALL TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- Daily Weight Logs Table
CREATE TABLE "public"."daily_weight_logs" (
    "id" "uuid" PRIMARY KEY DEFAULT "gen_random_uuid"(),
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "weight_kg" real NOT NULL,
    UNIQUE ("user_id", "date"),
    CONSTRAINT "daily_weight_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);
ALTER TABLE "public"."daily_weight_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable CRUD for users based on user_id" ON "public"."daily_weight_logs" FOR ALL TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- Daily Vitals Logs Table
CREATE TABLE "public"."daily_vitals_logs" (
    "id" "uuid" PRIMARY KEY DEFAULT "gen_random_uuid"(),
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sleep_quality" smallint,
    "energy_level" "public"."energy_level_v2_type",
    "cravings_level" smallint,
    "muscle_soreness" "public"."soreness_level_type",
    "activity_yesterday" "public"."activity_yesterday_level_type",
    "notes" "text",
    UNIQUE ("user_id", "date"),
    CONSTRAINT "daily_vitals_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);
ALTER TABLE "public"."daily_vitals_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable CRUD for users based on user_id" ON "public"."daily_vitals_logs" FOR ALL TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- Daily Manual Macros Logs Table
CREATE TABLE "public"."daily_manual_macros_logs" (
    "id" "uuid" PRIMARY KEY DEFAULT "gen_random_uuid"(),
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "macros" "jsonb",
    UNIQUE ("user_id", "date"),
    CONSTRAINT "daily_manual_macros_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);
ALTER TABLE "public"."daily_manual_macros_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable CRUD for users based on user_id" ON "public"."daily_manual_macros_logs" FOR ALL TO "authenticated" USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
