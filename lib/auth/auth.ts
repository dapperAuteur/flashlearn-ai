/* eslint-disable @typescript-eslint/no-unused-vars */
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import clientPromise from "@/lib/db/mongodb";
import { NextAuthOptions } from "next-auth";
import type { User } from "next-auth";

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
          console.log("Authenticating user:", email);
          const client = await clientPromise;
          const db = client.db();
          const userDoc = await db.collection("users").findOne({ email });
          
          if (!userDoc) {
            console.log("No user found with email:", email);
            return null;
          }
          
          const isPasswordValid = await compare(password, userDoc.password);
          
          if (!isPasswordValid) {
            console.log("Invalid password for user:", email);
            return null;
          }
          
          console.log("User authenticated successfully:", email);
          return {
            id: userDoc._id.toString(),
            email: userDoc.email || null,
            name: userDoc.name,
            role: userDoc.role,
            image: userDoc.image || null,
            // emailVerified: null
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/signin",
    signOut: "/signout",
    error: "/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};