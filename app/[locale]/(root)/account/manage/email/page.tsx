import { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { getSetting } from "@/lib/actions/setting.actions";
import EmailChangeFlow from "./email-change-flow";

const PAGE_TITLE = "Thay đổi Email";

export const metadata: Metadata = {
  title: PAGE_TITLE,
};

export default async function ChangeEmailPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const params = await searchParams;
  const session = await auth();
  const { site } = await getSetting();

  // Redirect if user doesn't have a password (OAuth users)
  if (session?.user && !session.user.hasPassword) {
    redirect("/account/manage?error=oauth-no-email");
  }

  return (
    <div className="mb-24">
      {/* <SessionProvider session={session}> */}
      <div className="flex gap-2 ">
        <Link href="/account">Tài khoản</Link>
        <span>›</span>
        <Link href="/account/manage">Đăng nhập & Bảo mật</Link>
        <span>›</span>
        <span>{PAGE_TITLE}</span>
      </div>
      <h1 className="h1-bold py-4">{PAGE_TITLE}</h1>
      <Card className="max-w-2xl">
        <CardContent className="p-4">
          <p className="text-sm py-2 mb-4">
            Để thay đổi email liên kết với tài khoản {site.name} của bạn, vui lòng nhập email mới và mật khẩu hiện tại. Bạn sẽ cần xác thực qua mã OTP được gửi đến email mới.
          </p>
          <EmailChangeFlow initialStep={params.step} />
        </CardContent>
      </Card>
      {/* </SessionProvider> */}
    </div>
  );
}
