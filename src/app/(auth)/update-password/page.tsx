
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
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isTokenValid, setIsTokenValid] = useState(false); // Assume invalid until verified by effect

  useEffect(() => {
    // Supabase client handles the token from the URL hash fragment automatically on initialization.
    // We check if the session indicates a recovery state.
    // A more direct way to check for a recovery token would be to parse window.location.hash,
    // but supabase.auth.onAuthStateChange or getSession can reflect this.

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsTokenValid(true);
        setError(null);
      } else if (event === 'SIGNED_IN' && session?.user && !session.user.updated_at) {
        // This might also be a state post-recovery, before user object is fully updated
        // For simplicity, we rely on PASSWORD_RECOVERY event or an existing session after recovery link.
        // A robust check for a valid recovery token might be needed if this isn't reliable.
      }
    });
    
    // Initial check if there's already a session that might be from a recovery
    const checkInitialSession = async () => {
        const { data: { session }} = await supabase.auth.getSession();
        // Check if the current session is the result of a password recovery flow.
        // This is a bit indirect. Supabase automatically uses the token from the URL fragment
        // to establish a temporary session. If the user object exists and there's an access_token,
        // it's likely valid for an update.
        // The 'PASSWORD_RECOVERY' event is more explicit.
        if (session && session.access_token) {
             // Heuristic: If there's a session and the URL suggests a recovery flow, assume valid.
             // This can be tricky because the session might be a normal signed-in session.
             // Relying on the `PASSWORD_RECOVERY` event from `onAuthStateChange` is generally better.
             // For now, if we have a session, let's assume the form can be shown.
             // A better check would be specific to the recovery token type.
             if (window.location.hash.includes('type=recovery')) {
                setIsTokenValid(true);
             }
        }
    };
    checkInitialSession();


    // Fallback if no PASSWORD_RECOVERY event is fired quickly (e.g. page loaded directly with hash)
    // and no session found. A more robust check might involve parsing `window.location.hash`
    // for `access_token` and `type=recovery`.
    // This timeout is a simplified way to handle cases where `onAuthStateChange` might not fire as expected
    // or if the user lands on the page without a clear 'PASSWORD_RECOVERY' event.
    const timer = setTimeout(() => {
        if (!isTokenValid && !window.location.hash.includes('type=recovery')) {
           setError("Invalid or expired password recovery link. Please request a new one.");
        } else if (window.location.hash.includes('type=recovery')) {
            // If hash indicates recovery but state not set, set it
            setIsTokenValid(true);
        }
    }, 2000); // Give 2 seconds for Supabase to process URL and fire event

    return () => {
      authListener?.subscription?.unsubscribe();
      clearTimeout(timer);
    };
  }, [isTokenValid]); // Rerun if isTokenValid changes (e.g. by auth event)


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

  if (error && !isTokenValid) { // Show error prominently if token determined to be invalid
    return (
      <Card className="shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline text-destructive flex items-center justify-center">
            <AlertTriangle className="mr-2 h-6 w-6" /> Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-destructive">{error}</p>
        </CardContent>
        <CardFooter>
            <Button asChild className="w-full">
                <Link href="/reset-password">Request New Reset Link</Link>
            </Button>
        </CardFooter>
      </Card>
    );
  }
  
  // Render form if token is potentially valid or still being checked
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
             {error && ( // Display general errors if token was initially considered valid
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-center space-y-4">
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={form.formState.isSubmitting || !isTokenValid}>
              {form.formState.isSubmitting ? "Updating..." : "Update Password"}
            </Button>
            {!isTokenValid && !form.formState.isSubmitting && (
                 <p className="text-xs text-muted-foreground text-center">Verifying reset link...</p>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

