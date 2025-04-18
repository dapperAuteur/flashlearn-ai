// types/next-auth.d.ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }
  
  interface User {
    id: string;
    role: string;
    emailVerified: {
      type: boolean,
      default: false
    },
    verificationToken?: string;
    verificationTokenExpires?: Date;
  }
}