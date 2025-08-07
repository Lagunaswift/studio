// src/components/debug/RecipeLoadingDiagnostics.tsx
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Database, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw 
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';

interface DiagnosticResult {
  name: string;
  status: 'loading' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export function RecipeLoadingDiagnostics() {
  const { user } = useAuth();
  const { allRecipesCache, isRecipeCacheLoading } = useAppContext();
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results: DiagnosticResult[] = [];

    // 1. Check authentication
    results.push({
      name: "Authentication",
      status: user ? 'success' : 'error',
      message: user ? `Logged in as ${user.email}` : 'Not authenticated',
      details: { userId: user?.uid || null }
    });

    // 2. Check Firebase connection
    try {
      const testDoc = await getDoc(doc(db, 'test', 'connection'));
      results.push({
        name: "Firebase Connection",
        status: 'success',
        message: 'Firebase connection successful'
      });
    } catch (error: any) {
      results.push({
        name: "Firebase Connection",
        status: 'error',
        message: `Firebase connection failed: ${error.message}`
      });
    }

    // 3. Check built-in recipes
    try {
      const builtInQuery = query(collection(db, "recipes"), where("user_id", "==", null));
      const builtInSnapshot = await getDocs(builtInQuery);
      const builtInCount = builtInSnapshot.docs.length;
      
      results.push({
        name: "Built-in Recipes",
        status: builtInCount > 0 ? 'success' : 'warning',
        message: `Found ${builtInCount} built-in recipes`,
        details: {
          count: builtInCount,
          sampleIds: builtInSnapshot.docs.slice(0, 3).map(doc => doc.id)
        }
      });
    } catch (error: any) {
      results.push({
        name: "Built-in Recipes",
        status: 'error',
        message: `Failed to load built-in recipes: ${error.message}`
      });
    }

    // 4. Check user recipes (if authenticated)
    if (user?.uid) {
      try {
        // Check root collection
        const userQueryRoot = query(collection(db, "recipes"), where("user_id", "==", user.uid));
        const userSnapshotRoot = await getDocs(userQueryRoot);
        const rootCount = userSnapshotRoot.docs.length;

        // Check subcollection
        const userRecipesRef = collection(db, `profiles/${user.uid}/recipes`);
        const userSnapshotSub = await getDocs(userRecipesRef);
        const subCount = userSnapshotSub.docs.length;

        results.push({
          name: "User Recipes",
          status: (rootCount + subCount) > 0 ? 'success' : 'warning',
          message: `Found ${rootCount} in root collection, ${subCount} in subcollection`,
          details: {
            rootCollection: rootCount,
            subcollection: subCount,
            userId: user.uid
          }
        });
      } catch (error: any) {
        results.push({
          name: "User Recipes",
          status: 'error',
          message: `Failed to load user recipes: ${error.message}`
        });
      }
    }

    // 5. Check app context state
    results.push({
      name: "App Context Cache",
      status: isRecipeCacheLoading ? 'loading' : (allRecipesCache.length > 0 ? 'success' : 'warning'),
      message: isRecipeCacheLoading 
        ? 'Loading recipes...' 
        : `${allRecipesCache.length} recipes in cache`,
      details: {
        isLoading: isRecipeCacheLoading,
        cacheCount: allRecipesCache.length,
        sampleRecipes: allRecipesCache.slice(0, 3).map(r => ({ id: r.id, name: r.name }))
      }
    });

    // 6. Check Firestore security rules
    try {
      const testQuery = query(collection(db, "recipes"));
      await getDocs(testQuery);
      results.push({
        name: "Firestore Security Rules",
        status: 'success',
        message: 'Can read recipes collection'
      });
    } catch (error: any) {
      results.push({
        name: "Firestore Security Rules",
        status: 'error',
        message: `Security rules blocking access: ${error.message}`
      });
    }

    setDiagnostics(results);
    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, [user, allRecipesCache.length, isRecipeCacheLoading]);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'loading':
        return 'bg-blue-100 text-blue-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Database className="h-5 w-5" />
          Recipe Loading Diagnostics
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={runDiagnostics}
          disabled={isRunning}
        >
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Run Diagnostics
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {diagnostics.length === 0 && !isRunning && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No Diagnostics Run</AlertTitle>
              <AlertDescription>
                Click "Run Diagnostics" to check your recipe loading setup.
              </AlertDescription>
            </Alert>
          )}

          {diagnostics.map((result, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
              {getStatusIcon(result.status)}
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium">{result.name}</span>
                  <Badge className={getStatusColor(result.status)}>
                    {result.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {result.message}
                </p>
                {result.details && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Show Details
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Fix Suggestions */}
        {diagnostics.some(d => d.status === 'error') && (
          <Alert variant="destructive" className="mt-4">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Issues Detected</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                <p><strong>Common Solutions:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Check your Firebase configuration in src/lib/firebase-client.ts</li>
                  <li>Verify Firestore security rules allow recipe reading</li>
                  <li>Ensure you have recipes in your database</li>
                  <li>Check browser console for detailed error messages</li>
                  <li>Verify network connectivity to Firebase</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}