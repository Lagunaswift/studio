
"use client";

import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { Droplets } from 'lucide-react';
import type { RDA } from '@/types';
import { Progress } from '@/components/ui/progress';

interface DetailedNutrition {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    cholesterol?: number;
    potassium?: number;
    calcium?: number;
    iron?: number;
    vitaminA?: number;
    vitaminC?: number;
    vitaminD?: number;
    vitaminE?: number;
    vitaminK?: number;
    thiamine?: number;
    riboflavin?: number;
    niacin?: number;
    vitaminB6?: number;
    vitaminB12?: number;
    magnesium?: number;
    phosphorus?: number;
    zinc?: number;
    copper?: number;
    selenium?: number;
    manganese?: number;
    chromium?: number;
    molybdenum?: number;
    choline?: number;
    folate?: number;
}

interface NutritionTableProps {
  nutritionData: DetailedNutrition | null;
  rdaData: RDA | null;
}

const NutritionRow: React.FC<{ label: string; value: number | undefined | null; unit: string; target?: number | null }> = ({ label, value, unit, target }) => {
    const displayValue = (typeof value === 'number' && !isNaN(value)) ? value.toFixed(1) : '-';
    // Calculate progress, ensuring target is not zero to prevent division errors. Defaults to 0.
    const progressValue = (value && target) ? (value / target) * 100 : 0;

    return (
        <div className="flex flex-col space-y-1.5 py-2 px-2 rounded hover:bg-muted/50">
            <div className="flex justify-between items-baseline text-sm">
                <span className="text-muted-foreground">{label}</span>
                <div className="flex items-center gap-x-2">
                    <span className="font-mono text-primary">{displayValue} {unit}</span>
                    {target != null && <span className="font-mono text-xs text-muted-foreground">(Target: {target.toFixed(1)} {unit})</span>}
                </div>
            </div>
            {/* Render the progress bar if a target value is provided */}
            {target != null && <Progress value={progressValue} className="h-2 rounded-full" />}
        </div>
    );
};


export const NutritionTable: React.FC<NutritionTableProps> = ({ nutritionData, rdaData }) => {
  if (!nutritionData) return null;

  return (
    <section className="mt-8">
        <Card className="shadow-md">
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                    <AccordionTrigger className="px-6">
                        <div className="flex items-center">
                            <Droplets className="mr-2 h-5 w-5 text-accent" />
                            <h2 className="text-xl font-bold font-headline text-primary">View Detailed Nutritional Breakdown</h2>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pt-4">
                        <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                            {/* Vitamins Column */}
                            <div>
                                <h3 className="text-lg font-semibold text-primary mb-3 pl-2">Vitamins</h3>
                                <div className="space-y-1">
                                    <NutritionRow label="B1 (Thiamine)" value={nutritionData.thiamine} unit="mg" target={rdaData?.thiamine} />
                                    <NutritionRow label="B2 (Riboflavin)" value={nutritionData.riboflavin} unit="mg" target={rdaData?.riboflavin} />
                                    <NutritionRow label="B3 (Niacin)" value={nutritionData.niacin} unit="mg" target={rdaData?.niacin} />
                                    <NutritionRow label="B5 (Pantothenic Acid)" value={null} unit="mg" target={rdaData?.pantothenicAcid} />
                                    <NutritionRow label="B6 (Pyridoxine)" value={nutritionData.vitaminB6} unit="mg" target={rdaData?.pyridoxine} />
                                    <NutritionRow label="B12 (Cobalamin)" value={nutritionData.vitaminB12} unit="µg" target={rdaData?.cobalamin} />
                                    <NutritionRow label="Biotin" value={null} unit="µg" target={rdaData?.biotin} />
                                    <NutritionRow label="Choline" value={nutritionData.choline} unit="mg" target={rdaData?.choline} />
                                    <NutritionRow label="Folate" value={nutritionData.folate} unit="µg" target={rdaData?.folate} />
                                    <NutritionRow label="Vitamin A" value={nutritionData.vitaminA} unit="µg" target={rdaData?.vitaminA} />
                                    <NutritionRow label="Vitamin C" value={nutritionData.vitaminC} unit="mg" target={rdaData?.vitaminC} />
                                    <NutritionRow label="Vitamin D" value={nutritionData.vitaminD} unit="IU" target={rdaData?.vitaminD ? rdaData.vitaminD * 40 : undefined} />
                                    <NutritionRow label="Vitamin E" value={nutritionData.vitaminE} unit="mg" target={rdaData?.vitaminE} />
                                    <NutritionRow label="Vitamin K" value={nutritionData.vitaminK} unit="µg" target={rdaData?.vitaminK} />
                                </div>
                            </div>
                            
                            {/* Minerals Column */}
                            <div>
                               <h3 className="text-lg font-semibold text-primary mb-3 pl-2">Minerals</h3>
                                <div className="space-y-1">
                                    <NutritionRow label="Calcium" value={nutritionData.calcium} unit="mg" target={rdaData?.calcium} />
                                    <NutritionRow label="Chromium" value={nutritionData.chromium} unit="µg" target={rdaData?.chromium} />
                                    <NutritionRow label="Copper" value={nutritionData.copper} unit="mg" target={rdaData?.copper} />
                                    <NutritionRow label="Fluoride" value={null} unit="µg" target={rdaData?.fluoride} />
                                    <NutritionRow label="Iodine" value={null} unit="µg" target={rdaData?.iodine} />
                                    <NutritionRow label="Iron" value={nutritionData.iron} unit="mg" target={rdaData?.iron} />
                                    <NutritionRow label="Magnesium" value={nutritionData.magnesium} unit="mg" target={rdaData?.magnesium} />
                                    <NutritionRow label="Manganese" value={nutritionData.manganese} unit="mg" target={rdaData?.manganese} />
                                    <NutritionRow label="Molybdenum" value={nutritionData.molybdenum} unit="µg" target={rdaData?.molybdenum} />
                                    <NutritionRow label="Phosphorus" value={nutritionData.phosphorus} unit="mg" target={rdaData?.phosphorus} />
                                    <NutritionRow label="Potassium" value={nutritionData.potassium} unit="mg" target={rdaData?.potassium} />
                                    <NutritionRow label="Selenium" value={nutritionData.selenium} unit="µg" target={rdaData?.selenium} />
                                    <NutritionRow label="Sodium" value={nutritionData.sodium} unit="mg" target={rdaData?.sodium} />
                                    <NutritionRow label="Zinc" value={nutritionData.zinc} unit="mg" target={rdaData?.zinc} />
                                </div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </Card>
    </section>
  );
};
