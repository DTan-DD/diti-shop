"use server";

import bcrypt from "bcryptjs";
import { auth, signIn, signOut } from "@/auth";
import { IUpdateUserProfile, IUserAddress, IUserName, IUserPhone, IUserSignIn, IUserSignUp } from "@/types";
import { ChangeEmailSchema, ChangePasswordSchema, UserSignUpSchema, UserUpdateSchema, VerifyEmailOTPSchema } from "../validator";
import { connectToDatabase } from "../db";
import User, { IUser } from "../db/models/user.model";
import { formatError } from "../utils";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSetting } from "./setting.actions";
import bcryptjs from "bcryptjs";
import useCartStore from "@/hooks/use-cart-store";
import { OTPService } from "../services/otp.service";
import { sendChangeEmailOTP, sendChangeEmailSecurityAlert } from "@/emails";

// CREATE
export async function registerUser(userSignUp: IUserSignUp) {
  try {
    const user = await UserSignUpSchema.parseAsync({
      name: userSignUp.name,
      email: userSignUp.email,
      password: userSignUp.password,
      confirmPassword: userSignUp.confirmPassword,
    });

    await connectToDatabase();
    await User.create({
      ...user,
      password: await bcrypt.hash(user.password, 5),
      emailVerified: true, // Set to true after OTP verification
    });
    return { success: true, message: "Tạo tài khoản thành công" };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
}

// DELETE

export async function deleteUser(id: string) {
  try {
    await connectToDatabase();
    const res = await User.findByIdAndDelete(id);
    if (!res) throw new Error("Use not found");
    revalidatePath("/admin/users");
    return {
      success: true,
      message: "User deleted successfully",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
// UPDATE

export async function updateUser(user: z.infer<typeof UserUpdateSchema>) {
  try {
    await connectToDatabase();
    const dbUser = await User.findById(user._id);
    if (!dbUser) throw new Error("User not found");
    dbUser.name = user.name;
    dbUser.email = user.email;
    dbUser.role = user.role;
    const updatedUser = await dbUser.save();
    revalidatePath("/admin/users");
    return {
      success: true,
      message: "User updated successfully",
      data: JSON.parse(JSON.stringify(updatedUser)),
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
// export async function updateUserName(user: IUserName) {
//   try {
//     await connectToDatabase();
//     const session = await auth();
//     const currentUser = await User.findById(session?.user?.id);
//     if (!currentUser) throw new Error("User not found");
//     currentUser.name = user.name;
//     const updatedUser = await currentUser.save();
//     return {
//       success: true,
//       message: "User updated successfully",
//       data: JSON.parse(JSON.stringify(updatedUser)),
//     };
//   } catch (error) {
//     return { success: false, message: formatError(error) };
//   }
// }

// export async function updateUserPhone(user: IUserPhone) {
//   try {
//     await connectToDatabase();
//     const session = await auth();
//     const currentUser = await User.findById(session?.user?.id);
//     if (!currentUser) throw new Error("User not found");
//     currentUser.phone = user.phone;
//     const updatedUser = await currentUser.save();
//     return {
//       success: true,
//       message: "User updated successfully",
//       data: JSON.parse(JSON.stringify(updatedUser)),
//     };
//   } catch (error) {
//     return { success: false, message: formatError(error) };
//   }
// }

// export async function updateUserAddress(address: IUserAddress) {
//   try {
//     const session = await auth();
//     if (!session?.user?.id) {
//       return { success: false, message: "Unauthorized" };
//     }

//     await connectToDatabase();

//     const user = await User.findById(session.user?.id);
//     if (!user) {
//       return { success: false, message: "User not found" };
//     }

//     user.address = {
//       fullName: address.fullName,
//       phone: address.phone,
//       country: address.country,
//       province: address.province,
//       district: address.district,
//       ward: address.ward,
//       street: address.street,
//     };

//     await user.save();

//     return {
//       success: true,
//       message: "Địa chỉ đã được cập nhật thành công",
//       data: JSON.parse(JSON.stringify(user)),
//     };
//   } catch (error) {
//     console.error("Error updating user address:", error);
//     return { success: false, message: "Có lỗi xảy ra khi cập nhật địa chỉ" };
//   }
// }

export async function updateUserPassword(data: z.infer<typeof ChangePasswordSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    await connectToDatabase();

    const user = await User.findById(session.user.id);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Check if user has a password (not OAuth user)
    if (!user.password) {
      return {
        success: false,
        message: "Tài khoản của bạn đăng nhập qua mạng xã hội, không thể đổi mật khẩu",
      };
    }

    // Verify current password
    const isPasswordValid = await bcryptjs.compare(data.currentPassword, user.password);

    if (!isPasswordValid) {
      return { success: false, message: "Mật khẩu hiện tại không đúng" };
    }

    // Hash new password
    const hashedPassword = await bcryptjs.hash(data.newPassword, 10);

    // Update password
    user.password = hashedPassword;
    await user.save();

    // revalidatePath("/account/manage");
    // revalidatePath("/account/manage/password");

    return {
      success: true,
      message: "Đổi mật khẩu thành công",
    };
  } catch (error) {
    console.error("Error updating password:", error);
    return { success: false, message: "Có lỗi xảy ra khi đổi mật khẩu" };
  }
}

export async function signInWithCredentials(user: IUserSignIn) {
  return await signIn("credentials", { ...user, redirect: false });
}
export const SignInWithGoogle = async () => {
  await signIn("google");
};
export const SignOut = async () => {
  // Clear cart trước
  useCartStore.getState().clearCart();
  const redirectTo = await signOut({ redirect: false, redirectTo: "/" });
  redirect(redirectTo.redirect);
};

// GET
export async function getAllUsers({ limit, page }: { limit?: number; page: number }) {
  const {
    common: { pageSize },
  } = await getSetting();
  limit = limit || pageSize;
  await connectToDatabase();

  const skipAmount = (Number(page) - 1) * limit;
  const users = await User.find().sort({ createdAt: "desc" }).skip(skipAmount).limit(limit);
  const usersCount = await User.countDocuments();
  return {
    data: JSON.parse(JSON.stringify(users)) as IUser[],
    totalPages: Math.ceil(usersCount / limit),
  };
}

export async function getUserById2(userId: string) {
  await connectToDatabase();
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  return JSON.parse(JSON.stringify(user)) as IUser;
}

export async function getUserById() {
  await connectToDatabase();
  const session = await auth();
  const userId = session?.user?.id;
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  return JSON.parse(JSON.stringify(user)) as IUser;
}

export async function updateUserProfile(data: IUpdateUserProfile) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    await connectToDatabase();

    const user = await User.findById(session.user.id);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    // cập nhật từng phần nếu có
    if (data.address) user.address = { ...user.address, ...data.address };
    if (data.phone) user.phone = data.phone;
    if (data.name) user.name = data.name;
    await user.save();

    return {
      success: true,
      message: "Profile updated successfully",
      data: JSON.parse(JSON.stringify(user)),
    };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { success: false, message: "Error updating profile" };
  }
}

// Request email change (send OTP)
export async function requestEmailChange(data: z.infer<typeof ChangeEmailSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    await connectToDatabase();

    const user = await User.findById(session.user.id);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Check if user has a password (not OAuth user)
    if (!user.password) {
      return {
        success: false,
        message: "Tài khoản của bạn đăng nhập qua mạng xã hội, không thể đổi email",
      };
    }

    // Verify password
    const isPasswordValid = await bcryptjs.compare(data.password, user.password);
    if (!isPasswordValid) {
      return { success: false, message: "Mật khẩu không đúng" };
    }

    // Check if new email already exists
    const existingUser = await User.findOne({ email: data.newEmail });
    if (existingUser) {
      return {
        success: false,
        message: "Email này đã được sử dụng bởi tài khoản khác",
      };
    }

    // Generate and save OTP for new email
    const otp = OTPService.generateOTP();
    await OTPService.saveOTP(`email-change:${data.newEmail}`, otp);

    // Send OTP to both old and new email
    await sendChangeEmailOTP({
      email: data.newEmail, // Send to new email
      otp,
      userName: user.name,
      oldEmail: user.email,
      newEmail: data.newEmail,
    });

    // Also notify old email
    // await sendChangeEmailOTP({
    //   email: user.email, // Send to old email too
    //   otp,
    //   userName: user.name,
    //   oldEmail: user.email,
    //   newEmail: data.newEmail,
    // });

    return {
      success: true,
      message: "Mã OTP đã được gửi đến email mới. Vui lòng kiểm tra hộp thư.",
      data: { newEmail: data.newEmail },
    };
  } catch (error) {
    console.error("Error requesting email change:", error);
    return { success: false, message: "Có lỗi xảy ra. Vui lòng thử lại." };
  }
}

// Verify OTP and change email
export async function verifyAndChangeEmail(data: z.infer<typeof VerifyEmailOTPSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    // Verify OTP
    const otpResult = await OTPService.verifyOTP(`email-change:${data.email}`, data.otp);

    if (!otpResult.success) {
      return otpResult;
    }

    await connectToDatabase();

    // Update email
    const user = await User.findById(session.user.id);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Old mail
    const oldEmail = user.email;

    // Double check email not taken (race condition protection)
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return {
        success: false,
        message: "Email này đã được sử dụng bởi tài khoản khác",
      };
    }

    user.email = data.email;
    user.emailVerified = true;
    await user.save();

    // send email notification to old email
    await sendChangeEmailSecurityAlert({ oldEmail, newEmail: data.email, userName: user.name, actionTime: new Date().toISOString() });

    revalidatePath("/account/manage");
    revalidatePath("/account/manage/email");

    return {
      success: true,
      message: "Đổi email thành công!",
      data: { email: user.email },
    };
  } catch (error) {
    console.error("Error changing email:", error);
    return { success: false, message: "Có lỗi xảy ra. Vui lòng thử lại." };
  }
}
