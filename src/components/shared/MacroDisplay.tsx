
import type { Macros } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MacroDisplayProps {
  macros: Macros;
  title?: string;
  className?: string;
  highlightTotal?: boolean;
}

const MacroItem: React.FC<{ label: string; value: number; unit: string }> = ({ label, value, unit }) => (
  <div className="text-center">
    <p className="text-xs font-medium text-primary">{label}</p> {/* Teal labels */}
    <p className="text-sm font-bold text-accent"> {/* Gold numbers and units */}
      {value !== undefined && value !== null ? value.toFixed(0) : '0'}{unit}
    </p>
  </div>
);

export function MacroDisplay({ macros, title, className, highlightTotal = false }: MacroDisplayProps) {
  const cardClass = highlightTotal ? "border-accent shadow-lg" : "shadow-md";
  
  const currentMacros = macros || { calories: 0, protein: 0, carbs: 0, fat: 0 };

  return (
    <Card className={cn("w-full", className, cardClass)}>
      {title && ( 
        <CardHeader className="p-2 pb-1"> {/* Reduced padding for header */}
          <CardTitle className={cn("text-base font-semibold", highlightTotal ? "text-accent" : "text-primary")}>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn("grid grid-cols-2 sm:grid-cols-4 gap-4 p-4", !title && "pt-4")}> {/* Better spacing for clean layout */}
        <MacroItem label="Calories" value={currentMacros.calories} unit="kcal" />
        <MacroItem label="Protein" value={currentMacros.protein} unit="g" />
        <MacroItem label="Carbs" value={currentMacros.carbs} unit="g" />
        <MacroItem label="Fat" value={currentMacros.fat} unit="g" />
      </CardContent>
    </Card>
  );
}
