import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { useAuth } from '@/context/AuthContext';

interface DiagnosticResult {
  name: string;
  status: 'loading' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export function RecipeLoadingDebugger() {
  const { user } = useAuth();
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [rawData, setRawData] = useState<any>(null);

  const runComprehensiveDiagnostics = async () => {
    setIsRunning(true);
    const results: DiagnosticResult[] = [];
    let debugData: any = {};

    try {
      // 1. Firebase Connection Test
      results.push({
        name: "Firebase Connection",
        status: 'loading',
        message: 'Testing connection...'
      });

      try {
        const testDoc = await getDoc(doc(db, 'test', 'connection'));
        results[results.length - 1] = {
          name: "Firebase Connection",
          status: 'success',
          message: 'Firebase connected successfully'
        };
      } catch (error: any) {
        results[results.length - 1] = {
          name: "Firebase Connection", 
          status: 'error',
          message: `Firebase connection failed: ${error.message}`
        };
      }

      // 2. Check Built-in Recipes Collection Structure
      results.push({
        name: "Built-in Recipes Query",
        status: 'loading',
        message: 'Checking built-in recipes...'
      });

      try {
        // First, check if recipes collection exists at all
        const allRecipesQuery = collection(db, "recipes");
        const allRecipesSnapshot = await getDocs(allRecipesQuery);
        
        console.log("🔍 ALL recipes collection docs:", allRecipesSnapshot.docs.length);
        debugData.totalRecipeDocs = allRecipesSnapshot.docs.length;
        debugData.allRecipeIds = allRecipesSnapshot.docs.map(doc => doc.id);
        debugData.sampleRecipeData = allRecipesSnapshot.docs.slice(0, 3).map(doc => ({
          id: doc.id,
          data: doc.data()
        }));

        // Now check built-in specifically
        const builtInQuery = query(collection(db, "recipes"), where("user_id", "==", null));
        const builtInSnapshot = await getDocs(builtInQuery);
        const builtInCount = builtInSnapshot.docs.length;

        debugData.builtInRecipeCount = builtInCount;
        debugData.builtInRecipeIds = builtInSnapshot.docs.map(doc => doc.id);
        
        results[results.length - 1] = {
          name: "Built-in Recipes Query",
          status: builtInCount > 0 ? 'success' : 'warning',
          message: builtInCount > 0 
            ? `Found ${builtInCount} built-in recipes` 
            : `No built-in recipes found. Total recipes in collection: ${allRecipesSnapshot.docs.length}`,
          details: {
            builtInCount,
            totalInCollection: allRecipesSnapshot.docs.length,
            sampleIds: builtInSnapshot.docs.slice(0, 5).map(doc => doc.id)
          }
        };

        // Check document structure
        if (allRecipesSnapshot.docs.length > 0) {
          const sampleDoc = allRecipesSnapshot.docs[0];
          const sampleData = sampleDoc.data();
          
          results.push({
            name: "Document Structure Check",
            status: 'success',
            message: `Sample document fields: ${Object.keys(sampleData).join(', ')}`,
            details: {
              docId: sampleDoc.id,
              fields: Object.keys(sampleData),
              hasUserId: 'user_id' in sampleData,
              userIdValue: sampleData.user_id,
              hasName: 'name' in sampleData
            }
          });
        } else {
          results.push({
            name: "Document Structure Check",
            status: 'error',
            message: 'No documents found in recipes collection to analyze'
          });
        }

      } catch (error: any) {
        results[results.length - 1] = {
          name: "Built-in Recipes Query",
          status: 'error',
          message: `Query failed: ${error.message}`
        };
      }

      // 3. Check User Recipes (if authenticated)
      if (user?.uid) {
        results.push({
          name: "User Recipes Check",
          status: 'loading',
          message: 'Checking user-specific recipes...'
        });

        try {
          // Method 1: Root collection with user_id filter
          const userQueryRoot = query(collection(db, "recipes"), where("user_id", "==", user.uid));
          const userSnapshotRoot = await getDocs(userQueryRoot);
          const rootCount = userSnapshotRoot.docs.length;

          // Method 2: User subcollection
          const userRecipesRef = collection(db, `profiles/${user.uid}/recipes`);
          const userSnapshotSub = await getDocs(userRecipesRef);
          const subCount = userSnapshotSub.docs.length;

          debugData.userRecipesRoot = rootCount;
          debugData.userRecipesSub = subCount;

          results[results.length - 1] = {
            name: "User Recipes Check",
            status: (rootCount + subCount) > 0 ? 'success' : 'warning',
            message: `Root collection: ${rootCount} recipes, Subcollection: ${subCount} recipes`,
            details: {
              userId: user.uid,
              rootCollection: rootCount,
              subcollection: subCount,
              total: rootCount + subCount
            }
          };

        } catch (error: any) {
          results[results.length - 1] = {
            name: "User Recipes Check",
            status: 'error',
            message: `User recipe query failed: ${error.message}`
          };
        }
      } else {
        results.push({
          name: "User Recipes Check",
          status: 'warning',
          message: 'Not authenticated - cannot check user recipes'
        });
      }

      // 4. Security Rules Test
      results.push({
        name: "Security Rules Test",
        status: 'loading',
        message: 'Testing Firestore security rules...'
      });

      try {
        const testQuery = query(collection(db, "recipes"));
        await getDocs(testQuery);
        results[results.length - 1] = {
          name: "Security Rules Test",
          status: 'success',
          message: 'Can read recipes collection - security rules allow access'
        };
      } catch (error: any) {
        results[results.length - 1] = {
          name: "Security Rules Test",
          status: 'error',
          message: `Security rules may be blocking access: ${error.message}`
        };
      }

      setRawData(debugData);
      setDiagnostics(results);

    } catch (error: any) {
      results.push({
        name: "General Error",
        status: 'error',
        message: `Unexpected error: ${error.message}`
      });
      setDiagnostics(results);
    }

    setIsRunning(false);
  };

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
      case 'loading': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'success': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
  };

  // Auto-run on mount
  useEffect(() => {
    runComprehensiveDiagnostics();
  }, [user?.uid]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">
            🔍 Recipe Loading Diagnostics
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={runComprehensiveDiagnostics}
            disabled={isRunning}
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              "🔄 Re-run Diagnostics"
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {diagnostics.map((result, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
              {getStatusIcon(result.status)}
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium">{result.name}</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(result.status)}`}>
                    {result.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  {result.message}
                </p>
                {result.details && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                      Show Technical Details
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Solutions */}
      {diagnostics.some(d => d.status === 'error' || d.message.includes('No built-in recipes found')) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-red-600 dark:text-red-400">
              🚨 Issues Detected - Quick Solutions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <p><strong>Most Common Issue: No Recipe Data in Database</strong></p>
                  <div className="space-y-1">
                    <p>• Your Firestore connection is working, but there are no recipe documents</p>
                    <p>• You need to populate your database with recipe data</p>
                    <p>• Check if you have seed data or import scripts</p>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                <p className="font-medium text-blue-800 dark:text-blue-200 mb-2">Immediate Action Items:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-300">
                  <li>Check your Firestore console for the 'recipes' collection</li>
                  <li>If empty, you need to add recipe documents</li>
                  <li>Built-in recipes should have `user_id: null`</li>
                  <li>User recipes should have `user_id: "your-user-id"`</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Raw Debug Data */}
      {rawData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-md">🔧 Raw Debug Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto">
              {JSON.stringify(rawData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}