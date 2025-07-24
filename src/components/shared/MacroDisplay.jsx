import { Flame, Beef, Wheat, Droplets } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
const MacroItem = ({ icon: Icon, label, value, unit, colorClass }) => (<div className="flex items-center space-x-1"> {/* Reduced space-x */}
    <Icon className={`h-4 w-4 ${colorClass}`}/> {/* Smaller icon */}
    <div>
      <p className="text-xs font-medium">{label}</p> {/* Smaller label */}
      <p className={`text-sm font-bold ${colorClass}`}> {/* Smaller value */}
        {value !== undefined && value !== null ? value.toFixed(0) : '0'}{unit}
      </p>
    </div>
  </div>);
export function MacroDisplay({ macros, title, className, highlightTotal = false }) {
    const cardClass = highlightTotal ? "border-accent shadow-lg" : "shadow-md";
    const currentMacros = macros || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    return (<Card className={cn("w-full", className, cardClass)}>
      {title && (<CardHeader className="p-2 pb-1"> {/* Reduced padding for header */}
          <CardTitle className={cn("text-base font-semibold", highlightTotal ? "text-accent" : "text-primary")}>{title}</CardTitle>
        </CardHeader>)}
      <CardContent className={cn("grid grid-cols-2 sm:grid-cols-4 gap-2 p-2", !title && "pt-2")}> {/* Reduced padding and gap, ensure padding-top if no header */}
        <MacroItem icon={Flame} label="Calories" value={currentMacros.calories} unit="kcal" colorClass="text-red-500"/>
        <MacroItem icon={Beef} label="Protein" value={currentMacros.protein} unit="g" colorClass="text-blue-500"/>
        <MacroItem icon={Wheat} label="Carbs" value={currentMacros.carbs} unit="g" colorClass="text-green-500"/>
        <MacroItem icon={Droplets} label="Fat" value={currentMacros.fat} unit="g" colorClass="text-yellow-500"/>
      </CardContent>
    </Card>);
}
