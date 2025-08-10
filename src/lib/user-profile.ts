// src/lib/user-profile.ts
import { adminDb } from '@/lib/firebase-admin';
import type { UserProfileSettings } from '@/types';
import { mergeWithDefaults } from '@/utils/profileDefaults';

export async function getUserProfile(userId: string): Promise<UserProfileSettings | null> {
    try {
        const profileDoc = await adminDb.collection('profiles').doc(userId).get();

        if (!profileDoc.exists) {
            console.log(`No profile found for user: ${userId}`);
            return null;
        }

        let userProfile = profileDoc.data() as Partial<UserProfileSettings>;

        // Data migration for activityLevel
        if (userProfile.activityLevel === ('moderate' as any)) {
            userProfile.activityLevel = 'moderatelyActive';
        }

        // Ensure required fields exist with proper defaults
        const profileWithDefaults: UserProfileSettings = {
            id: userId,
            email: userProfile.email || null,
            name: userProfile.name || null,
            macroTargets: userProfile.macroTargets || null,
            dietaryPreferences: userProfile.dietaryPreferences || [],
            allergens: userProfile.allergens || [],
            mealStructure: userProfile.mealStructure || [
                { id: '1', name: 'Breakfast', type: 'Breakfast' },
                { id: '2', name: 'Lunch', type: 'Lunch' },
                { id: '3', name: 'Dinner', type: 'Dinner' },
                { id: '4', name: 'Snack', type: 'Snack' },
            ],
            heightCm: userProfile.heightCm || null,
            weightKg: userProfile.weightKg || null,
            age: userProfile.age || null,
            sex: userProfile.sex || null,
            activityLevel: userProfile.activityLevel || 'notSpecified',
            training_experience_level: userProfile.training_experience_level || 'notSpecified',
            bodyFatPercentage: userProfile.bodyFatPercentage || null,
            athleteType: userProfile.athleteType || 'notSpecified',
            primaryGoal: userProfile.primaryGoal || 'notSpecified',
            tdee: userProfile.tdee || null,
            leanBodyMassKg: userProfile.leanBodyMassKg || null,
            subscription_status: userProfile.subscription_status || 'none',
            has_accepted_terms: userProfile.has_accepted_terms || false,
            last_check_in_date: userProfile.last_check_in_date || null,
            target_weight_change_rate_kg: userProfile.target_weight_change_rate_kg || null,
            dashboardSettings: userProfile.dashboardSettings || { 
                showMacros: true, 
                showMenu: true, 
                showFeaturedRecipe: true, 
                showQuickRecipes: true 
            },
            dailyWeightLog: userProfile.dailyWeightLog || [],
            dailyVitalsLog: userProfile.dailyVitalsLog || [],
            dailyManualMacrosLog: userProfile.dailyManualMacrosLog || [],
            favorite_recipe_ids: userProfile.favorite_recipe_ids || [],
            // Add any additional fields that might be missing
            neck_circumference_cm: userProfile.neck_circumference_cm || null,
            abdomen_circumference_cm: userProfile.abdomen_circumference_cm || null,
            waist_circumference_cm: userProfile.waist_circumference_cm || null,
            hip_circumference_cm: userProfile.hip_circumference_cm || null,
        };

        return mergeWithDefaults(profileWithDefaults, userId);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
}

export async function createInitialUserProfile(userId: string, userEmail: string | null): Promise<UserProfileSettings> {
    try {
        const userDocRef = adminDb.collection('profiles').doc(userId);
        
        // Check if profile already exists
        const existingDoc = await userDocRef.get();
        if (existingDoc.exists) {
            return getUserProfile(userId) as Promise<UserProfileSettings>;
        }

        const newProfile: UserProfileSettings = {
            id: userId,
            email: userEmail,
            name: null,
            macroTargets: null,
            dietaryPreferences: [],
            allergens: [],
            mealStructure: [
                { id: '1', name: 'Breakfast', type: 'Breakfast' },
                { id: '2', name: 'Lunch', type: 'Lunch' },
                { id: '3', name: 'Dinner', type: 'Dinner' },
                { id: '4', name: 'Snack', type: 'Snack' },
            ],
            heightCm: null,
            weightKg: null,
            age: null,
            sex: null,
            activityLevel: 'notSpecified',
            training_experience_level: 'notSpecified',
            bodyFatPercentage: null,
            athleteType: 'notSpecified',
            primaryGoal: 'notSpecified',
            tdee: null,
            leanBodyMassKg: null,
            subscription_status: 'none',
            has_accepted_terms: false,
            last_check_in_date: null,
            target_weight_change_rate_kg: null,
            dashboardSettings: { 
                showMacros: true, 
                showMenu: true, 
                showFeaturedRecipe: true, 
                showQuickRecipes: true 
            },
            dailyWeightLog: [],
            dailyVitalsLog: [],
            dailyManualMacrosLog: [],
            favorite_recipe_ids: [],
            neck_circumference_cm: null,
            abdomen_circumference_cm: null,
            waist_circumference_cm: null,
            hip_circumference_cm: null,
        };

        await userDocRef.set(newProfile);
        console.log(`Created new profile for user: ${userId}`);
        
        return mergeWithDefaults(newProfile, userId);
    } catch (error) {
        console.error('Error creating user profile:', error);
        throw error;
    }
}