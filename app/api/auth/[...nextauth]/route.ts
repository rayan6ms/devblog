import NextAuth, { type NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/database/mongoClient";
import dbConnect from "@/database/dbConnect";
import User from "@/../models/User";

export const authConfig = {
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: "jwt" },
  providers: [
    GitHub,
    Google,
    // You can add Credentials later for email+password
  ],
  callbacks: {
    async signIn({ user }) {
      // ensure we have an app User document
      await dbConnect();
      const existing = await User.findOne({ _id: user.id });
      if (!existing) {
        // Create your app-level User doc mirroring Auth user id
        await User.create({
          _id: user.id, // align with Auth user id (Mongo ObjectId string)
          username: user.name || user.email?.split("@")[0] || "user",
          role: "member",
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token?.uid) session.user.id = token.uid as string;
      return session;
    },
  },
} satisfies NextAuthConfig;

const handler = NextAuth(authConfig);
export { handler as GET, handler as POST };