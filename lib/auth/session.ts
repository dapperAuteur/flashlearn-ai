// lib/auth/session.ts
import {getServerSession} from "next-auth"
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { LogContext, Logger } from "../logging/logger";

export async function getSession() {
  try {
    const session = await getServerSession(authOptions);
    Logger.info(LogContext.AUTH,'Session retrieved', {
      session
    });
    return session;
  } catch (error) {
    Logger.error(LogContext.AUTH,'Error getting session', {
      error
    });
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getSession();
  
  if (!session?.user) {
    return null;
  }
  
  return session.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    Logger.info(LogContext.AUTH,'User not authenticated, redirecting to sign in');
    redirect("/signin");
  }
  
  return user;
}