"use client";

import { ReactNode } from 'react';
import { Card, CardContent } from './card';
import { Button } from './button';
import { Alert, AlertDescription } from './alert';
import { cn } from '@/lib/utils';
import { 
  Crown, 
  Coffee, 
  Clock, 
  Sparkles, 
  Info,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

interface FriendlyErrorProps {
  type: 'limit' | 'error' | 'info' | 'warning';
  title: string;
  description: string;
  className?: string;
  actionButton?: {
    text: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  upgradeButton?: boolean;
  retryButton?: boolean;
  onRetry?: () => void;
  icon?: ReactNode;
}

export function FriendlyError({
  type,
  title,
  description,
  className,
  actionButton,
  upgradeButton = false,
  retryButton = false,
  onRetry,
  icon
}: FriendlyErrorProps) {
  
  const getDefaultIcon = () => {
    switch (type) {
      case 'limit':
        return <Crown className="w-6 h-6 text-accent" />;
      case 'error':
        return <Coffee className="w-6 h-6 text-primary" />;
      case 'info':
        return <Info className="w-6 h-6 text-primary" />;
      case 'warning':
        return <Clock className="w-6 h-6 text-accent" />;
      default:
        return <Sparkles className="w-6 h-6 text-primary" />;
    }
  };

  const getBackgroundClass = () => {
    switch (type) {
      case 'limit':
        return 'bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20';
      case 'error':
        return 'bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20';
      case 'info':
        return 'bg-gradient-to-br from-primary/5 to-muted/20 border-primary/20';
      case 'warning':
        return 'bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20';
      default:
        return 'bg-gradient-to-br from-muted/20 to-primary/5 border-muted/30';
    }
  };

  return (
    <Card className={cn("shadow-lg", getBackgroundClass(), className)}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 mt-1">
            {icon || getDefaultIcon()}
          </div>
          
          {/* Content */}
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {retryButton && onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="text-primary border-primary/20 hover:bg-primary/5"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              )}
              
              {actionButton && (
                <Button
                  variant={actionButton.variant || 'default'}
                  size="sm"
                  onClick={actionButton.onClick}
                  className={cn(
                    actionButton.variant === 'default' && 'bg-primary hover:bg-primary/90'
                  )}
                >
                  {actionButton.text}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              
              {upgradeButton && (
                <Button
                  variant="default"
                  size="sm"
                  className="bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-accent-foreground"
                  onClick={() => window.location.href = '/upgrade'}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade Now
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Specialized components for common error types
export function LimitReachedError({ 
  title = "Daily Limit Reached", 
  description = "You've reached your daily limit for AI requests. Upgrade to Premium for unlimited access!",
  onRetry,
  className 
}: { 
  title?: string; 
  description?: string; 
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <FriendlyError
      type="limit"
      title={title}
      description={description}
      className={className}
      upgradeButton
      retryButton={!!onRetry}
      onRetry={onRetry}
    />
  );
}

export function GenerationError({ 
  title = "Something Went Wrong", 
  description = "Preppy encountered an issue while generating your meal plan. Don't worry, this happens sometimes!",
  onRetry,
  className 
}: { 
  title?: string; 
  description?: string; 
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <FriendlyError
      type="error"
      title={title}
      description={description}
      className={className}
      retryButton={!!onRetry}
      onRetry={onRetry}
      actionButton={{
        text: "Contact Support",
        onClick: () => window.open('mailto:support@example.com', '_blank'),
        variant: 'outline'
      }}
    />
  );
}

export function InfoMessage({ 
  title, 
  description, 
  actionText,
  onAction,
  className 
}: { 
  title: string; 
  description: string; 
  actionText?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <FriendlyError
      type="info"
      title={title}
      description={description}
      className={className}
      actionButton={actionText && onAction ? {
        text: actionText,
        onClick: onAction,
        variant: 'outline'
      } : undefined}
    />
  );
}