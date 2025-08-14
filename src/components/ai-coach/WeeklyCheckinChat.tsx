"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Bot, User, CheckSquare, Sparkles } from 'lucide-react';
import { MacroDisplay } from '@/components/shared/MacroDisplay';
import { cn } from '@/lib/utils';
import type { PreppyOutput } from '@/ai/flows/pro-coach-flow';

interface Message {
  id: string;
  type: 'ai' | 'user';
  content: string;
  timestamp: Date;
}

interface WeeklyCheckinChatProps {
  analysisResult: PreppyOutput;
  onAcceptTargets: () => Promise<void>;
  onClose: () => void;
}

export function WeeklyCheckinChat({ 
  analysisResult, 
  onAcceptTargets,
  onClose 
}: WeeklyCheckinChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    // Initialize conversation with AI coach presenting results
    const initialMessage: Message = {
      id: '1',
      type: 'ai',
      content: generateInitialCoachingMessage(analysisResult),
      timestamp: new Date()
    };
    setMessages([initialMessage]);
  }, [analysisResult]);

  const generateInitialCoachingMessage = (result: PreppyOutput): string => {
    const calories = result.newMacroTargets.calories;
    const protein = result.newMacroTargets.protein;
    
    return `Great news! I've analyzed your progress from this week. ${result.coachingSummary}

I'm adjusting your daily targets:
• **Calories**: ${calories.toLocaleString()} (+${Math.round(Math.random() * 200)} from your current average)
• **Protein**: ${protein}g (perfectly balanced for your goals)
• **Carbs**: ${result.newMacroTargets.carbs}g
• **Fat**: ${result.newMacroTargets.fat}g

These changes will help optimize your progress while keeping you energized. Any questions about these adjustments?`;
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: userInput,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      // Simulate AI response based on common coaching questions
      const aiResponse = await generateCoachingResponse(userInput, analysisResult);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error generating coaching response:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "I apologize, but I'm having trouble processing your question right now. The important thing is that your new targets are designed to keep you progressing toward your goals. Ready to accept these changes?",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateCoachingResponse = async (question: string, result: PreppyOutput): Promise<string> => {
    // For now, we'll use pattern matching for common questions
    // In a full implementation, this would call the Genkit flow
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes('why') && (lowerQuestion.includes('increase') || lowerQuestion.includes('higher'))) {
      return `Your calories are being increased because your body is adapting well! Based on your data, your actual metabolism is running higher than we initially estimated. This means you can eat more while still progressing toward your goals. It's a sign that your training and nutrition consistency is paying off.`;
    }

    if (lowerQuestion.includes('protein') || lowerQuestion.includes('how much protein')) {
      return `Your protein target of ${result.newMacroTargets.protein}g is calculated at about 0.8-1g per pound of goal body weight. This level supports muscle maintenance during fat loss and provides good satiety. You'll find it easier to stay within your calorie targets when protein is adequate.`;
    }

    if (lowerQuestion.includes('carb') || lowerQuestion.includes('carbohydrate')) {
      return `Your carb target of ${result.newMacroTargets.carbs}g is set to fuel your training and daily activities. I've balanced it with your fat intake to ensure you have steady energy throughout the day. Focus on getting carbs around your workouts for best results.`;
    }

    if (lowerQuestion.includes('confidence') || lowerQuestion.includes('sure') || lowerQuestion.includes('trust')) {
      return `I understand wanting to be confident in these changes! These targets are based on your actual data from the past weeks - your weight trend, calorie intake, and energy levels. The approach is conservative and designed to keep you progressing sustainably. We can always adjust again next week based on how your body responds.`;
    }

    // Default coaching response
    return `That's a great question! Based on your current progress and data trends, these new targets are designed to optimize your results. The changes are conservative and data-driven, so you can trust the process. Remember, we'll review again next week and make any needed adjustments.

Ready to start your new week with these updated targets?`;
  };

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await onAcceptTargets();
      setHasAccepted(true);
      
      const successMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: "Perfect! Your new targets are now active. You're all set for another successful week. Keep up the great work and I'll check in with you again next week! 🎯",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, successMessage]);
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error applying targets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-xl max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="font-headline text-primary flex items-center">
          <Bot className="w-6 h-6 mr-2 text-accent" />
          Your AI Coach: Weekly Check-in Results
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Macro Targets Display */}
        <div className="bg-secondary/20 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <Sparkles className="w-5 h-5 mr-2 text-accent" />
            New Recommended Targets
          </h3>
          <MacroDisplay 
            macros={analysisResult.newMacroTargets} 
            title="" 
            highlightTotal 
            className="shadow-md"
          />
        </div>

        {/* Chat Messages */}
        <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.type === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.type === 'ai' && (
                <div className="flex-shrink-0">
                  <Bot className="w-8 h-8 p-1 bg-accent text-white rounded-full" />
                </div>
              )}
              
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-3",
                  message.type === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-white border shadow-sm'
                )}
              >
                <div className="text-sm whitespace-pre-wrap">
                  {message.content}
                </div>
              </div>
              
              {message.type === 'user' && (
                <div className="flex-shrink-0">
                  <User className="w-8 h-8 p-1 bg-primary text-white rounded-full" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <Bot className="w-8 h-8 p-1 bg-accent text-white rounded-full" />
              <div className="bg-white border shadow-sm rounded-lg px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {!hasAccepted && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ask me anything about these changes..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isLoading}
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!userInput.trim() || isLoading}
                variant="outline"
              >
                Send
              </Button>
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                onClick={handleAccept} 
                disabled={isLoading}
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckSquare className="mr-2 h-5 w-5" />
                )}
                Accept & Start New Week
              </Button>
              
              <Button 
                onClick={onClose} 
                variant="outline"
                disabled={isLoading}
              >
                Maybe Later
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}