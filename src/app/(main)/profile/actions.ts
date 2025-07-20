
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import type { DailyVitalsLog, DailyManualMacrosLog, Macros } from '@/types';

// Define the shape of the vitals data
type VitalsData = {
  date: string; // e.g., '2025-07-20'
  sleepQuality?: number;
  energyLevel?: string;
  muscleSoreness?: string;
  cravingsLevel?: number;
  activityYesterday?: string;
  notes?: string;
}

export async function addOrUpdateVitalsLog(vitalsData: VitalsData) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Authentication required.' }

  const dataToUpsert = {
    user_id: user.id,
    date: vitalsData.date,
    sleepQuality: vitalsData.sleepQuality,
    energyLevel: vitalsData.energyLevel,
    cravingsLevel: vitalsData.cravingsLevel,
    muscleSoreness: vitalsData.muscleSoreness,
    activityYesterday: vitalsData.activityYesterday,
    notes: vitalsData.notes,
  };

  const { data, error } = await supabase
    .from('daily_vitals_logs')
    .upsert(dataToUpsert, { onConflict: 'date, user_id' }) 
    .select()
    .single() 

  if (error) {
    console.error('Error saving vitals log:', error)
    return { error: 'Could not save your daily vitals.' }
  }

  revalidatePath('/daily-log')
  return { success: true, data }
}


export async function addOrUpdateWeightLog(date: string, weight_kg: number) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Authentication required.' }

  const { data, error } = await supabase
    .from('daily_weight_logs')
    .upsert({
      user_id: user.id,
      date: date,
      weight_kg: weight_kg
    }, { onConflict: 'date, user_id' })
    .select()
    .single()

  if (error) {
    console.error('Error saving weight log:', error)
    return { error: 'Could not save your weight.' }
  }

  revalidatePath('/daily-log')
  return { success: true, data }
}

type ManualMacroData = {
    date: string;
    macros: Macros;
}

export async function addOrUpdateManualMacrosLog(macroData: ManualMacroData) {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Authentication required.' }

    const dataToUpsert = {
        user_id: user.id,
        date: macroData.date,
        calories: macroData.macros.calories,
        protein: macroData.macros.protein,
        carbs: macroData.macros.carbs,
        fat: macroData.macros.fat,
    };

    const { data, error } = await supabase
      .from('daily_manual_macros_logs')
      .upsert(dataToUpsert, { onConflict: 'date, user_id' })
      .select()
      .single()

    if (error) {
      console.error('Error saving manual macros log:', error)
      return { error: 'Could not save your manual macros.' }
    }
    
    // Convert back to nested structure for Dexie
    const resultData = {
        date: data.date,
        macros: {
            calories: data.calories,
            protein: data.protein,
            carbs: data.carbs,
            fat: data.fat,
        },
        user_id: data.user_id,
        id: data.id,
    };


    revalidatePath('/daily-log')
    return { success: true, data: resultData }
}
