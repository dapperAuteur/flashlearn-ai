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
          // This object is passed to the `jwt` callback's `user` parameter
          return {
            id: userDoc._id.toString(),
            role: userDoc.role, // This is the custom property
          };
        } catch (error) {
          Logger.error(LogContext.AUTH, "Error during authorization.", { error });
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // The `user` object is only passed on the initial sign-in.
      if (user) {
        // This log is critical. It confirms the role is being added to the token.
        Logger.info(LogContext.AUTH, "JWT callback: Adding user data to token.", { userId: user.id, role: user.role });
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
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
