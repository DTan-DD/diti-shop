import { Metadata } from "next";
import { SessionProvider } from "next-auth/react";

import { auth } from "@/auth";
import { ProfileForm } from "./profile-form";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { getSetting } from "@/lib/actions/setting.actions";
import { redirect } from "next/navigation";

const PAGE_TITLE = "Đổi mật khẩu";

export const metadata: Metadata = {
  title: PAGE_TITLE,
};

export default async function ChangePasswordPage() {
  const session = await auth();
  // console.log(session);
  const { site } = await getSetting();

  // Redirect if user doesn't have a password (OAuth users)
  if (session?.user && !session.user.hasPassword) {
    redirect("/account/manage?error=oauth-no-password");
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
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Lưu ý quan trọng</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Không chia sẻ mật khẩu của bạn với bất kỳ ai</li>
              <li>• Sử dụng mật khẩu mạnh và duy nhất cho tài khoản này</li>
              <li>• Sau khi đổi mật khẩu, bạn sẽ cần đăng nhập lại</li>
            </ul>
          </div>

          <p className="text-sm py-2 mb-4">Để bảo vệ tài khoản {site.name} của bạn, vui lòng nhập mật khẩu hiện tại và chọn mật khẩu mới đủ mạnh.</p>
          <ProfileForm />
        </CardContent>
      </Card>
      {/* </SessionProvider> */}
    </div>
  );
}
