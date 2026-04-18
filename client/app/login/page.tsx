"use client";

import { useState, useEffect } from "react";
import { useLoginMutation } from "../../lib/features/auth/authApiSlice";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials } from "../../lib/features/auth/authSlice";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [login, { isLoading, error }] = useLoginMutation();
  const dispatch = useDispatch();
  const router = useRouter();
  
  const accessToken = useSelector((state: any) => state.auth.accessToken);
  const authInitializing = useSelector((state: any) => !state.auth.isInitialized);

  useEffect(() => {
    if (accessToken) {
      router.push("/dashboard");
    }
  }, [accessToken, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await login({ email, password }).unwrap();
      dispatch(setCredentials(result));
      toast.success("Access granted — entering Command Center", {
        description: "Welcome back, Commander.",
      });
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err?.data?.message || "Access Denied", {
        description: "Invalid credentials or server unreachable.",
      });
    }
  };

  if (authInitializing || accessToken) {
    return (
      <div className="flex min-h-[calc(100vh-150px)] items-center justify-center p-8">
        <div className="text-primary italic animate-pulse">Verifying authorization...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-150px)] items-center justify-center p-8">
      <Card className="w-full max-w-[450px] border-border/30 bg-card/80 backdrop-blur-md">
        <CardHeader className="text-center space-y-1 pb-2">
          <CardTitle className="headline text-2xl font-extrabold text-primary tracking-wider">
            SENTINEL ACCESS
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Authorized Personnel Only
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-xs uppercase tracking-wider text-muted-foreground">
                Admin Email
              </Label>
              <Input
                id="login-email"
                type="email"
                placeholder="admin@sentinel.io"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-muted/30 border-border/50"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-xs uppercase tracking-wider text-muted-foreground">
                Password
              </Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-muted/30 border-border/50"
              />
            </div>

            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-sm">
                  {(error as any).data?.message || 'Access Denied'}
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full py-5 font-bold tracking-wide" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  AUTHENTICATING...
                </span>
              ) : (
                "ENTER COMMAND CENTER"
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            New Venue?{" "}
            <span
              onClick={() => router.push('/register')}
              className="cursor-pointer text-primary hover:underline font-medium"
            >
              Register System
            </span>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
