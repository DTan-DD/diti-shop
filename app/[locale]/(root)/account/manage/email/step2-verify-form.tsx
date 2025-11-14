/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import OTPInput from "@/components/shared/otp-input";
import { verifyAndChangeEmail, requestEmailChange } from "@/lib/actions/user.actions";
import { EmailChangeSessionService } from "@/lib/services/email-change-session.service";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface Step2Props {
  newEmail: string;
  onVerified: () => void;
  onBack: () => void;
}

export default function Step2VerifyForm({ newEmail, onVerified, onBack }: Step2Props) {
  const { data: session, update } = useSession();
  const { toast } = useToast();
  const router = useRouter();

  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Initialize countdown from session
  useEffect(() => {
    const remaining = EmailChangeSessionService.getRemainingTime();
    setCountdown(remaining);

    if (remaining === 0) {
      setSessionExpired(true);
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        const newCountdown = countdown - 1;
        setCountdown(newCountdown);

        if (newCountdown === 0) {
          setSessionExpired(true);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      return toast({
        variant: "destructive",
        description: "Vui lòng nhập đầy đủ 6 số OTP",
      });
    }

    setIsVerifying(true);
    const res = await verifyAndChangeEmail({
      email: newEmail,
      otp: otp,
    });
    setIsVerifying(false);

    if (!res.success) {
      toast({
        variant: "destructive",
        description: res.message,
      });
      setOtp("");
      return;
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

    setShowSuccess(true);
  };

  const handleResend = async () => {
    // Need to get password again - redirect back
    toast({
      description: "Để gửi lại OTP, vui lòng nhập lại mật khẩu ở bước trước.",
    });
    onBack();
  };

  const handleSuccessContinue = () => {
    EmailChangeSessionService.clear();
    onVerified();
    redirect("/account/manage");
  };

  const handleSessionExpired = () => {
    EmailChangeSessionService.clear();
    router.push("/account/manage/email");
  };

  if (sessionExpired) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Phiên xác thực đã hết hạn. Vui lòng thử lại.</span>
          <Button onClick={handleSessionExpired} size="sm" variant="outline">
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack} className="mb-4">
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

          <Button onClick={handleVerify} disabled={isVerifying || otp.length !== 6} className="w-full" size="lg">
            {isVerifying ? "Đang xác thực..." : "Xác thực"}
          </Button>

          {/* Info about resend */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Không nhận được mã?</p>
            <Button variant="link" onClick={handleResend} className="text-blue-600">
              Quay lại để gửi lại OTP
            </Button>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p className="mb-2">
            💡 <strong>Lưu ý:</strong>
          </p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>Kiểm tra cả thư mục Spam/Junk</li>
            <li>Mã OTP có hiệu lực trong 10 phút</li>
            <li>Email cũ cũng nhận được thông báo để bảo mật</li>
            <li>Nếu refresh trang, bạn có thể tiếp tục từ bước này (trong 10 phút)</li>
          </ul>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
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
            <Button onClick={handleSuccessContinue} className="w-full sm:w-auto px-8" size="lg">
              Tiếp tục
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
