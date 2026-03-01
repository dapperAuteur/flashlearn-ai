import CredentialsProvider from "next-auth/providers/credentials";
import crypto from "crypto";
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

          if (userDoc.suspended === true) {
            Logger.warning(LogContext.AUTH, "Authorize failed: User account is suspended.", { email });
            return null;
          }

          if (!userDoc.emailVerified) {
            Logger.warning(LogContext.AUTH, "Authorize failed: Email not verified.", { email });
            return null;
          }

          Logger.info(LogContext.AUTH, "User authorized successfully. Preparing data for JWT.", { email, role: userDoc.role });
          return {
            id: userDoc._id.toString(),
            name: userDoc.name,
            email: userDoc.email,
            role: userDoc.role,
            subscriptionTier: userDoc.subscriptionTier || 'Free',
            emailVerified: userDoc.emailVerified,
            image: userDoc.profilePicture || null,
          };
        } catch (error) {
          Logger.error(LogContext.AUTH, "Error during authorization.", { error });
          return null;
        }
      }
    }),
    CredentialsProvider({
      id: "email-code",
      name: "Email Code",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials) return null;

        const { email, code } = credentials;

        try {
          const client = await clientPromise;
          const db = client.db();
          const userDoc = await db.collection("users").findOne({ email });

          if (!userDoc || !userDoc.loginCode || !userDoc.loginCodeExpires) {
            Logger.warning(LogContext.AUTH, "Email-code authorize failed: No user or no pending code.", { email });
            return null;
          }

          if (userDoc.suspended === true) {
            Logger.warning(LogContext.AUTH, "Email-code authorize failed: User suspended.", { email });
            return null;
          }

          if (new Date() > new Date(userDoc.loginCodeExpires)) {
            Logger.warning(LogContext.AUTH, "Email-code authorize failed: Code expired.", { email });
            return null;
          }

          if ((userDoc.loginCodeAttempts || 0) >= 5) {
            Logger.warning(LogContext.AUTH, "Email-code authorize failed: Too many attempts.", { email });
            return null;
          }

          const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

          if (hashedCode !== userDoc.loginCode) {
            await db.collection("users").updateOne(
              { _id: userDoc._id },
              { $inc: { loginCodeAttempts: 1 } }
            );
            Logger.warning(LogContext.AUTH, "Email-code authorize failed: Invalid code.", { email });
            return null;
          }

          // Clear login code fields and mark email as verified (they proved ownership)
          await db.collection("users").updateOne(
            { _id: userDoc._id },
            {
              $unset: { loginCode: "", loginCodeExpires: "", loginCodeAttempts: "" },
              $set: { emailVerified: true },
            }
          );

          Logger.info(LogContext.AUTH, "User authorized via email code.", { email });
          return {
            id: userDoc._id.toString(),
            name: userDoc.name,
            email: userDoc.email,
            role: userDoc.role,
            subscriptionTier: userDoc.subscriptionTier || "Free",
            emailVerified: true,
            image: userDoc.profilePicture || null,
          };
        } catch (error) {
          Logger.error(LogContext.AUTH, "Error during email-code authorization.", { error });
          return null;
        }
      },
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        Logger.info(LogContext.AUTH, "JWT callback: Adding user data to token.", { userId: user.id, role: user.role });
        console.log('[DEBUG AUTH] JWT callback - user object:', JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role }));
        token.id = user.id;
        token.role = user.role;
        token.subscriptionTier = user.subscriptionTier || 'Free';
        token.suspended = user.suspended || false;
        token.emailVerified = !!user.emailVerified;
        token.image = user.image || undefined;
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
            token.suspended = userDoc.suspended || false;
            token.emailVerified = userDoc.emailVerified || false;
            token.image = userDoc.profilePicture || null;
          }
        } catch (error) {
          Logger.error(LogContext.AUTH, "Failed to refresh subscriptionTier in JWT.", { error });
        }
      }
      return token;
    },
    async session({ session, token }) {
      console.log('[DEBUG AUTH] Session callback - token.role:', token?.role, '| session.user exists:', !!session.user);
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.subscriptionTier = token.subscriptionTier || 'Free';
        session.user.emailVerified = token.emailVerified || false;
        session.user.image = token.image || null;
        console.log('[DEBUG AUTH] Session callback - set session.user.role to:', session.user.role);
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
