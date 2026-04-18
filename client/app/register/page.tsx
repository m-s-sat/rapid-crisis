"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useRegisterMutation } from "../../lib/features/auth/authApiSlice";
import { useDispatch } from "react-redux";
import { setCredentials } from "../../lib/features/auth/authSlice";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export default function Register() {
  const [formData, setFormData] = useState({
    venueName: "",
    location: "",
    hospitality_type: "Hotel",
    contact_number: "",
    adminName: "",
    email: "",
    password: "",
  });

  const { accessToken, isInitialized } = useSelector((state: any) => state.auth);
  const [register, { isLoading, error }] = useRegisterMutation();
  const dispatch = useDispatch();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && accessToken) {
      router.push("/dashboard");
    }
  }, [accessToken, isInitialized, router]);

  if (!isInitialized || accessToken) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <div className="text-primary italic animate-pulse tracking-widest font-bold">
          VERIFYING SECURITY CONTEXT...
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await register(formData).unwrap();
      dispatch(setCredentials(result));
      toast.success("System initialized — welcome, Commander", {
        description: "Your venue security protocols are now active.",
      });
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err?.data?.message || "Registration failed", {
        description: "Please check your details and try again.",
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="flex min-h-[calc(100vh-150px)] items-center justify-center p-8">
      <Card className="w-full max-w-[600px] border-border/30 bg-card/80 backdrop-blur-md">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="headline text-2xl font-extrabold text-primary tracking-wider">
            SENTINEL COMMAND
          </CardTitle>
          <CardDescription>
            Initialize your hospitality security protocols
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Venue Section */}
            <div>
              <h3 className="headline text-xs font-bold uppercase tracking-wider text-foreground mb-4">
                Venue Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-venue" className="text-xs text-muted-foreground">VENUE NAME</Label>
                  <Input id="reg-venue" name="venueName" placeholder="Grand Hotel" required onChange={handleChange} className="bg-muted/30 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-location" className="text-xs text-muted-foreground">LOCATION</Label>
                  <Input id="reg-location" name="location" placeholder="Downtown, City" required onChange={handleChange} className="bg-muted/30 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">VENUE TYPE</Label>
                  <Select
                    value={formData.hospitality_type}
                    onValueChange={(value) => setFormData({ ...formData, hospitality_type: value })}
                  >
                    <SelectTrigger className="bg-muted/30 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hotel">Hotel</SelectItem>
                      <SelectItem value="Hospital">Hospital</SelectItem>
                      <SelectItem value="Resort">Resort</SelectItem>
                      <SelectItem value="Resort & Spa">Resort & Spa</SelectItem>
                      <SelectItem value="Shopping Mall">Shopping Mall</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-phone" className="text-xs text-muted-foreground">CONTACT NUMBER</Label>
                  <Input id="reg-phone" name="contact_number" placeholder="+1 234 567 890" required onChange={handleChange} className="bg-muted/30 border-border/50" />
                </div>
              </div>
            </div>

            <Separator className="opacity-30" />

            {/* Admin Section */}
            <div>
              <h3 className="headline text-xs font-bold uppercase tracking-wider text-foreground mb-4">
                Admin Credentials
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name" className="text-xs text-muted-foreground">FULL NAME</Label>
                  <Input id="reg-name" name="adminName" placeholder="John Doe" required onChange={handleChange} className="bg-muted/30 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email" className="text-xs text-muted-foreground">EMAIL ADDRESS</Label>
                  <Input id="reg-email" name="email" type="email" placeholder="admin@venue.com" required onChange={handleChange} className="bg-muted/30 border-border/50" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="reg-pass" className="text-xs text-muted-foreground">PASSWORD</Label>
                  <Input id="reg-pass" name="password" type="password" placeholder="••••••••" required onChange={handleChange} className="bg-muted/30 border-border/50" />
                </div>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-sm">
                  {(error as any).data?.message || 'Registration failed'}
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
                  INITIALIZING...
                </span>
              ) : (
                "REGISTER COMMANDER"
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Already have access?{" "}
            <span
              onClick={() => router.push('/login')}
              className="cursor-pointer text-primary hover:underline font-medium"
            >
              Login
            </span>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
