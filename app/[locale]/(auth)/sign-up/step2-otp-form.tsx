/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import OTPInput from "@/components/shared/otp-input";
import { verifyOTPAction, resendOTPAction } from "@/lib/actions/otp.actions";
import { Mail, Timer, ArrowLeft } from "lucide-react";
import { OTP_CONFIG } from "@/lib/constants";

interface Step2Props {
  email: string;
  name: string;
  onVerified: () => void;
  onBack: () => void;
}

export default function Step2OTPForm({ email, name, onVerified, onBack }: Step2Props) {
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(OTP_CONFIG.EXPIRY_MINUTES * 60);
  const [canResend, setCanResend] = useState(false);
  const { toast } = useToast();

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast({
        variant: "destructive",
        description: "Vui lòng nhập đầy đủ 6 số OTP",
      });
      return;
    }

    setIsVerifying(true);
    const result = await verifyOTPAction(email, otp);
    setIsVerifying(false);

    if (result.success) {
      toast({
        description: result.message,
      });
      onVerified();
    } else {
      toast({
        variant: "destructive",
        description: result.message,
      });
      setOtp("");
    }
  };

  const handleResend = async () => {
    const result = await resendOTPAction(email, name);
    if (result.success) {
      toast({
        description: "Mã OTP mới đã được gửi",
      });
      setCountdown(OTP_CONFIG.EXPIRY_MINUTES * 60);
      setCanResend(false);
      setOtp("");
    } else {
      toast({
        variant: "destructive",
        description: result.message,
      });
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Quay lại
      </Button>

      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <Mail className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold">Xác thực email</h2>
        <p className="text-gray-600">Chúng tôi đã gửi mã OTP gồm 6 số đến</p>
        <p className="font-semibold text-gray-800">{email}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Nhập mã OTP</label>
          <OTPInput value={otp} onChange={setOtp} />
        </div>

        {/* Countdown Timer */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <Timer className="w-4 h-4" />
          <span className={countdown < 60 ? "text-red-600 font-semibold" : "text-gray-600"}>Mã có hiệu lực trong: {formatTime(countdown)}</span>
        </div>

        {/* Verify Button */}
        <Button onClick={handleVerify} disabled={isVerifying || otp.length !== 6} className="w-full" size="lg">
          {isVerifying ? "Đang xác thực..." : "Xác thực"}
        </Button>

        {/* Resend Button */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Không nhận được mã?</p>
          {/* <Button variant="link" onClick={handleResend} disabled={!canResend} className="text-blue-600">
            {canResend ? "Gửi lại mã OTP" : `Gửi lại sau ${formatTime(countdown)}`}
          </Button> */}
          <Button variant="link" onClick={handleResend} className="text-blue-600">
            {"Gửi lại mã OTP"}
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <p className="mb-2">
          💡 <strong>Lưu ý:</strong>
        </p>
        <ul className="space-y-1 ml-4 list-disc">
          <li>Kiểm tra cả thư mục Spam/Junk</li>
          <li>Mã OTP có hiệu lực trong {OTP_CONFIG.EXPIRY_MINUTES} phút</li>
          <li>Bạn có tối đa {OTP_CONFIG.MAX_VERIFY_ATTEMPTS} lần thử</li>
        </ul>
      </div>
    </div>
  );
}
