"use client";

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  X,
  Filter,
  ListChecks,
  Utensils,
  SlidersHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ViewMode } from '../hooks/useShoppingList';

interface ShoppingFiltersProps {
  // View state
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  
  // Category filter
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  sortedCategories: string[];
  
  // Data for counts
  totalItems: number;
  filteredItemsCount: number;
  
  className?: string;
}

export function ShoppingFilters({
  activeView,
  onViewChange,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  sortedCategories,
  totalItems,
  filteredItemsCount,
  className
}: ShoppingFiltersProps) {
  
  const clearSearch = () => {
    onSearchChange('');
  };
  
  const clearCategory = () => {
    onCategoryChange('all');
  };
  
  const hasActiveFilters = searchQuery.trim() !== '' || selectedCategory !== 'all';
  const isFiltered = filteredItemsCount !== totalItems;
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* View Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Tabs value={activeView} onValueChange={onViewChange as (value: string) => void}>
          <TabsList className="grid w-full grid-cols-2 sm:w-auto">
            <TabsTrigger value="aisle" className="flex items-center">
              <ListChecks className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Aisle View</span>
              <span className="sm:hidden">Aisle</span>
            </TabsTrigger>
            <TabsTrigger value="recipe" className="flex items-center">
              <Utensils className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Recipe View</span>
              <span className="sm:hidden">Recipe</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Filter summary */}
        {totalItems > 0 && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>
              {isFiltered ? (
                <>Showing {filteredItemsCount} of {totalItems} items</>
              ) : (
                <>{totalItems} items</>
              )}
            </span>
          </div>
        )}
      </div>
      
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={activeView === 'aisle' ? "Search items..." : "Search recipes or ingredients..."}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Category Filter (only for aisle view) */}
        {activeView === 'aisle' && sortedCategories.length > 0 && (
          <div className="sm:w-64">
            <Select value={selectedCategory} onValueChange={onCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {sortedCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      
      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" />
            <span>Active filters:</span>
          </div>
          
          {searchQuery.trim() !== '' && (
            <Badge variant="secondary" className="cursor-pointer" onClick={clearSearch}>
              Search: "{searchQuery}"
              <X className="h-3 w-3 ml-1" />
            </Badge>
          )}
          
          {selectedCategory !== 'all' && (
            <Badge variant="secondary" className="cursor-pointer" onClick={clearCategory}>
              Category: {selectedCategory}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          )}
          
          {/* Clear all filters button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearSearch();
              clearCategory();
            }}
            className="h-6 text-xs px-2"
          >
            Clear all
          </Button>
        </div>
      )}
      
      {/* View-specific hints */}
      <div className="text-xs text-muted-foreground border-l-2 border-accent/50 pl-3">
        {activeView === 'aisle' ? (
          <>
            <strong>Aisle View:</strong> Items are grouped by supermarket section and consolidated 
            for efficient shopping. Perfect for grocery store navigation.
          </>
        ) : (
          <>
            <strong>Recipe View:</strong> Items are organized by recipe with exact measurements. 
            Great for meal prep and ensuring you have everything for each dish.
          </>
        )}
      </div>
    </div>
  );
}