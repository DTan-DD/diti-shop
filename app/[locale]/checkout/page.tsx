import { Metadata } from "next";
import CheckoutForm from "./checkout-form";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { getQueryClient } from "@/lib/queryClient";
import { getUserById } from "@/lib/actions/user.actions";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export const metadata: Metadata = {
  title: "Checkout",
};

export default async function CheckoutPage() {
  const session = await auth();
  const queryClient = getQueryClient();

  // Prefetch user data trên server
  await queryClient.prefetchQuery({
    queryKey: ["user", "profile"],
    queryFn: async () => {
      if (!session || !session.user?.id) {
        throw new Error("User is not authenticated");
      }
      return await getUserById();
    },
  });
  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/checkout");
  }
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CheckoutForm />
    </HydrationBoundary>
  );
}
