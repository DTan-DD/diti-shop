"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getUserById } from "@/lib/actions/user.actions";
import { UserNameSchema } from "@/lib/validator";
import { useQuery } from "@tanstack/react-query";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";

export const ProfileForm = () => {
  const router = useRouter();
  // const { data: session, update } = useSession();
  const { data: user } = useQuery<{ name?: string }>({
    queryKey: ["user", "profile"],
    queryFn: async () => await getUserById(), // ✅ QUAN TRỌNG: thêm queryFn
  });

  const updateProfile = useUpdateProfile();
  const form = useForm<z.infer<typeof UserNameSchema>>({
    resolver: zodResolver(UserNameSchema),
    defaultValues: {
      name: user?.name ?? "",
    },
  });
  const { toast } = useToast();

  async function onSubmit(values: z.infer<typeof UserNameSchema>) {
    // const res = await updateUserName(values);
    const res = await updateProfile.mutateAsync(values);
    if (!res.success)
      return toast({
        variant: "destructive",
        description: res.message,
      });

    const { message } = res;

    toast({
      description: message,
    });
    router.push("/account/manage");
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="  flex flex-col gap-5">
        <div className="flex flex-col gap-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel className="font-bold">New name</FormLabel>
                <FormControl>
                  <Input placeholder="Name" {...field} className="input-field" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" size="lg" disabled={form.formState.isSubmitting} className="button col-span-2 w-full">
          {form.formState.isSubmitting ? "Submitting..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  );
};
