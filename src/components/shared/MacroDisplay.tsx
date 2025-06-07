import type { Macros } from '@/types';
import { Flame, Beef, Wheat, Droplets } from 'lucide-react'; // Using more generic icons for macros
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MacroDisplayProps {
  macros: Macros;
  title?: string;
  className?: string;
  highlightTotal?: boolean;
}

const MacroItem: React.FC<{ icon: React.ElementType; label: string; value: number; unit: string; colorClass: string }> = ({ icon: Icon, label, value, unit, colorClass }) => (
  <div className="flex items-center space-x-2">
    <Icon className={`h-5 w-5 ${colorClass}`} />
    <div>
      <p className="text-sm font-medium">{label}</p>
      <p className={`text-lg font-bold ${colorClass}`}>
        {value.toFixed(0)}{unit}
      </p>
    </div>
  </div>
);

export function MacroDisplay({ macros, title = "Nutritional Information", className, highlightTotal = false }: MacroDisplayProps) {
  const cardClass = highlightTotal ? "border-accent shadow-lg" : "shadow-md";
  const titleClass = highlightTotal ? "text-accent font-bold" : "text-primary";

  return (
    <Card className={cn("w-full", className, cardClass)}>
      <CardHeader>
        <CardTitle className={cn("text-xl", titleClass)}>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MacroItem icon={Flame} label="Calories" value={macros.calories} unit="" colorClass="text-red-500" />
        <MacroItem icon={Beef} label="Protein" value={macros.protein} unit="g" colorClass="text-blue-500" />
        <MacroItem icon={Wheat} label="Carbs" value={macros.carbs} unit="g" colorClass="text-green-500" />
        <MacroItem icon={Droplets} label="Fat" value={macros.fat} unit="g" colorClass="text-yellow-500" />
      </CardContent>
    </Card>
  );
}
