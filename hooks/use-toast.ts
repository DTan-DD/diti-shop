"use client";

import { toast as sonnerToast } from "sonner";

// Wrapper để giữ API tương tự với code cũ
export function toast({
  title,
  description,
  variant,
  action,
  ...props
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: "default" | "destructive";
  action?: React.ReactNode;
  [key: string]: any;
}) {
  const message = typeof title === "string" ? title : "";
  const desc = typeof description === "string" ? description : undefined;

  const baseStyle = "text-green-600 font-medium border-none";
  const styles = {
    default: `${baseStyle} bg-green-100`,
    destructive: `${baseStyle} bg-red-600`,
  };

  if (variant === "destructive") {
    return sonnerToast.error(message, {
      description: desc,
      className: styles.destructive,
      action: action as any,
      ...props,
    });
  }

  return sonnerToast(message, {
    description: desc,
    unstyled: true,
    className: styles.default,
    action: action as any,
    ...props,
  });
}

// Thêm các method tiện ích
toast.success = (message: string, options?: any) => {
  return sonnerToast.success(message, options);
};

toast.error = (message: string, options?: any) => {
  return sonnerToast.error(message, options);
};

toast.info = (message: string, options?: any) => {
  return sonnerToast.info(message, options);
};

toast.warning = (message: string, options?: any) => {
  return sonnerToast.warning(message, options);
};

toast.promise = sonnerToast.promise;

export function useToast() {
  return {
    toast,
    dismiss: (toastId?: string | number) => sonnerToast.dismiss(toastId),
  };
}
