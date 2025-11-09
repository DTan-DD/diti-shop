"use server";

import bcrypt from "bcryptjs";
import { auth, signIn, signOut } from "@/auth";
import { IUserAddress, IUserName, IUserPhone, IUserSignIn, IUserSignUp } from "@/types";
import { ChangePasswordSchema, UserSignUpSchema, UserUpdateSchema } from "../validator";
import { connectToDatabase } from "../db";
import User, { IUser } from "../db/models/user.model";
import { formatError } from "../utils";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSetting } from "./setting.actions";
import bcryptjs from "bcryptjs";

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
export async function updateUserName(user: IUserName) {
  try {
    await connectToDatabase();
    const session = await auth();
    const currentUser = await User.findById(session?.user?.id);
    if (!currentUser) throw new Error("User not found");
    currentUser.name = user.name;
    const updatedUser = await currentUser.save();
    return {
      success: true,
      message: "User updated successfully",
      data: JSON.parse(JSON.stringify(updatedUser)),
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function updateUserPhone(user: IUserPhone) {
  try {
    await connectToDatabase();
    const session = await auth();
    const currentUser = await User.findById(session?.user?.id);
    if (!currentUser) throw new Error("User not found");
    currentUser.phone = user.phone;
    const updatedUser = await currentUser.save();
    return {
      success: true,
      message: "User updated successfully",
      data: JSON.parse(JSON.stringify(updatedUser)),
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function updateUserAddress(address: IUserAddress) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    await connectToDatabase();

    const user = await User.findById(session.user?.id);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    user.address = {
      fullName: address.fullName,
      phone: address.phone,
      country: address.country,
      province: address.province,
      district: address.district,
      ward: address.ward,
      street: address.street,
    };

    await user.save();

    // revalidatePath("/account/manage");
    // revalidatePath("/account/manage/address");

    return {
      success: true,
      message: "Địa chỉ đã được cập nhật thành công",
      data: JSON.parse(JSON.stringify(user)),
    };
  } catch (error) {
    console.error("Error updating user address:", error);
    return { success: false, message: "Có lỗi xảy ra khi cập nhật địa chỉ" };
  }
}

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

export async function getUserById(userId: string) {
  await connectToDatabase();
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  return JSON.parse(JSON.stringify(user)) as IUser;
}
