"use client";
import { redirect, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import useSettingStore from "@/hooks/use-setting-store";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { IUserSignIn } from "@/types";
import { signInWithCredentials } from "@/lib/actions/user.actions";

import { toast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserSignInSchema } from "@/lib/validator";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import useCartStore from "@/hooks/use-cart-store";

const signInDefaultValues =
  process.env.NODE_ENV === "development"
    ? {
        email: "admin@example.com",
        password: "123456",
      }
    : {
        email: "",
        password: "",
      };

export default function CredentialsSignInForm() {
  const {
    setting: { site },
  } = useSettingStore();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const { mergeGuestCartOnLogin } = useCartStore();

  const form = useForm<IUserSignIn>({
    resolver: zodResolver(UserSignInSchema),
    defaultValues: signInDefaultValues,
  });

  const { control, handleSubmit } = form;

  const onSubmit = async (data: IUserSignIn) => {
    try {
      await signInWithCredentials({
        email: data.email,
        password: data.password,
      });

      // STEP 2: Get user session
      const session = await fetch("/api/auth/session").then((res) => res.json());
      const userId = session?.user?.id;

      if (!userId) {
        toast({
          title: "Error",
          description: "Failed to get user session",
          variant: "destructive",
        });
        return;
      }

      // STEP 3: Merge cart
      const mergeResult = await mergeGuestCartOnLogin(userId);

      // STEP 4: Show warnings if any
      if (mergeResult.hasChanges && mergeResult.warnings.length > 0) {
        // Show warning dialog/toast
        toast({
          title: "Cart Updated",
          description: (
            <div className="space-y-1">
              <p>Your cart has been updated:</p>
              <ul className="list-disc pl-4 text-sm">
                {mergeResult.warnings.slice(0, 3).map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
              {mergeResult.warnings.length > 3 && <p className="text-xs mt-1">+{mergeResult.warnings.length - 3} more items updated</p>}
            </div>
          ),
          duration: 8000, // Show longer for warnings
        });
      } else {
        // Success without issues
        toast({
          title: "Welcome back!",
          description: "Signed in successfully",
        });
      }

      redirect(callbackUrl);
    } catch (error) {
      if (isRedirectError(error)) {
        throw error;
      }
      toast({
        title: "Error",
        description: "Invalid email or password",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <div className="space-y-6">
          <FormField
            control={control}
            name="email"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="Enter email address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="password"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Enter password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <Button type="submit">Sign In</Button>
          </div>
          <div className="text-sm">
            By signing in, you agree to {site.name}&apos;s <Link href="/page/conditions-of-use">Conditions of Use</Link> and <Link href="/page/privacy-policy">Privacy Notice.</Link>
          </div>
        </div>
      </form>
    </Form>
  );
}
