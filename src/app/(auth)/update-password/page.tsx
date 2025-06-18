
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
import { Lock, KeyRound, AlertTriangle, ArrowLeft } from 'lucide-react'; // Added ArrowLeft
import { useToast } from '@/hooks/use-toast';
// import { supabase } from '@/lib/supabaseClient'; // Supabase client import commented out
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
  // For local testing, assume token is "valid" to show the form, but actions are simulated
  const [isTokenValid, setIsTokenValid] = useState(true); 
  const [isCheckingToken, setIsCheckingToken] = useState(false); // Start as false, no real token to check
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    console.log("Update Password Page (Local Testing Mode): Component mounted.");
    // No Supabase auth listener needed for local testing
  }, []);


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

    console.log("Password update attempt (local testing - Supabase disabled):", data.password.substring(0,2) + "..."); // Log partial for safety
    toast({
        title: "Password Update Simulated (Local Testing)",
        description: "Supabase authentication is temporarily disabled. Password update simulated.",
    });
    // await supabase.auth.signOut(); // No actual sign out from Supabase
    router.push('/login');


    // if (!isTokenValid) {
    //   const msg = "Password recovery token is not valid or session has expired. Please request a new reset link.";
    //   setError(msg);
    //   toast({
    //     title: "Update Not Allowed",
    //     description: msg,
    //     variant: "destructive",
    //   });
    //   return;
    // }

    // try {
    //   console.log("Update Password Page: Attempting to update user password.");
    //   const { error: updateError } = await supabase.auth.updateUser({
    //     password: data.password,
    //   });

    //   if (updateError) {
    //     console.error("Update Password Page: supabase.auth.updateUser error:", updateError.message);
    //     setError(updateError.message);
    //     toast({
    //       title: "Password Update Failed",
    //       description: updateError.message,
    //       variant: "destructive",
    //     });
    //   } else {
    //     toast({
    //       title: "Password Updated Successfully!",
    //       description: "You can now sign in with your new password.",
    //     });
    //     console.log("Update Password Page: Password updated. Signing out to clear recovery session.");
    //     await supabase.auth.signOut(); // Important to clear the recovery session
    //     router.push('/login');
    //   }
    // } catch (e: any) {
    //   console.error("Update Password Page: Unexpected error during password update:", e.message);
    //   setError(e.message || "An unexpected error occurred.");
    //   toast({
    //     title: "Update Error",
    //     description: e.message || "An unexpected error occurred.",
    //     variant: "destructive",
    //   });
    // }
  };

  if (!isClient || isCheckingToken) { // isCheckingToken will be false, so this block might not show long
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="shadow-2xl w-full max-w-md">
            <CardHeader className="text-center">
                 <CardTitle className="text-2xl font-headline text-primary flex items-center justify-center">
                    <KeyRound className="mr-2 h-6 w-6" /> Verifying Link... (Local Test Mode)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground">Loading password update form...</p>
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
        <CardDescription>Enter and confirm your new password. (Supabase Auth Temporarily Disabled)</CardDescription>
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
                    The password reset link appears to be invalid or expired. (Local test mode - this message might show if token validation was active).
                    Please <Link href="/reset-password" className="underline text-primary hover:text-primary/80">request a new one</Link>.
                 </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-center space-y-4">
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={form.formState.isSubmitting || !isTokenValid}>
              {form.formState.isSubmitting ? "Updating..." : "Update Password (Local Test)"}
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
