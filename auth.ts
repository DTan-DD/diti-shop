import { MongoDBAdapter } from "@auth/mongodb-adapter";
import bcrypt from "bcryptjs";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectToDatabase } from "./lib/db";
import client from "./lib/db/client";
import User from "./lib/db/models/user.model";
import Google from "next-auth/providers/google";
import NextAuth, { type DefaultSession } from "next-auth";
import authConfig from "./auth.config";
import { Address } from "./types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      hasPassword?: boolean; // ✅ dùng flag thay vì password
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  pages: {
    signIn: "/sign-in",
    newUser: "/sign-up",
    error: "/sign-in",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  adapter: MongoDBAdapter(client),
  providers: [
    Google({
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      credentials: {
        email: {
          type: "email",
        },
        password: { type: "password" },
      },
      async authorize(credentials) {
        await connectToDatabase();
        if (!credentials) return null;

        const user = await User.findOne({ email: credentials.email });
        if (!user) return null;

        if (user.password) {
          const isMatch = await bcrypt.compare(credentials.password as string, user.password);
          if (!isMatch) return null;
        } else {
          // nếu user login bằng OAuth, không có password
          return {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            address: user.address,
            hasPassword: false,
          };
        }

        return {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          address: user.address,
          hasPassword: !!user.password, // ✅ thêm flag
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        if (!user.name) {
          await connectToDatabase();
          await User.findByIdAndUpdate(user.id, {
            name: user.name || user.email!.split("@")[0],
            role: "user",
          });
        }
        token.id = user.id;
        // token.name = user.name || user.email!.split("@")[0];
        token.role = (user as { role: string }).role;
        token.hasPassword = (user as { hasPassword?: boolean }).hasPassword ?? false; // ✅
        token.email = user.email; // ✅ Thêm email
      }

      // 👇 Thêm phần này để handle update từ client
      if (trigger === "update" && session?.user) {
        if (session.user.role) token.role = session.user.role;
        token.hasPassword = session.user.hasPassword ?? token.hasPassword;
        token.email = session.user.email ?? token.email; // ✅ Cập nhật từ client
      }
      return token;
    },
    session: async ({ session, user, trigger, token }) => {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.user.name = token.name;
      session.user.hasPassword = token.hasPassword as boolean; // ✅
      session.user.email = token.email as string; // ✅ Đảm bảo session lấy email từ token
      return session;
    },
  },
});
