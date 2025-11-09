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
      role: string;
      phone: string;
      hasPassword?: boolean; // ✅ dùng flag thay vì password
      address?: {
        fullName?: string;
        country?: string;
        province?: string;
        district?: string;
        ward?: string;
        street?: string;
      };
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
        token.name = user.name || user.email!.split("@")[0];
        token.role = (user as { role: string }).role;
        token.phone = (user as { phone?: string })?.phone ?? null;
        token.address = (user as { address?: Address })?.address ?? null;
        token.hasPassword = (user as { hasPassword?: boolean }).hasPassword ?? false; // ✅
      }

      // 👇 Thêm phần này để handle update từ client
      if (trigger === "update" && session?.user) {
        if (session.user.name) token.name = session.user.name;
        if (session.user.phone) token.phone = session.user.phone;
        if (session.user.role) token.role = session.user.role;
        if (session.user.address) token.address = session.user.address;
        token.hasPassword = session.user.hasPassword ?? token.hasPassword;
      }
      return token;
    },
    session: async ({ session, user, trigger, token }) => {
      session.user.id = token.sub as string;
      session.user.role = token.role as string;
      session.user.name = token.name;
      if (trigger === "update") {
        session.user.name = user.name;
      }
      session.user.phone = token.phone as string;
      session.user.address = token.address as Address;
      session.user.hasPassword = token.hasPassword as boolean; // ✅
      return session;
    },
  },
});
