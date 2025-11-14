"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Mail, CheckCircle2, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { requestEmailChange, verifyAndChangeEmail } from "@/lib/actions/user.actions";
import { ChangeEmailSchema, VerifyEmailOTPSchema } from "@/lib/validator";
import OTPInput from "@/components/shared/otp-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OTP_CONFIG } from "@/lib/constants";

type Step = "input" | "verify" | "success";

export const ProfileForm = () => {
  const router = useRouter();
  const { data: session, update } = useSession();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("input");
  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(OTP_CONFIG.EXPIRY_MINUTES * 60);

  const emailForm = useForm<z.infer<typeof ChangeEmailSchema>>({
    resolver: zodResolver(ChangeEmailSchema),
    defaultValues: {
      newEmail: "",
      password: "",
    },
  });

  // Countdown timer
  useState(() => {
    if (step === "verify" && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  async function onSubmitEmail(values: z.infer<typeof ChangeEmailSchema>) {
    const res = await requestEmailChange(values);

    if (!res.success) {
      return toast({
        variant: "destructive",
        description: res.message,
      });
    }

    setNewEmail(values.newEmail);
    setStep("verify");
    setCountdown(OTP_CONFIG.EXPIRY_MINUTES * 60);
    toast({
      description: res.message,
    });
  }

  async function onVerifyOTP() {
    if (otp.length !== 6) {
      return toast({
        variant: "destructive",
        description: "Vui lòng nhập đầy đủ 6 số OTP",
      });
    }

    const res = await verifyAndChangeEmail({
      email: newEmail,
      otp: otp,
    });

    if (!res.success) {
      return toast({
        variant: "destructive",
        description: res.message,
      });
    }

    // Update session
    if ("data" in res && res.data) {
      const newSession = {
        ...session,
        user: {
          ...session?.user,
          email: res.data.email,
        },
      };
      await update(newSession);
    }

    setStep("success");
  }

  const handleResendOTP = async () => {
    const password = emailForm.getValues("password");
    const res = await requestEmailChange({
      newEmail,
      password,
    });

    if (res.success) {
      setCountdown(OTP_CONFIG.EXPIRY_MINUTES * 60);
      setOtp("");
      toast({
        description: "Mã OTP mới đã được gửi",
      });
    } else {
      toast({
        variant: "destructive",
        description: res.message,
      });
    }
  };

  const handleBack = () => {
    setStep("input");
    setOtp("");
  };

  const handleContinue = () => {
    setStep("input");
    router.push("/account/manage");
  };

  if (step === "verify") {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>

        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold">Xác thực email mới</h2>
          <p className="text-gray-600">Chúng tôi đã gửi mã OTP đến email mới:</p>
          <p className="font-semibold text-gray-800">{newEmail}</p>
          <p className="text-sm text-gray-500">(Email cũ cũng nhận được thông báo)</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Nhập mã OTP</label>
            <OTPInput value={otp} onChange={setOtp} />
          </div>

          {/* Countdown */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className={countdown < 60 ? "text-red-600 font-semibold" : "text-gray-600"}>⏰ Mã có hiệu lực trong: {formatTime(countdown)}</span>
          </div>

          <Button onClick={onVerifyOTP} disabled={otp.length !== 6} className="w-full" size="lg">
            Xác thực
          </Button>

          {/* Resend */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Không nhận được mã?</p>
            <Button variant="link" onClick={handleResendOTP} disabled={countdown > 0} className="text-blue-600">
              {countdown > 0 ? `Gửi lại sau ${formatTime(countdown)}` : "Gửi lại mã OTP"}
            </Button>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p className="mb-2">
            💡 <strong>Lưu ý:</strong>
          </p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>Kiểm tra cả thư mục Spam/Junk</li>
            <li>Mã OTP có hiệu lực trong {OTP_CONFIG.EXPIRY_MINUTES} phút</li>
            <li>Email cũ cũng nhận được thông báo để bảo mật</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <>
      <Form {...emailForm}>
        <form onSubmit={emailForm.handleSubmit(onSubmitEmail)} className="flex flex-col gap-5">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800 mb-2">
              <strong>📧 Email hiện tại:</strong> {session?.user?.email}
            </p>
            <p className="text-xs text-blue-700">Bạn sẽ nhận mã OTP ở cả email cũ và email mới để bảo mật</p>
          </div>

          <FormField
            control={emailForm.control}
            name="newEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold">Email mới</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="Nhập email mới" {...field} className="input-field" />
                </FormControl>
                <FormDescription>Email mới phải khác email hiện tại và chưa được sử dụng</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={emailForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold">Mật khẩu hiện tại</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} placeholder="Nhập mật khẩu để xác nhận" {...field} className="input-field pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </FormControl>
                <FormDescription>Nhập mật khẩu để xác nhận đây là bạn</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Lưu ý quan trọng</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Email mới sẽ được dùng để đăng nhập</li>
              <li>• Bạn sẽ nhận thông báo ở cả 2 email</li>
              <li>• Cần xác thực OTP để hoàn tất</li>
            </ul>
          </div>

          <Button type="submit" size="lg" disabled={emailForm.formState.isSubmitting} className="button w-full">
            {emailForm.formState.isSubmitting ? "Đang xử lý..." : "Tiếp tục"}
          </Button>
        </form>
      </Form>

      {/* Success Dialog */}
      <Dialog open={step === "success"} onOpenChange={() => setStep("input")}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <DialogTitle className="text-center text-xl">Đổi email thành công!</DialogTitle>
            <DialogDescription className="text-center space-y-3 pt-2">
              <p className="text-base">Email của bạn đã được cập nhật thành:</p>
              <p className="font-semibold text-lg text-gray-800">{newEmail}</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left">
                <p className="text-sm text-blue-800 font-medium mb-2">📝 Lưu ý:</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Sử dụng email mới để đăng nhập lần sau</li>
                  <li>• Email cũ không còn được sử dụng</li>
                  <li>• Kiểm tra email để nhận thông báo</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button onClick={handleContinue} className="w-full sm:w-auto px-8" size="lg">
              Tiếp tục
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
