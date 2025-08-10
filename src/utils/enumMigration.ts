import type { UserProfileSettings } from '@/types';

export function migrateEnumValues(profile: Partial<UserProfileSettings>): Partial<UserProfileSettings> {
  const migrated = { ...profile };

  if (migrated.athleteType) {
    const athleteTypeMap: Record<string, string> = {
      'strengthPower': 'strength',
      'teamSport': 'strength',
      'weekendWarrior': 'strength',
    };
    
    if (athleteTypeMap[migrated.athleteType as string]) {
      console.log(`🔄 Migrating athleteType: ${migrated.athleteType} → ${athleteTypeMap[migrated.athleteType as string]}`);
      migrated.athleteType = athleteTypeMap[migrated.athleteType as string] as any;
    }
  }

  if (migrated.primaryGoal) {
    const primaryGoalMap: Record<string, string> = {
      'fatLoss': 'weightLoss',
    };
    
    if (primaryGoalMap[migrated.primaryGoal as string]) {
      console.log(`🔄 Migrating primaryGoal: ${migrated.primaryGoal} → ${primaryGoalMap[migrated.primaryGoal as string]}`);
      migrated.primaryGoal = primaryGoalMap[migrated.primaryGoal as string] as any;
    }
  }

  if (migrated.activityLevel) {
    const activityLevelMap: Record<string, string> = {
      'light': 'lightlyActive',
      'moderate': 'moderatelyActive',
      'active': 'veryActive',
      'veryactive': 'veryActive',
    };
    
    if (activityLevelMap[migrated.activityLevel as string]) {
      console.log(`🔄 Migrating activityLevel: ${migrated.activityLevel} → ${activityLevelMap[migrated.activityLevel as string]}`);
      migrated.activityLevel = activityLevelMap[migrated.activityLevel as string] as any;
    }
  }

  return migrated;
}

export function validateAndFallbackEnums(profile: Partial<UserProfileSettings>): Partial<UserProfileSettings> {
  const validated = { ...profile };

  const validAthleteTypes = ['notSpecified', 'endurance', 'strength'];
  const validPrimaryGoals = ['notSpecified', 'weightLoss', 'muscleGain', 'maintenance', 'performance'];
  const validActivityLevels = ['notSpecified', 'sedentary', 'lightlyActive', 'moderatelyActive', 'veryActive', 'extraActive'];

  if (validated.athleteType && !validAthleteTypes.includes(validated.athleteType as string)) {
    console.warn(`⚠️ Invalid athleteType '${validated.athleteType}', falling back to 'notSpecified'`);
    validated.athleteType = 'notSpecified' as any;
  }

  if (validated.primaryGoal && !validPrimaryGoals.includes(validated.primaryGoal as string)) {
    console.warn(`⚠️ Invalid primaryGoal '${validated.primaryGoal}', falling back to 'notSpecified'`);
    validated.primaryGoal = 'notSpecified' as any;
  }

  if (validated.activityLevel && !validActivityLevels.includes(validated.activityLevel as string)) {
    console.warn(`⚠️ Invalid activityLevel '${validated.activityLevel}', falling back to 'notSpecified'`);
    validated.activityLevel = 'notSpecified' as any;
  }

  return validated;
}