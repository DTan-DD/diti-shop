"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { SignOut, updateUserPassword } from "@/lib/actions/user.actions";
import { ChangePasswordSchema } from "@/lib/validator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const ProfileForm = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const form = useForm<z.infer<typeof ChangePasswordSchema>>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof ChangePasswordSchema>) {
    const res = await updateUserPassword(values);

    if (!res.success) {
      return toast({
        variant: "destructive",
        description: res.message,
      });
    }

    // toast({
    //   description: res.message,
    // });

    // Show success dialog instead of toast
    setShowSuccessDialog(true);

    // Reset form
    form.reset();
  }

  const handleContinue = () => {
    setShowSuccessDialog(false);
    SignOut();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* Current Password */}
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Mật khẩu hiện tại</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input type={showCurrentPassword ? "text" : "password"} placeholder="Nhập mật khẩu hiện tại" {...field} className="input-field pr-10" />
                  <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                    {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* New Password */}
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Mật khẩu mới</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input type={showNewPassword ? "text" : "password"} placeholder="Nhập mật khẩu mới" {...field} className="input-field pr-10" />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </FormControl>
              <FormDescription>Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Confirm Password */}
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Xác nhận mật khẩu mới</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input type={showConfirmPassword ? "text" : "password"} placeholder="Nhập lại mật khẩu mới" {...field} className="input-field pr-10" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Password Strength Indicator */}
        {form.watch("newPassword") && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Độ mạnh mật khẩu:</p>
            <div className="space-y-1">
              <PasswordStrengthIndicator password={form.watch("newPassword")} />
            </div>
          </div>
        )}

        <Button type="submit" size="lg" disabled={form.formState.isSubmitting} className="button col-span-2 w-full">
          {form.formState.isSubmitting ? "Đang lưu..." : "Đổi mật khẩu"}
        </Button>
      </form>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <DialogTitle className="text-center text-xl">Đổi mật khẩu thành công!</DialogTitle>
            <DialogDescription className="text-center space-y-3 pt-2">
              <p className="text-base">Mật khẩu của bạn đã được cập nhật thành công.</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left">
                <p className="text-sm text-blue-800 font-medium mb-2">📝 Lưu ý quan trọng:</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Sử dụng mật khẩu mới để đăng nhập lần sau</li>
                  <li>• Không chia sẻ mật khẩu với bất kỳ ai</li>
                  <li>• Đăng xuất khỏi các thiết bị cũ nếu cần</li>
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
    </Form>
  );
};

// Password Strength Indicator Component
function PasswordStrengthIndicator({ password }: { password: string }) {
  const checks = [
    {
      label: "Ít nhất 8 ký tự",
      valid: password.length >= 8,
    },
    {
      label: "Có chữ hoa",
      valid: /[A-Z]/.test(password),
    },
    {
      label: "Có chữ thường",
      valid: /[a-z]/.test(password),
    },
    {
      label: "Có số",
      valid: /[0-9]/.test(password),
    },
    {
      label: "Có ký tự đặc biệt",
      valid: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    },
  ];

  const validCount = checks.filter((c) => c.valid).length;
  const strength = validCount <= 2 ? "Yếu" : validCount <= 3 ? "Trung bình" : validCount <= 4 ? "Khá" : "Mạnh";
  const strengthColor = validCount <= 2 ? "bg-red-500" : validCount <= 3 ? "bg-orange-500" : validCount <= 4 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="space-y-2">
      {/* Strength Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full ${strengthColor} transition-all duration-300`} style={{ width: `${(validCount / 5) * 100}%` }} />
        </div>
        <span className="text-sm font-medium">{strength}</span>
      </div>

      {/* Requirements Checklist */}
      <ul className="space-y-1">
        {checks.map((check, index) => (
          <li key={index} className="flex items-center gap-2 text-sm">
            <span className={check.valid ? "text-green-600" : "text-gray-400"}>{check.valid ? "✓" : "○"}</span>
            <span className={check.valid ? "text-green-600" : "text-gray-600"}>{check.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
