/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EmailChangeSessionService } from "@/lib/services/email-change-session.service";
import Step1InputForm from "./step1-input-form";
import Step2VerifyForm from "./step2-verify-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface EmailChangeFlowProps {
  initialStep?: string;
}

export default function EmailChangeFlow({ initialStep }: EmailChangeFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = searchParams.get("step");
  const emailFromURL = searchParams.get("email");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Security: Check if user can access verify step
  useEffect(() => {
    if (!mounted) return;

    if (step === "verify") {
      const session = EmailChangeSessionService.get();

      // No valid session -> redirect to input
      if (!session) {
        setError("Phiên làm việc đã hết hạn. Vui lòng thử lại.");
        setTimeout(() => {
          router.push("/account/manage/email");
        }, 2000);
        return;
      }

      // Email in URL doesn't match session -> redirect
      if (emailFromURL && emailFromURL !== session.newEmail) {
        setError("Thông tin không hợp lệ. Vui lòng thử lại.");
        EmailChangeSessionService.clear();
        setTimeout(() => {
          router.push("/account/manage/email");
        }, 2000);
        return;
      }

      setError(null);
    }
  }, [mounted, step, emailFromURL, router]);

  // Handle step 1 completion
  const handleOTPSent = (newEmail: string) => {
    // Save to session storage
    EmailChangeSessionService.save(newEmail);

    // Navigate to verify step with email in URL
    router.push(`/account/manage/email?step=verify&email=${encodeURIComponent(newEmail)}`);
  };

  // Handle successful verification
  const handleVerified = () => {
    // Clear session
    EmailChangeSessionService.clear();

    // Navigate back to manage page
    router.push("/account/manage");
  };

  // Handle back from verify step
  const handleBack = () => {
    // Clear session
    EmailChangeSessionService.clear();

    // Navigate back to input
    router.push("/account/manage/email");
  };

  // Don't render until mounted (avoid hydration mismatch)
  if (!mounted) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Show error if any
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Render appropriate step
  if (step === "verify") {
    const session = EmailChangeSessionService.get();
    if (!session) {
      return null; // Will redirect via useEffect
    }

    return <Step2VerifyForm newEmail={session.newEmail} onVerified={handleVerified} onBack={handleBack} />;
  }

  return <Step1InputForm onOTPSent={handleOTPSent} />;
}
