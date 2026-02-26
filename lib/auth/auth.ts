import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import clientPromise from "@/lib/db/mongodb";
import { NextAuthOptions } from "next-auth";
import type { User } from "next-auth";
import { Logger, LogContext } from "@/lib/logging/logger";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials) return null;
        
        const { email, password } = credentials;
        
        try {
          const client = await clientPromise;
          const db = client.db();
          const userDoc = await db.collection("users").findOne({ email });
          
          if (!userDoc) {
            Logger.warning(LogContext.AUTH, "Authorize failed: No user found.", { email });
            return null;
          }
          
          const isPasswordValid = await compare(password, userDoc.password);
          
          if (!isPasswordValid) {
            Logger.warning(LogContext.AUTH, "Authorize failed: Invalid password.", { email });
            return null;
          }
          
          Logger.info(LogContext.AUTH, "User authorized successfully. Preparing data for JWT.", { email, role: userDoc.role });
          return {
            id: userDoc._id.toString(),
            role: userDoc.role,
            subscriptionTier: userDoc.subscriptionTier || 'Free',
          };
        } catch (error) {
          Logger.error(LogContext.AUTH, "Error during authorization.", { error });
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        Logger.info(LogContext.AUTH, "JWT callback: Adding user data to token.", { userId: user.id, role: user.role });
        token.id = user.id;
        token.role = user.role;
        token.subscriptionTier = user.subscriptionTier || 'Free';
      }
      // Refresh subscriptionTier from DB on update trigger (e.g. after purchase)
      if (trigger === 'update') {
        try {
          const client = await clientPromise;
          const db = client.db();
          const { ObjectId } = await import('mongodb');
          const userDoc = await db.collection('users').findOne({ _id: new ObjectId(token.id) });
          if (userDoc) {
            token.subscriptionTier = userDoc.subscriptionTier || 'Free';
            token.name = userDoc.name;
          }
        } catch (error) {
          Logger.error(LogContext.AUTH, "Failed to refresh subscriptionTier in JWT.", { error });
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.subscriptionTier = token.subscriptionTier || 'Free';
      }
      return session;
    }
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
