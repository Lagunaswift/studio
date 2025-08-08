"use client";

import React from 'react';
import { useOfflineActions } from '@/lib/background-sync';
import { Wifi, WifiOff, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function OfflineStatus() {
  const { pendingCount, isOnline } = useOfflineActions();

  if (isOnline && pendingCount === 0) {
    return null; // Don't show when everything is synced
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <Card className={`${isOnline ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'} shadow-lg`}>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-orange-600" />
            )}
            
            <span className={`text-sm font-medium ${isOnline ? 'text-green-800' : 'text-orange-800'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
            
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                <Clock className="h-3 w-3 mr-1" />
                {pendingCount} pending
              </Badge>
            )}
          </div>
          
          {!isOnline && (
            <p className="text-xs text-orange-600 mt-1">
              Changes will sync when connection is restored
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Add to your main layout
export default OfflineStatus;
