import { Metadata } from "next";
import { SessionProvider } from "next-auth/react";

import { auth } from "@/auth";
import { ProfileForm } from "./profile-form";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { getSetting } from "@/lib/actions/setting.actions";

const PAGE_TITLE = "Thay đổi địa chỉ";

export const metadata: Metadata = {
  title: PAGE_TITLE,
};

export default async function AddressPage() {
  const session = await auth();
  const { site } = await getSetting();

  return (
    <div className="mb-24">
      <SessionProvider session={session}>
        <div className="flex gap-2 ">
          <Link href="/account">Tài khoản</Link>
          <span>›</span>
          <span>{PAGE_TITLE}</span>
        </div>
        <h1 className="h1-bold py-4">{PAGE_TITLE}</h1>
        <Card className="max-w-2xl">
          <CardContent className="p-4">
            <p className="text-sm py-2 mb-4">Nếu bạn muốn thay đổi địa chỉ liên kết với tài khoản {site.name} của mình, vui lòng điền thông tin bên dưới. Nhớ nhấn nút Lưu thay đổi khi hoàn tất.</p>
            <ProfileForm />
          </CardContent>
        </Card>
      </SessionProvider>
    </div>
  );
}
