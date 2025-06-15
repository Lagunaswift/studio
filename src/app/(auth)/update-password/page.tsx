
"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

export default function UpdatePasswordPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isTokenValid, setIsTokenValid] = useState(false); 
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      console.log("UpdatePasswordPage loaded with URL:", window.location.href);
    }
  }, []);

  useEffect(() => {
    if (!isClient) return; // Only run Supabase logic on the client

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("UpdatePasswordPage - Auth event:", event);
      if (event === 'PASSWORD_RECOVERY') {
        setIsTokenValid(true);
        setError(null);
        console.log("UpdatePasswordPage - PASSWORD_RECOVERY event received, token should be valid.");
      } else if (session && event === 'SIGNED_IN' && window.location.hash.includes('type=recovery')) {
        // This case handles when the user is already signed in but lands on the recovery page
        // Potentially after the PASSWORD_RECOVERY event, the session is updated.
        setIsTokenValid(true);
        setError(null);
        console.log("UpdatePasswordPage - SIGNED_IN event with recovery type in hash.");
      }
    });
    
    // Initial check for recovery token in URL hash, as onAuthStateChange might not fire immediately
    // or if the user navigates directly with the hash.
    if (window.location.hash.includes('type=recovery') && window.location.hash.includes('access_token')) {
        console.log("UpdatePasswordPage - Recovery type and access_token found in URL hash on mount.");
        setIsTokenValid(true);
    } else {
        // If no immediate token found, set a brief timer to check again,
        // as Supabase client might take a moment to process the URL.
        const timer = setTimeout(() => {
            if (!isTokenValid && window.location.hash.includes('type=recovery') && window.location.hash.includes('access_token')) {
                console.log("UpdatePasswordPage - Recovery token found in hash after short delay.");
                setIsTokenValid(true);
            } else if (!isTokenValid) {
                 console.log("UpdatePasswordPage - No valid recovery token indicators found after delay.");
                 // Avoid setting error too aggressively, as Supabase might still be processing.
                 // The form will be disabled if isTokenValid remains false.
            }
        }, 500); // Reduced delay
         return () => clearTimeout(timer);
    }

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [isClient, isTokenValid]); // isTokenValid in dependency array to re-evaluate if it changes externally.


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
      setError("Password recovery token is not valid or session has expired. Please try requesting a new link.");
      toast({
        title: "Token Invalid",
        description: "Password recovery token is not valid. Please request a new reset link.",
        variant: "destructive",
      });
      return;
    }

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

  if (!isClient) {
    // Optional: Render a loading state or null during SSR phase
    return <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4"><p>Loading...</p></div>;
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
                    <Input type="password" placeholder="Minimum 8 characters" {...field} />
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
                    <Input type="password" placeholder="Re-type your new password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            {!isTokenValid && !form.formState.isSubmitting && (
                 <p className="text-xs text-muted-foreground text-center p-2 bg-muted rounded-md">
                    <AlertTriangle className="inline h-4 w-4 mr-1 text-destructive"/>
                    Verifying reset link. If this message persists, the link may be invalid or expired. 
                    Try <Link href="/reset-password" className="underline text-primary">requesting a new one</Link>.
                 </p>
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
