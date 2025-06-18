
"use client";

import Link from 'next/link';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Mail, Lock, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// import { supabase } from '@/lib/supabaseClient'; // Supabase client import commented out
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const signUpSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit: SubmitHandler<SignUpFormValues> = async (data) => {
    form.clearErrors(); 
    console.log("Sign up attempt (local testing - Supabase disabled):", data.email);
    toast({
      title: "Sign Up Simulated (Local Testing)",
      description: "Supabase authentication is temporarily disabled. Account creation simulated.",
    });
    form.reset();
    // Optionally redirect or show a success message appropriate for local testing
    // router.push('/login'); 

    // let emailRedirectToPath = '/login'; 
    // if (isClient) {
    //   console.log("Sign Up - Potential emailRedirectTo if configured:", `${window.location.origin}${emailRedirectToPath}`);
    // }

    // try {
    //   const { data: signUpData, error } = await supabase.auth.signUp({
    //     email: data.email,
    //     password: data.password,
    //     // options: {
    //     //   // If you enable this, ensure the full URL is in Supabase Additional Redirect URLs
    //     //   emailRedirectTo: isClient ? `${window.location.origin}${emailRedirectToPath}` : undefined, 
    //     // }
    //   });

    //   if (error) {
    //     toast({
    //       title: "Sign Up Failed",
    //       description: error.message,
    //       variant: "destructive",
    //     });
    //   } else if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
    //     toast({
    //       title: "Confirmation Sent or Account Exists",
    //       description: "If you're new, please check your email to confirm your account. If you've signed up before, please log in.",
    //       variant: "default",
    //     });
    //   } else if (signUpData.user?.id && !signUpData.session) {
    //      toast({
    //       title: "Sign Up Successful!",
    //       description: "Please check your email to confirm your account and complete the sign up process.",
    //     });
    //     form.reset();
    //   } else if (signUpData.user && signUpData.session) {
    //      toast({
    //       title: "Sign Up Successful!",
    //       description: "Your account is ready. You can now log in.",
    //     });
    //     form.reset();
    //     router.push('/login'); 
    //   } else {
    //      toast({
    //       title: "Sign Up Attempted",
    //       description: "Please check your email for a confirmation link. If you encounter issues, try logging in or resetting your password.",
    //     });
    //   }
    // } catch (e: any) {
    //   toast({
    //     title: "Sign Up Error",
    //     description: e.message || "An unexpected error occurred.",
    //     variant: "destructive",
    //   });
    // }
  };

  return (
    <Card className="shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline text-primary flex items-center justify-center">
          <UserPlus className="mr-2 h-6 w-6" /> Create Account
        </CardTitle>
        <CardDescription>Join MealPlannerPro today. It's free! (Supabase Auth Temporarily Disabled)</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" />Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Lock className="mr-2 h-4 w-4 text-muted-foreground" />Password</FormLabel>
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
                  <FormLabel className="flex items-center"><Lock className="mr-2 h-4 w-4 text-muted-foreground" />Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Re-type your password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col items-center space-y-4">
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Creating Account..." : "Create Account (Local Test)"}
            </Button>
            <div className="text-sm text-center w-full">
              <Link href="/login" className="font-medium text-primary hover:underline">
                Already have an account? Sign In
              </Link>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
