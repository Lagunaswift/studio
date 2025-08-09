
"use client";

import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqData = [
  {
    question: "How do I add a new recipe?",
    answer: "You can add a new recipe by navigating to the 'My Cookbook' section in the sidebar and clicking on 'Add Recipe'. Fill in the details and save."
  },
  {
    question: "How does the AI Meal Planner work?",
    answer: "The AI Meal Planner generates a meal plan for you based on your dietary preferences and macro targets. You can find it under the 'Preppy Coach' section."
  },
  {
    question: "How do I track my daily progress?",
    answer: "You can track your daily progress by logging your meals and weight in the 'Daily Log' section under 'Track Progress'."
  },
  {
    question: "Where can I set my dietary preferences and allergens?",
    answer: "You can set your dietary preferences and allergens in the 'Setup' section under 'Diet & Allergens'."
  }
];

export function FaqAccordion() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {faqData.map((faq, index) => (
        <AccordionItem value={`item-${index}`} key={index}>
          <AccordionTrigger>{faq.question}</AccordionTrigger>
          <AccordionContent>
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
