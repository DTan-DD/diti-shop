import { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { getUserById } from "@/lib/actions/user.actions";

const PAGE_TITLE = "Login & Security";
export const metadata: Metadata = {
  title: PAGE_TITLE,
};
export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const session = await auth();
  // console.log("session", session);
  const isOAuthUser = !session?.user?.hasPassword;
  const user = await getUserById();
  return (
    <div className="mb-24">
      {/* <SessionProvider session={session}> */}
      {/* Show error if OAuth user tried to change password */}
      {(params.error === "oauth-no-password" || params.error === "oauth-no-email") && (
        <Alert variant="destructive" className="mb-4 max-w-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Tài khoản của bạn đăng nhập qua mạng xã hội, không thể đổi mật khẩu.</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2 ">
        <Link href="/account">Your Account</Link>
        <span>›</span>
        <span>{PAGE_TITLE}</span>
      </div>
      <h1 className="h1-bold py-4">{PAGE_TITLE}</h1>
      <Card className="max-w-2xl ">
        <CardContent className="p-4 flex justify-between flex-wrap">
          <div>
            <h3 className="font-bold">Name</h3>
            <p>{user.name}</p>
          </div>
          <div>
            <Link href="/account/manage/name">
              <Button className="rounded-full w-32" variant="outline">
                Edit
              </Button>
            </Link>
          </div>
        </CardContent>
        <CardContent className="p-4 flex justify-between flex-wrap">
          <div>
            <h3 className="font-bold">Phone</h3>
            <p>{user.phone}</p>
          </div>
          <div>
            <Link href="/account/manage/phone">
              <Button className="rounded-full w-32" variant="outline">
                Edit
              </Button>
            </Link>
          </div>
        </CardContent>
        <Separator />
        {/* <CardContent className="p-4 flex justify-between flex-wrap">
            <div>
              <h3 className="font-bold">Email</h3>
              <p>{user.email}</p>
              <p>will be implemented in the next version</p>
            </div>
            <div>
              <Link href="#">
                <Button disabled className="rounded-full w-32" variant="outline">
                  Edit
                </Button>
              </Link>
            </div>
          </CardContent> */}
        <CardContent className="p-4 flex justify-between flex-wrap">
          <div>
            <h3 className="font-bold">Email</h3>
            <p>{session?.user?.email}</p>
            {isOAuthUser ? <p className="text-xs text-muted-foreground">Đăng nhập qua mạng xã hội</p> : <p className="text-xs text-muted-foreground">Dùng để đăng nhập và nhận thông báo</p>}
          </div>
          <div>
            <Link href={isOAuthUser ? "#" : "/account/manage/email"}>
              <Button disabled={isOAuthUser} className="rounded-full w-32" variant="outline" title={isOAuthUser ? "Không thể đổi email cho tài khoản OAuth" : "Đổi email"}>
                Sửa
              </Button>
            </Link>
          </div>
        </CardContent>
        <Separator />
        {/* <CardContent className="p-4 flex justify-between flex-wrap">
            <div>
              <h3 className="font-bold">Password</h3>
              <p>************</p>
             
            </div>
            <div>
              <Link href="/account/manage/password">
                <Button className="rounded-full w-32" variant="outline">
                  Edit
                </Button>
              </Link>
            </div>
          </CardContent> */}
        <CardContent className="p-4 flex justify-between flex-wrap">
          <div>
            <h3 className="font-bold">Mật khẩu</h3>
            {isOAuthUser ? (
              <>
                <p className="text-muted-foreground">Đăng nhập qua mạng xã hội</p>
                <p className="text-xs text-muted-foreground">Tài khoản của bạn không sử dụng mật khẩu</p>
              </>
            ) : (
              <>
                <p>••••••••••••</p>
                <p className="text-xs text-muted-foreground">Lần đổi cuối: {new Date().toLocaleDateString("vi-VN")}</p>
              </>
            )}
          </div>
          <div>
            <Link href={isOAuthUser ? "#" : "/account/manage/password"}>
              <Button disabled={isOAuthUser} className="rounded-full w-32" variant="outline" title={isOAuthUser ? "Không thể đổi mật khẩu cho tài khoản OAuth" : "Đổi mật khẩu"}>
                Sửa
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      {/* </SessionProvider> */}
    </div>
  );
}
