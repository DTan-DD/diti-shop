"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { requestEmailChange } from "@/lib/actions/user.actions";
import { ChangeEmailSchema } from "@/lib/validator";

interface Step1Props {
  onOTPSent: (newEmail: string) => void;
}

export default function Step1InputForm({ onOTPSent }: Step1Props) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof ChangeEmailSchema>>({
    resolver: zodResolver(ChangeEmailSchema),
    defaultValues: {
      newEmail: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof ChangeEmailSchema>) {
    const res = await requestEmailChange(values);

    if (!res.success) {
      return toast({
        variant: "destructive",
        description: res.message,
      });
    }

    toast({
      description: res.message,
    });

    // Proceed to verify step
    onOTPSent(values.newEmail);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 mb-2">
            <strong>📧 Email hiện tại:</strong> {session?.user?.email}
          </p>
          <p className="text-xs text-blue-700">Bạn sẽ nhận mã OTP ở cả email cũ và email mới để bảo mật</p>
        </div>

        <FormField
          control={form.control}
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
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Mật khẩu hiện tại</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="Nhập mật khẩu để xác nhận" {...field} className="input-field pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
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
            <li>• Mã OTP có hiệu lực trong 10 phút</li>
          </ul>
        </div>

        <Button type="submit" size="lg" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? "Đang xử lý..." : "Gửi mã OTP"}
        </Button>
      </form>
    </Form>
  );
}
