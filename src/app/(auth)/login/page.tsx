// src/app/(auth)/login/page.tsx
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
import { Mail, Lock, LogIn, Eye, EyeOff, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { signInWithEmailAndPassword, sendEmailVerification, User } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import { tokenManager } from '@/utils/tokenManager';

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isVerificationEmailSent, setIsVerificationEmailSent] = useState(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (user && user.emailVerified) {
      router.push('/');
    }
  }, [user, router]);

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const user: User = userCredential.user;

      if (!user.emailVerified) {
        await sendEmailVerification(user);
        toast({
          title: "Verify Your Email",
          description: "A verification link has been sent to your email.",
          variant: "destructive",
        });
        setIsVerificationEmailSent(true);
        return;
      }

      await tokenManager.refreshToken(user);
      console.log('Login token refreshed:', tokenManager.getTokenInfo());

      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      router.push('/');
    } catch (error: any) {
      console.error("Login failed:", error.code, error.message);
      toast({
        title: "Login Failed",
        description: error.message || "An unknown error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleSendVerificationEmail = async () => {
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
        toast({
          title: "Verification Email Sent",
          description: "A new verification link has been sent to your email.",
        });
        const interval = setInterval(async () => {
          if (auth.currentUser) {
            await auth.currentUser.reload();
            if (auth.currentUser.emailVerified) {
              clearInterval(interval);
              await tokenManager.refreshToken(auth.currentUser);
              console.log('Token after email verification:', tokenManager.getTokenInfo());
              router.push('/');
            }
          }
        }, 5000);
      } catch (error: any) {
        console.error("Verification email error:", error.code, error.message);
        toast({
          title: "Error Sending Verification Email",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Enter your credentials to access your meal planning dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input type="email" placeholder="you@example.com" {...field} className="pl-10" />
                      </div>
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          type={passwordVisible ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                          className="pl-10 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setPasswordVisible(!passwordVisible)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
                        >
                          {passwordVisible ? <EyeOff /> : <Eye />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                <LogIn className="mr-2 h-5 w-5" /> Login
              </Button>
            </form>
          </Form>
          {isVerificationEmailSent && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">Didn't receive the email?</p>
              <Button variant="link" onClick={handleSendVerificationEmail}>
                <Send className="mr-2 h-4 w-4" /> Resend Verification Email
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Link href="/signup" className="text-sm text-primary hover:underline">
            Don't have an account? Sign up
          </Link>
          <Link href="/reset-password" passHref>
            <Button variant="link" className="text-sm">Forgot Password?</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
