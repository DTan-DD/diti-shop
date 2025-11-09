import { Metadata } from "next";
import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";

import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SignUpFormWrapper from "./signup-form-wrapper";

export const metadata: Metadata = {
  title: "Đăng ký tài khoản",
};

export default async function SignUpPage(props: {
  searchParams: Promise<{
    callbackUrl: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const { callbackUrl } = searchParams;

  const session = await auth();
  if (session) {
    return redirect(callbackUrl || "/");
  }

  return (
    <div className="w-full">
      <SessionProvider session={session}>
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Tạo tài khoản</CardTitle>
          </CardHeader>
          <CardContent>
            <SignUpFormWrapper />
          </CardContent>
        </Card>
      </SessionProvider>
    </div>
  );
}
