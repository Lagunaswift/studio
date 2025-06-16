
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams }  from 'next/navigation';
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

function UpdatePasswordFormComponent() {
  const { toast } = useToast();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // CRITICAL LOGS FOR DEBUGGING
    console.log("Update Password Page: Component mounted.");
    if (typeof window !== 'undefined') {
        console.log("Update Password Page: Loaded with URL (on mount):", window.location.href);
        console.log("Update Password Page: Hash fragment (on mount):", window.location.hash);
        if (window.location.hash.includes('type=recovery') && window.location.hash.includes('access_token')) {
            console.log("Update Password Page: Recovery type and access_token FOUND in URL hash on mount. Supabase client should process this.");
        } else {
            console.warn("Update Password Page: Recovery type or access_token NOT FOUND in URL hash on mount. Password reset might fail if this persists after Supabase client processes the URL.");
        }
    }
  }, []);

  useEffect(() => {
    if (!isClient) return;

    console.log("Update Password Page: Setting up onAuthStateChange listener.");
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Update Password Page - Auth event received:", event, "Session exists:", !!session);
      if (event === 'PASSWORD_RECOVERY') {
        console.log("Update Password Page - PASSWORD_RECOVERY event received. Session should contain user for update. Enabling form.");
        setIsTokenValid(true);
        setError(null);
        setIsCheckingToken(false);
      } else if (event === 'SIGNED_IN' && session && typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
        console.log("Update Password Page - SIGNED_IN event received while type=recovery is in hash. Session:", !!session, "Enabling form.");
        setIsTokenValid(true);
        setError(null);
        setIsCheckingToken(false);
      } else if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (!isTokenValid) {
             console.log("Update Password Page - Received session event but not PASSWORD_RECOVERY yet:", event);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log("Update Password Page - SIGNED_OUT event received.");
        setIsTokenValid(false);
        setIsCheckingToken(false); 
      }
    });

    // Fallback check
    const timer = setTimeout(() => {
        if (isCheckingToken && !isTokenValid) {
            console.warn("Update Password Page - Timeout reached. No PASSWORD_RECOVERY event received. isTokenValid:", isTokenValid);
            // Check hash again, though Supabase client should handle it.
            if (typeof window !== 'undefined' && !(window.location.hash.includes('type=recovery') && window.location.hash.includes('access_token'))) {
                 setError("Invalid or expired password reset link. Please request a new one. (Timeout)");
            } else if (typeof window !== 'undefined') {
                console.log("Update Password Page - Timeout: Recovery params still in hash, but PASSWORD_RECOVERY event was not fired. This might indicate an issue with Supabase client processing the hash or an already used token.");
                setError("Could not verify password reset link. It might be invalid, expired, or already used. Please request a new one.");
            }
            setIsCheckingToken(false);
        }
    }, 3500); // Slightly longer timeout

    return () => {
      console.log("Update Password Page: Unsubscribing from onAuthStateChange listener.");
      authListener?.subscription?.unsubscribe();
      clearTimeout(timer);
    };
  }, [isClient, isTokenValid, isCheckingToken]);

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
        title: "Update Not Allowed",
        description: msg,
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Update Password Page: Attempting to update user password.");
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (updateError) {
        console.error("Update Password Page: supabase.auth.updateUser error:", updateError.message);
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
        console.log("Update Password Page: Password updated. Signing out to clear recovery session.");
        await supabase.auth.signOut(); // Important to clear the recovery session
        router.push('/login');
      }
    } catch (e: any) {
      console.error("Update Password Page: Unexpected error during password update:", e.message);
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
                <p className="text-center text-muted-foreground">Please wait while we verify your password reset link. This may take a few seconds.</p>
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
            {!isTokenValid && !isCheckingToken && ( 
                 <div className="text-sm text-muted-foreground text-center p-3 bg-muted rounded-md border border-dashed">
                    <AlertTriangle className="inline h-5 w-5 mr-2 text-destructive"/>
                    The password reset link appears to be invalid, expired, or already used. 
                    Please <Link href="/reset-password" className="underline text-primary hover:text-primary/80">request a new one</Link>.
                 </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-center space-y-4">
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={form.formState.isSubmitting || !isTokenValid}>
              {form.formState.isSubmitting ? "Updating..." : "Update Password"}
            </Button>
             {!isTokenValid && !isCheckingToken && (
                <div className="text-sm text-center w-full">
                    <Link href="/login" className="font-medium text-primary hover:underline flex items-center justify-center">
                        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Sign In
                    </Link>
                </div>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

export default function UpdatePasswordPage() {
    return (
        <Suspense fallback={<div>Loading page details...</div>}>
            <UpdatePasswordFormComponent />
        </Suspense>
    );
}

