"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone, Monitor, Share, Apple } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { safeLocalStorage } from '@/lib/safe-storage';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function EnhancedPWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Detect platform and installation status
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    
    setIsIOS(iOS);
    setIsStandalone(standalone);
    setIsInstalled(standalone);

    // Check dismissal history
    const dismissed = safeLocalStorage.getItem('pwa-install-dismissed');
    const lastDismissed = dismissed ? parseInt(dismissed) : 0;
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    // Show banner if not dismissed recently and not installed
    const shouldShow = lastDismissed < oneDayAgo && !standalone;
    setShowInstallBanner(shouldShow);

    // Event handlers
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (shouldShow) {
        setShowInstallBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      
      // Track installation success
      if (typeof window.gtag !== 'undefined') {
        window.gtag('event', 'pwa_install_success', {
          method: 'browser_prompt'
        });
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) {
      // Show manual install instructions
      alert('To install: Look for "Add to Home Screen" or "Install" in your browser menu (⋮)');
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      // Track user choice
      if (typeof window.gtag !== 'undefined') {
        window.gtag('event', 'pwa_install_prompt_result', {
          result: outcome
        });
      }
      
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    } catch (error) {
      console.error('PWA installation failed:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    safeLocalStorage.setItem('pwa-install-dismissed', Date.now().toString());
    
    if (typeof window.gtag !== 'undefined') {
      window.gtag('event', 'pwa_install_dismissed');
    }
  };

  if (isInstalled || (!showInstallBanner && !showIOSInstructions)) {
    return null;
  }

  return (
    <>
      {/* Install Banner for Desktop/Android */}
      {showInstallBanner && !isIOS && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-full duration-300">
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 shadow-2xl">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 mr-3">
                  <div className="flex items-center mb-2">
                    <Smartphone className="h-5 w-5 mr-2" />
                    <span className="font-semibold">Install MealPreppyPro</span>
                  </div>
                  <p className="text-sm text-blue-100 mb-3">
                    ✨ Get offline access, push notifications, and faster loading!
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleInstallClick}
                      size="sm"
                      className="bg-white text-blue-600 hover:bg-blue-50 font-medium"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Install App
                    </Button>
                    <Button
                      onClick={handleDismiss}
                      size="sm"
                      variant="ghost"
                      className="text-blue-100 hover:bg-blue-700"
                    >
                      Maybe Later
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={handleDismiss}
                  size="sm"
                  variant="ghost"
                  className="text-blue-100 hover:bg-blue-700 p-1 h-auto"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* iOS Install Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <Apple className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                <h3 className="text-lg font-semibold mb-2">Install on iOS</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Add MealPreppyPro to your home screen for the best experience
                </p>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                  <div>
                    <p className="font-medium">Tap the Share button</p>
                    <p className="text-gray-600">
                      <Share className="inline h-4 w-4 mr-1" />
                      Look for the share icon at the bottom of Safari
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                  <div>
                    <p className="font-medium">Select "Add to Home Screen"</p>
                    <p className="text-gray-600">Scroll down and tap the option</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                  <div>
                    <p className="font-medium">Tap "Add"</p>
                    <p className="text-gray-600">Confirm to add the app to your home screen</p>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={() => setShowIOSInstructions(false)}
                className="w-full mt-6"
                variant="outline"
              >
                Got it!
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

// Export for use in layout
export default EnhancedPWAInstaller;
export { EnhancedPWAInstaller as PWAInstaller };