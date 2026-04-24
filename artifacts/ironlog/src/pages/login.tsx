import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLogin, useSignup, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Dumbbell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const authSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: user, isLoading } = useGetMe({ query: { retry: false } });

  const loginMutation = useLogin();
  const signupMutation = useSignup();

  const form = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (user && !isLoading) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  const handleAuthSuccess = (userData: any) => {
    queryClient.setQueryData(getGetMeQueryKey(), userData);
    setLocation("/dashboard");
  };

  const handleAuthError = (error: any) => {
    const msg = error?.data?.error || error?.message || "Authentication failed";
    toast({ title: msg, variant: "destructive" });
  };

  const onSubmit = (data: z.infer<typeof authSchema>) => {
    if (isLogin) {
      loginMutation.mutate(
        { data },
        { onSuccess: handleAuthSuccess, onError: handleAuthError }
      );
    } else {
      signupMutation.mutate(
        { data },
        { onSuccess: handleAuthSuccess, onError: handleAuthError }
      );
    }
  };

  if (isLoading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary flex items-center justify-center rounded-sm">
              <Dumbbell className="text-primary-foreground w-8 h-8" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">IRONLOG</h1>
          <p className="text-muted-foreground uppercase text-sm tracking-widest">
            {isLogin ? "Enter the pain cave" : "Start your journey"}
          </p>
        </div>

        <div className="bg-card border border-border p-6 md:p-8 rounded-sm shadow-xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="uppercase text-xs tracking-wider">Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="lifter@example.com"
                        {...field}
                        className="bg-background"
                        data-testid="input-email"
                        autoComplete="email"
                      />
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
                    <FormLabel className="uppercase text-xs tracking-wider">Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        {...field}
                        className="bg-background"
                        data-testid="input-password"
                        autoComplete={isLogin ? "current-password" : "new-password"}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full font-bold uppercase tracking-wider h-12"
                disabled={loginMutation.isPending || signupMutation.isPending}
                data-testid="btn-submit-auth"
              >
                {loginMutation.isPending || signupMutation.isPending
                  ? "Loading..."
                  : isLogin
                  ? "Log In"
                  : "Sign Up"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                form.reset();
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
              type="button"
              data-testid="btn-toggle-auth-mode"
            >
              {isLogin ? "No account? Sign up." : "Already lifting? Log in."}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
