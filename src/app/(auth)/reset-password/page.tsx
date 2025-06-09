
"use client";

import Link from 'next/link';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Mail, KeyRound, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const resetPasswordSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit: SubmitHandler<ResetPasswordFormValues> = (data) => {
    console.log("Reset password form data:", data);
    // Placeholder for Supabase password reset logic
    toast({
      title: "Password Reset Submitted (Placeholder)",
      description: `If an account exists for ${data.email}, a reset link will be sent. Supabase integration needed.`,
    });
    form.reset(); // Clear the form
  };

  return (
    <Card className="shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline text-primary flex items-center justify-center">
          <KeyRound className="mr-2 h-6 w-6" /> Reset Password
        </CardTitle>
        <CardDescription>Enter your email to receive a password reset link.</CardDescription>
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
          </CardContent>
          <CardFooter className="flex flex-col items-center space-y-4">
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Sending..." : "Send Reset Link"}
            </Button>
            <div className="text-sm text-center w-full">
              <Link href="/login" className="font-medium text-primary hover:underline flex items-center justify-center">
                <ArrowLeft className="mr-1 h-4 w-4" /> Back to Sign In
              </Link>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
