
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams }  from 'next/navigation'; // useSearchParams for future, not strictly needed for hash
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Lock, KeyRound, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

const updatePasswordSchema = z.object({
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;

// Helper component to use Suspense for useSearchParams if ever needed for query params
function UpdatePasswordFormComponent() {
  const { toast } = useToast();
  const router = useRouter();
  // const searchParams = useSearchParams(); // For query params, not hash
  const [error, setError] = useState<string | null>(null);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    console.log("UpdatePasswordPage loaded with URL (on mount):", window.location.href);
    
    // Check hash for Supabase recovery params immediately on client-side
    if (window.location.hash.includes('type=recovery') && window.location.hash.includes('access_token')) {
        console.log("UpdatePasswordPage - Recovery type and access_token found in URL hash on mount.");
        // Supabase client will handle the token from the hash, leading to PASSWORD_RECOVERY event
    } else {
        console.log("UpdatePasswordPage - No immediate recovery indicators in hash on mount.");
    }
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("UpdatePasswordPage - Auth event:", event, "Session:", session);
      if (event === 'PASSWORD_RECOVERY') {
        console.log("UpdatePasswordPage - PASSWORD_RECOVERY event received. Session should contain user for update.");
        setIsTokenValid(true);
        setError(null);
        setIsCheckingToken(false);
      } else if (event === 'SIGNED_IN' && session && window.location.hash.includes('type=recovery')) {
        // This might happen if user was already signed in elsewhere or if session is quickly established
        console.log("UpdatePasswordPage - SIGNED_IN event with recovery type in hash. Session:", session);
        setIsTokenValid(true);
        setError(null);
        setIsCheckingToken(false);
      } else if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // If we get a session but it's not for recovery, and token isn't valid yet, keep checking
        if (!isTokenValid) {
            // No explicit error here, just let the timeout handle it if no recovery event comes
        }
      } else if (event === 'SIGNED_OUT') {
        setIsTokenValid(false);
        setIsCheckingToken(false);
      }
    });

    // Fallback check after a short delay if no PASSWORD_RECOVERY event fired quickly
    const timer = setTimeout(() => {
        if (isCheckingToken && !isTokenValid) { // only if still checking and not yet valid
            console.log("UpdatePasswordPage - Timeout check. isTokenValid:", isTokenValid, "isCheckingToken:", isCheckingToken);
            if (window.location.hash.includes('type=recovery') && window.location.hash.includes('access_token')) {
                 // This is a fallback; ideally, onAuthStateChange handles it.
                 // If Supabase client hasn't processed it, this manual check doesn't make it valid for updateUser.
                 // The PASSWORD_RECOVERY event is the key.
                 console.log("UpdatePasswordPage - Recovery params still in hash after delay, but relying on Supabase event.");
            } else {
                setError("Invalid or expired password reset link. Please request a new one.");
            }
            setIsCheckingToken(false); // Stop checking
        }
    }, 2500); // Increased delay to give Supabase client more time

    return () => {
      authListener?.subscription?.unsubscribe();
      clearTimeout(timer);
    };
  }, [isClient, isTokenValid, isCheckingToken]); // Added isCheckingToken

  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit: SubmitHandler<UpdatePasswordFormValues> = async (data) => {
    form.clearErrors();
    setError(null);

    if (!isTokenValid) {
      const msg = "Password recovery token is not valid or session has expired. Please request a new reset link.";
      setError(msg);
      toast({
        title: "Token Invalid",
        description: msg,
        variant: "destructive",
      });
      return;
    }

    // At this point, Supabase client should have processed the token from the URL
    // and a session for password recovery should be active.
    // We update the user associated with this recovery session.
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (updateError) {
        setError(updateError.message);
        toast({
          title: "Password Update Failed",
          description: updateError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password Updated Successfully!",
          description: "You can now sign in with your new password.",
        });
        // Sign out to clear the recovery session before redirecting to login
        await supabase.auth.signOut();
        router.push('/login');
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
      toast({
        title: "Update Error",
        description: e.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  if (!isClient || isCheckingToken) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="shadow-2xl w-full max-w-md">
            <CardHeader className="text-center">
                 <CardTitle className="text-2xl font-headline text-primary flex items-center justify-center">
                    <KeyRound className="mr-2 h-6 w-6" /> Verifying Link...
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground">Please wait while we verify your password reset link.</p>
            </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <Card className="shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline text-primary flex items-center justify-center">
          <KeyRound className="mr-2 h-6 w-6" /> Update Your Password
        </CardTitle>
        <CardDescription>Enter and confirm your new password.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Lock className="mr-2 h-4 w-4 text-muted-foreground" />New Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Minimum 8 characters" {...field} disabled={!isTokenValid || form.formState.isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Lock className="mr-2 h-4 w-4 text-muted-foreground" />Confirm New Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Re-type your new password" {...field} disabled={!isTokenValid || form.formState.isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             {error && (
              <p className="text-sm text-destructive text-center p-2 bg-destructive/10 rounded-md">{error}</p>
            )}
            {!isTokenValid && !isCheckingToken && ( // Only show if done checking and token is not valid
                 <div className="text-sm text-muted-foreground text-center p-3 bg-muted rounded-md border border-dashed">
                    <AlertTriangle className="inline h-5 w-5 mr-2 text-destructive"/>
                    The password reset link is invalid or has expired. 
                    Please <Link href="/reset-password" className="underline text-primary hover:text-primary/80">request a new one</Link>.
                 </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-center space-y-4">
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={form.formState.isSubmitting || !isTokenValid}>
              {form.formState.isSubmitting ? "Updating..." : "Update Password"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

// Wrap the component with Suspense for useSearchParams (even if not actively used for hash)
// This is good practice if searchParams were to be used in the future.
export default function UpdatePasswordPage() {
    return (
        <Suspense fallback={<div>Loading page details...</div>}>
            <UpdatePasswordFormComponent />
        </Suspense>
    );
}

