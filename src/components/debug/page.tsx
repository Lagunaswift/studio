"use client";

import { RecipeLoadingDebugger } from '@/components/debug/RecipeLoadingDebugger';

export default function DebugPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Recipe Loading Debug</h1>
      <RecipeLoadingDebugger />
    </div>
  );
}