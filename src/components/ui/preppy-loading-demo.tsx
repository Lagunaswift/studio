"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { Separator } from './separator';
import { 
  PreppyLoading, 
  ContextualPreppyLoading, 
  EnhancedPreppyLoading,
  MealPlanLoading,
  WeeklyAnalysisLoading,
  RecipeSearchLoading,
  ChatThinkingLoading
} from './enhanced-preppy-loading';

export function PreppyLoadingDemo() {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [demoContext, setDemoContext] = useState({
    hasAllergies: false,
    isVegetarian: false,
    currentGoal: 'weight_loss' as const,
    timeOfDay: 'morning' as const,
    isNewUser: false,
    moodToday: 'motivated' as const
  });

  const demos = [
    {
      id: 'basic',
      title: 'Basic Preppy Loading',
      description: 'Simple rotating messages with Preppy personality',
      component: (
        <PreppyLoading 
          type="meal-plan" 
          duration={5000} 
          size="md"
        />
      )
    },
    {
      id: 'contextual',
      title: 'Context-Aware Loading',
      description: 'Adapts messages based on user preferences and context',
      component: (
        <ContextualPreppyLoading 
          type="meal-plan" 
          duration={6000}
          userContext={demoContext}
          personality="encouraging"
          showInsights
        />
      )
    },
    {
      id: 'enhanced-premium',
      title: 'Enhanced Premium Loading',
      description: 'Premium version with particles and breathing animation',
      component: (
        <EnhancedPreppyLoading 
          type="meal-plan" 
          duration={7000}
          variant="premium"
          showParticles
          showInsights
          pulseColor="purple"
        />
      )
    },
    {
      id: 'meal-plan',
      title: 'Meal Plan Generation',
      description: 'Specialized loading for meal plan generation',
      component: (
        <MealPlanLoading 
          duration={8000}
          userContext={{
            hasAllergies: true,
            isVegetarian: true,
            currentGoal: 'weight_loss',
            timeOfDay: 'morning',
            preferredCuisines: ['Mediterranean', 'Asian']
          }}
          showProgress
        />
      )
    },
    {
      id: 'weekly-analysis',
      title: 'Weekly Check-in Analysis',
      description: 'Data analysis with insights and progress tracking',
      component: (
        <WeeklyAnalysisLoading 
          duration={10000}
          userContext={{
            currentGoal: 'muscle_gain',
            fitnessLevel: 'intermediate',
            moodToday: 'motivated'
          }}
          showProgress
        />
      )
    },
    {
      id: 'recipe-search',
      title: 'Recipe Search',
      description: 'Quick recipe finding with particle effects',
      component: (
        <RecipeSearchLoading 
          duration={4000}
          userContext={{
            hasCookingTime: false,
            preferredCuisines: ['Italian', 'Mexican']
          }}
        />
      )
    },
    {
      id: 'chat-thinking',
      title: 'Chat Thinking',
      description: 'Compact loading for chat responses',
      component: (
        <ChatThinkingLoading 
          duration={3000}
          userContext={{
            currentGoal: 'maintenance',
            timeOfDay: 'afternoon'
          }}
        />
      )
    },
    {
      id: 'variations',
      title: 'Color & Style Variations',
      description: 'Different colors and visual styles',
      component: (
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <Badge className="mb-2" variant="outline">Teal Theme</Badge>
            <EnhancedPreppyLoading 
              type="recipe" 
              duration={5000}
              variant="glow"
              pulseColor="teal"
              size="sm"
            />
          </div>
          <div className="text-center">
            <Badge className="mb-2" variant="outline">Gold Theme</Badge>
            <EnhancedPreppyLoading 
              type="data-analysis" 
              duration={5000}
              variant="particles"
              pulseColor="gold"
              size="sm"
            />
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Preppy Loading System Demo</h1>
        <p className="text-gray-600">Experience Sims-style loading with AI personality</p>
      </div>

      {/* Context Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Demo Context Controls</CardTitle>
          <CardDescription>
            Adjust these settings to see how contextual loading adapts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={demoContext.hasAllergies}
                onChange={(e) => setDemoContext(prev => ({ ...prev, hasAllergies: e.target.checked }))}
              />
              <span className="text-sm">Has Allergies</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={demoContext.isVegetarian}
                onChange={(e) => setDemoContext(prev => ({ ...prev, isVegetarian: e.target.checked }))}
              />
              <span className="text-sm">Vegetarian</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={demoContext.isNewUser}
                onChange={(e) => setDemoContext(prev => ({ ...prev, isNewUser: e.target.checked }))}
              />
              <span className="text-sm">New User</span>
            </label>
            
            <div>
              <label className="text-sm font-medium">Goal:</label>
              <select 
                value={demoContext.currentGoal}
                onChange={(e) => setDemoContext(prev => ({ ...prev, currentGoal: e.target.value as any }))}
                className="ml-2 text-sm border rounded px-2 py-1"
              >
                <option value="weight_loss">Weight Loss</option>
                <option value="muscle_gain">Muscle Gain</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Time:</label>
              <select 
                value={demoContext.timeOfDay}
                onChange={(e) => setDemoContext(prev => ({ ...prev, timeOfDay: e.target.value as any }))}
                className="ml-2 text-sm border rounded px-2 py-1"
              >
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Mood:</label>
              <select 
                value={demoContext.moodToday}
                onChange={(e) => setDemoContext(prev => ({ ...prev, moodToday: e.target.value as any }))}
                className="ml-2 text-sm border rounded px-2 py-1"
              >
                <option value="motivated">Motivated</option>
                <option value="tired">Tired</option>
                <option value="stressed">Stressed</option>
                <option value="happy">Happy</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Grid */}
      <div className="grid gap-6">
        {demos.map((demo) => (
          <Card key={demo.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{demo.title}</CardTitle>
                  <CardDescription>{demo.description}</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setActiveDemo(activeDemo === demo.id ? null : demo.id)}
                  variant={activeDemo === demo.id ? "destructive" : "default"}
                >
                  {activeDemo === demo.id ? 'Stop Demo' : 'Start Demo'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border border-gray-200 rounded-lg p-6 min-h-[300px] flex items-center justify-center bg-gray-50">
                {activeDemo === demo.id ? demo.component : (
                  <div className="text-center text-gray-500">
                    <p>Click "Start Demo" to see this loading animation</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Implementation Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Basic Usage:</h4>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`import { MealPlanLoading } from '@/components/ui/enhanced-preppy-loading';

<MealPlanLoading 
  duration={8000}
  userContext={{ hasAllergies: true, currentGoal: 'weight_loss' }}
  showProgress
/>`}
              </pre>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-semibold mb-2">Available Components:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li><code>MealPlanLoading</code> - For meal plan generation</li>
                <li><code>WeeklyAnalysisLoading</code> - For data analysis</li>
                <li><code>RecipeSearchLoading</code> - For recipe searches</li>
                <li><code>ChatThinkingLoading</code> - For chat responses</li>
                <li><code>EnhancedPreppyLoading</code> - Fully customizable</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}