"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IUserSignUp } from "@/types";
import { registerUser, signInWithCredentials } from "@/lib/actions/user.actions";
import { sendOTPAction } from "@/lib/actions/otp.actions";
import { useToast } from "@/hooks/use-toast";
import Step1InfoForm from "./step1-info-form";
import Step2OTPForm from "./step2-otp-form";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import useSettingStore from "@/hooks/use-setting-store";

export default function SignUpFormWrapper() {
  const [step, setStep] = useState<1 | 2>(1);
  const [userData, setUserData] = useState<IUserSignUp | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const { toast } = useToast();
  const {
    setting: { site },
  } = useSettingStore();

  const handleStep1Next = async (data: IUserSignUp) => {
    setUserData(data);

    // Send OTP
    const result = await sendOTPAction(data.email, data.name);
    if (result.success) {
      console.log("success:: ", result);
      toast({
        description: result.message,
      });
      setStep(2);
    } else {
      console.log("error:: ", result);
      toast({
        variant: "destructive",
        description: result.message,
      });
    }
  };

  const handleOTPVerified = async () => {
    if (!userData) return;

    setIsRegistering(true);
    try {
      // Register user
      const res = await registerUser(userData);
      if (!res.success) {
        toast({
          title: "Lỗi",
          description: res.error,
          variant: "destructive",
        });
        return;
      }

      // Auto sign in
      await signInWithCredentials({
        email: userData.email,
        password: userData.password,
      });

      toast({
        description: "Đăng ký thành công! Chào mừng bạn.",
      });

      router.push(callbackUrl);
    } catch (error) {
      if (isRedirectError(error)) {
        throw error;
      }
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  return (
    <div>
      {step === 1 ? (
        <>
          <Step1InfoForm onNext={handleStep1Next} defaultValues={userData || undefined} />
          <div className="text-sm mt-4">
            Bằng việc tạo tài khoản, bạn đồng ý với{" "}
            <Link href="/page/conditions-of-use" className="link">
              Điều khoản sử dụng
            </Link>{" "}
            và{" "}
            <Link href="/page/privacy-policy" className="link">
              Chính sách bảo mật
            </Link>{" "}
            của {site.name}.
          </div>
          <Separator className="my-4" />
          <div className="text-sm">
            Đã có tài khoản?{" "}
            <Link className="link" href={`/sign-in?callbackUrl=${callbackUrl}`}>
              Đăng nhập
            </Link>
          </div>
        </>
      ) : (
        <Step2OTPForm email={userData!.email} name={userData!.name} onVerified={handleOTPVerified} onBack={handleBack} />
      )}

      {isRegistering && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Đang tạo tài khoản...</p>
          </div>
        </div>
      )}
    </div>
  );
}
