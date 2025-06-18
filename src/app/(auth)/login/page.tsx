
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Mail, Lock, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// import { supabase } from '@/lib/supabaseClient'; // Supabase client import commented out

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    form.clearErrors(); // Clear previous errors
    console.log("Login attempt (local testing - Supabase disabled):", data.email);
    toast({
      title: "Login Simulated (Local Testing)",
      description: "Supabase authentication is temporarily disabled. Redirecting to homepage.",
    });
    router.push('/'); // Redirect to homepage or dashboard
    router.refresh();
    // try {
    //   const { error } = await supabase.auth.signInWithPassword({
    //     email: data.email,
    //     password: data.password,
    //   });

    //   if (error) {
    //     toast({
    //       title: "Login Failed",
    //       description: error.message,
    //       variant: "destructive",
    //     });
    //   } else {
    //     toast({
    //       title: "Login Successful!",
    //       description: "Welcome back!",
    //     });
    //     router.push('/'); // Redirect to homepage or dashboard
    //     router.refresh(); // Refresh to update server-side session state if needed
    //   }
    // } catch (e: any) {
    //   toast({
    //     title: "Login Error",
    //     description: e.message || "An unexpected error occurred.",
    //     variant: "destructive",
    //   });
    // }
  };

  return (
    <Card className="shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline text-primary flex items-center justify-center">
          <LogIn className="mr-2 h-6 w-6" /> Sign In
        </CardTitle>
        <CardDescription>Welcome back! Sign in to access your meal plans. (Supabase Auth Temporarily Disabled)</CardDescription>
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
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col items-center space-y-4">
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Signing In..." : "Sign In (Local Test)"}
            </Button>
            <div className="text-sm text-center w-full">
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Don't have an account? Create one
              </Link>
            </div>
            <div className="text-sm text-center w-full">
              <Link href="/reset-password" className="font-medium text-muted-foreground hover:underline">
                Forgot password?
              </Link>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
