
// src/lib/rda.ts
import type { Sex, MenopauseStatus, RDA } from '@/types';

export function getRdaProfile(sex: Sex | null, age: number | null, menopauseStatus: MenopauseStatus | null, weightKg: number | null): RDA | null {
    if (!sex || !age) {
        return null;
    }

    if (age >= 19 && age <= 64) {
        if (sex === 'male') {
            return {
                thiamine: 1.0,
                riboflavin: 1.3,
                niacin: 16.5,
                pantothenicAcid: 6,
                pyridoxine: 1.4,
                cobalamin: 1.5,
                choline: 400,
                folate: 200,
                vitaminA: 700,
                vitaminC: 40,
                vitaminD: 10, // 400 IU
                vitaminE: 4,
                vitaminK: weightKg ? weightKg * 1 : undefined,
                calcium: 700,
                chromium: 25,
                copper: 1.2,
                iodine: 140,
                iron: 8.7,
                magnesium: 300,
                manganese: 1.4,
                molybdenum: 65,
                phosphorus: 550,
                potassium: 3500,
                selenium: 75,
                sodium: 1600,
                zinc: 9.5,
            };
        } else { // female
            const ironTarget = (menopauseStatus === 'post' || age > 50) ? 8.7 : 14.8;
            return {
                thiamine: 0.8,
                riboflavin: 1.1,
                niacin: 13.2,
                pantothenicAcid: 6,
                pyridoxine: 1.2,
                cobalamin: 1.5,
                choline: 400,
                folate: 200,
                vitaminA: 600,
                vitaminC: 40,
                vitaminD: 10, // 400 IU
                vitaminE: 3,
                vitaminK: weightKg ? weightKg * 1 : undefined,
                calcium: 700,
                chromium: 25,
                copper: 1.2,
                iodine: 140,
                iron: ironTarget,
                magnesium: 270,
                manganese: 1.4,
                molybdenum: 65,
                phosphorus: 550,
                potassium: 3500,
                selenium: 60,
                sodium: 1600,
                zinc: 7.0,
            };
        }
    }
    
    // Return a default or null if outside the specified age range
    return null; 
}
