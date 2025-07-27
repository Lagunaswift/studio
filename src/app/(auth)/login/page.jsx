"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
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
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';

const loginSchema = z.object({
    email: z.string().email({ message: "Invalid email address." }),
    password: z.string().min(1, { message: "Password is required." }),
});

export default function LoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const { user } = useAuth();
    const auth = getFirebaseAuth();

    useEffect(() => {
        setIsClient(true);
        if (user) {
            router.push('/');
        }
    }, [user, router]);

    const form = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const handleResendVerification = async () => {
        if (auth.currentUser) {
            try {
                await sendEmailVerification(auth.currentUser);
                toast({
                    title: "Verification Email Sent",
                    description: "A new verification link has been sent to your email address.",
                });
            } catch (error) {
                toast({
                    title: "Error Sending Verification",
                    description: "Could not send a new verification email. Please try again later.",
                    variant: "destructive",
                });
            }
        }
    };

    const onSubmit = async (data) => {
        form.clearErrors();
        try {
            const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
            
            if (!userCredential.user.emailVerified) {
                 toast({
                    title: "Email Not Verified",
                    description: "Please check your inbox and verify your email address to log in.",
                    variant: "destructive",
                    action: <Button variant="outline" size="sm" onClick={handleResendVerification}><Send className="mr-2 h-4 w-4" />Resend Link</Button>,
                    duration: 10000,
                });
                return;
            }

            toast({
                title: "Login Successful!",
                description: "Welcome back!",
            });
            router.push('/');
        }
        catch (error) {
            const errorCode = error.code;
            let description = "An unexpected error occurred.";
            
            if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
                description = "Invalid email or password. Please try again.";
            } else if (errorCode === 'auth/unverified-email'){
                 description = "Your email address is not verified. Please check your inbox for the verification link.";
            }

            toast({
                title: "Login Failed",
                description,
                variant: "destructive",
            });
        }
    };

    const isFormDisabled = form.formState.isSubmitting || !isClient;

    return (<Card className="shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline text-primary flex items-center justify-center">
          <LogIn className="mr-2 h-6 w-6"/> Sign In
        </CardTitle>
        <CardDescription>Enter your credentials to access your meal plan.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground"/>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} disabled={isFormDisabled}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Lock className="mr-2 h-4 w-4 text-muted-foreground"/>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...field} disabled={isFormDisabled}/>
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-primary" aria-label={showPassword ? "Hide password" : "Show password"} disabled={isFormDisabled}>
                        {showPassword ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
            )}/>
          </CardContent>
          <CardFooter className="flex flex-col items-center space-y-4">
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isFormDisabled}>
              {form.formState.isSubmitting ? 'Signing In...' : 'Sign In'}
            </Button>
            <div className="text-sm text-center w-full">
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Don't have an account? Sign up
              </Link>
            </div>
            <div className="text-sm text-center w-full">
              <Link href="/reset-password" className="text-xs text-muted-foreground hover:underline">
                Forgot password?
              </Link>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>);
}
