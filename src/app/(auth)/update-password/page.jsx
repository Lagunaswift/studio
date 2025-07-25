"use client";
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Lock, KeyRound, AlertTriangle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
const updatePasswordSchema = z.object({
    password: z.string().min(8, { message: "Password must be at least 8 characters." }),
    confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
});
function UpdatePasswordFormComponent() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState(null);
    const [isTokenValid, setIsTokenValid] = useState(false);
    const [isCheckingToken, setIsCheckingToken] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [actionCode, setActionCode] = useState(null);
    const auth = getFirebaseAuth();
    useEffect(() => {
        const oobCode = searchParams.get('oobCode');
        if (!oobCode) {
            setError("Invalid or missing password reset link.");
            setIsCheckingToken(false);
            return;
        }
        setActionCode(oobCode);
        verifyPasswordResetCode(auth, oobCode)
            .then(() => {
            setIsTokenValid(true);
        })
            .catch((error) => {
            setError("Your password reset link is invalid or has expired. Please request a new one.");
            setIsTokenValid(false);
        })
            .finally(() => {
            setIsCheckingToken(false);
        });
    }, [searchParams, auth]);
    const form = useForm({
        resolver: zodResolver(updatePasswordSchema),
        defaultValues: {
            password: '',
            confirmPassword: '',
        },
    });
    const onSubmit = async (data) => {
        form.clearErrors();
        setError(null);
        if (!actionCode) {
            toast({ title: "Error", description: "Action code is missing.", variant: "destructive" });
            return;
        }
        try {
            await confirmPasswordReset(auth, actionCode, data.password);
            toast({
                title: "Password Updated Successfully!",
                description: "You can now sign in with your new password.",
            });
            router.push('/login');
        }
        catch (e) {
            setError("Failed to update password. The link may have expired.");
            toast({
                title: "Update Error",
                description: "Failed to update password. The link may have expired.",
                variant: "destructive",
            });
        }
    };
    if (isCheckingToken) {
        return (<div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="shadow-2xl w-full max-w-md">
            <CardHeader className="text-center">
                 <CardTitle className="text-2xl font-headline text-primary flex items-center justify-center">
                    <KeyRound className="mr-2 h-6 w-6"/> Verifying Link...
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground">Please wait while we verify your password reset link.</p>
            </CardContent>
        </Card>
      </div>);
    }
    return (<Card className="shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline text-primary flex items-center justify-center">
          <KeyRound className="mr-2 h-6 w-6"/> Update Your Password
        </CardTitle>
        {!isTokenValid && (<CardDescription className="text-destructive">
            Your password reset link appears to be invalid or expired.
          </CardDescription>)}
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField control={form.control} name="password" render={({ field }) => (<FormItem>
                  <FormLabel className="flex items-center"><Lock className="mr-2 h-4 w-4 text-muted-foreground"/>New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showPassword ? 'text' : 'password'} placeholder="Minimum 8 characters" {...field} disabled={!isTokenValid}/>
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-primary" aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>
            <FormField control={form.control} name="confirmPassword" render={({ field }) => (<FormItem>
                  <FormLabel className="flex items-center"><Lock className="mr-2 h-4 w-4 text-muted-foreground"/>Confirm New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="Re-type your new password" {...field} disabled={!isTokenValid}/>
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-primary" aria-label={showConfirmPassword ? "Hide password" : "Show password"}>
                        {showConfirmPassword ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>
             {error && (<p className="text-sm text-destructive text-center p-2 bg-destructive/10 rounded-md">{error}</p>)}
            {!isTokenValid && (<div className="text-sm text-muted-foreground text-center p-3 bg-muted rounded-md border border-dashed">
                <AlertTriangle className="inline h-5 w-5 mr-2 text-destructive"/>
                Please request a new password reset link.
            </div>)}
          </CardContent>
          <CardFooter className="flex flex-col items-center space-y-4">
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={!isTokenValid || form.formState.isSubmitting}>
              Update Password
            </Button>
            <div className="text-sm text-center w-full">
                <Link href="/login" className="font-medium text-primary hover:underline flex items-center justify-center">
                    <ArrowLeft className="mr-1 h-4 w-4"/> Back to Sign In
                </Link>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>);
}
export default function UpdatePasswordPage() {
    return (<Suspense fallback={<div>Loading page details...</div>}>
            <UpdatePasswordFormComponent />
        </Suspense>);
}
