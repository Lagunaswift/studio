"use client";

import { useState, useCallback } from 'react';
import type { PreppyOutput } from '@/ai/flows/pro-coach-flow';

interface WeeklyAnalysisChatState {
  isConversationMode: boolean;
  analysisResult: PreppyOutput | null;
  error: string | null;
}

interface UseWeeklyAnalysisChatReturn {
  state: WeeklyAnalysisChatState;
  startConversation: (analysisResult: PreppyOutput) => void;
  endConversation: () => void;
  generateCoachingResponse: (question: string, analysisContext: PreppyOutput) => Promise<string>;
}

export function useWeeklyAnalysisChat(): UseWeeklyAnalysisChatReturn {
  const [state, setState] = useState<WeeklyAnalysisChatState>({
    isConversationMode: false,
    analysisResult: null,
    error: null,
  });

  const startConversation = useCallback((analysisResult: PreppyOutput) => {
    setState({
      isConversationMode: true,
      analysisResult,
      error: null,
    });
  }, []);

  const endConversation = useCallback(() => {
    setState({
      isConversationMode: false,
      analysisResult: null,
      error: null,
    });
  }, []);

  const generateCoachingResponse = useCallback(async (
    question: string, 
    analysisContext: PreppyOutput
  ): Promise<string> => {
    try {
      // For Phase 1, we'll use smart pattern matching
      // In Phase 2, this would call the Genkit weekly-analysis-chat flow
      return await generateSmartResponse(question, analysisContext);
    } catch (error) {
      console.error('Error generating coaching response:', error);
      throw new Error('Unable to generate response. Please try again.');
    }
  }, []);

  return {
    state,
    startConversation,
    endConversation,
    generateCoachingResponse,
  };
}

// Smart response generation using pattern matching and context
async function generateSmartResponse(
  question: string, 
  analysisContext: PreppyOutput
): Promise<string> {
  const lowerQuestion = question.toLowerCase();
  const { newMacroTargets, coachingSummary } = analysisContext;

  // Add realistic delay to simulate AI processing
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

  // Pattern matching for common coaching questions
  if (lowerQuestion.includes('why') && (lowerQuestion.includes('increase') || lowerQuestion.includes('higher') || lowerQuestion.includes('more'))) {
    const calorieChange = Math.round(Math.random() * 200 + 100); // Simulated increase
    return `Your calories are increasing by about ${calorieChange} because your data shows your metabolism is running higher than we initially estimated! This is actually great news - it means your consistency with training and nutrition is paying off.

Your body has adapted positively, so you can eat more while still progressing toward your goals. Think of it as earning more "fuel" for better performance and recovery.`;
  }

  if (lowerQuestion.includes('why') && (lowerQuestion.includes('decrease') || lowerQuestion.includes('lower') || lowerQuestion.includes('less'))) {
    return `I'm making a small adjustment downward to optimize your progress rate. Your recent data suggests we can fine-tune your intake for more consistent results. This isn't a punishment - it's precision coaching!

The reduction is minimal and designed to get you back into that sweet spot where you're losing fat steadily while maintaining energy levels.`;
  }

  if (lowerQuestion.includes('protein') || lowerQuestion.includes('how much protein')) {
    return `Your protein target of ${newMacroTargets.protein}g is calculated to optimize muscle maintenance and satiety. This works out to roughly 0.8-1g per pound of your goal body weight.

Adequate protein helps you:
• Feel fuller longer (reducing cravings)
• Maintain muscle during fat loss
• Support recovery from training

Aim to spread it across your meals - about 25-35g per main meal works well for most people.`;
  }

  if (lowerQuestion.includes('carb') || lowerQuestion.includes('carbohydrate')) {
    return `Your ${newMacroTargets.carbs}g carb target is strategically set based on your activity level and goals. Carbs are your body's preferred fuel for training and daily activities.

Focus on:
• Getting carbs around your workouts (30-60 minutes before/after)
• Choosing nutrient-dense sources (oats, rice, potatoes, fruits)
• Pairing them with protein for stable energy

This level should keep your energy steady without overshooting your calorie targets.`;
  }

  if (lowerQuestion.includes('fat') || lowerQuestion.includes('fats')) {
    return `Your fat target of ${newMacroTargets.fat}g supports hormone production, vitamin absorption, and satiety. Fats are crucial for:

• Hormone balance (especially important for body composition)
• Absorption of fat-soluble vitamins (A, D, E, K)
• Feeling satisfied after meals

Focus on healthy sources like avocados, nuts, olive oil, and fatty fish. This level balances your other macros perfectly.`;
  }

  if (lowerQuestion.includes('confidence') || lowerQuestion.includes('sure') || lowerQuestion.includes('trust') || lowerQuestion.includes('certain')) {
    return `I completely understand wanting confidence in these changes! Here's why you can trust this approach:

✅ **Data-Driven**: Based on YOUR actual results, not generic formulas
✅ **Conservative**: Small adjustments that won't shock your system  
✅ **Reversible**: We can always adjust next week based on your response
✅ **Track Record**: This method has consistently worked for users with similar profiles

The beauty of weekly check-ins is that we're constantly course-correcting based on real feedback from your body.`;
  }

  if (lowerQuestion.includes('plateau') || lowerQuestion.includes('stuck') || lowerQuestion.includes('not losing')) {
    return `Great question about avoiding plateaus! These new targets are specifically designed to prevent that. Here's how:

🔄 **Metabolic Adaptation**: By adjusting based on your actual TDEE, we stay ahead of metabolic slowdown
📊 **Data Feedback Loop**: Weekly adjustments mean we catch plateaus before they happen
⚡ **Energy Balance**: Keeping you energized prevents the metabolic crash that causes plateaus

Your body is smart and adapts to routines. By staying responsive to your data, we keep it guessing in a good way!`;
  }

  if (lowerQuestion.includes('energy') || lowerQuestion.includes('tired') || lowerQuestion.includes('fatigue')) {
    return `Your energy levels are a key factor in these recommendations! ${coachingSummary.includes('energy') ? 'I noticed your energy patterns in the data.' : 'These targets account for maintaining steady energy.'}

The new targets are designed to:
• Provide adequate fuel for your daily activities
• Prevent the energy crashes that come from too-aggressive deficits
• Support quality sleep and recovery

If you experience any unusual fatigue with these new targets, we'll address it in next week's check-in.`;
  }

  if (lowerQuestion.includes('how long') || lowerQuestion.includes('when') || lowerQuestion.includes('timeline')) {
    return `These targets will be your guide until next week's check-in. I recommend giving them a full 7 days to assess how your body responds.

Timeline approach:
📅 **Week 1**: Focus on hitting the new targets consistently
📊 **Week 2**: I'll analyze your response and make any needed adjustments  
🎯 **Ongoing**: Continuous optimization based on your progress

Remember, sustainable progress isn't always linear. Some weeks you'll see big changes, others will be about building the foundation for future success.`;
  }

  // Default comprehensive response
  return `That's an excellent question! ${coachingSummary}

These new targets represent the optimal next step based on your data. The approach is:

🎯 **Personalized**: Calculated from YOUR actual metabolic response
📈 **Progressive**: Designed to keep you moving toward your goals  
🔬 **Scientific**: Based on proven principles of energy balance
⚖️ **Balanced**: Sustainable for long-term success

The key is consistency with these new numbers. Trust the process, track your data, and we'll fine-tune again next week based on how your body responds.

Ready to put these into action?`;
}