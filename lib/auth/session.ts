import {getServerSession} from "next-auth"
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/auth";

export async function getSession() {
  try {
    const session = await getServerSession(authOptions);
    console.log('Session retrieved:', session);
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getSession();
  console.log('lib/auth/session :>> ', session);
  
  if (!session?.user) {
    return null;
  }
  
  return session.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    console.log("User not authenticated, redirecting to sign in");
    redirect("/signin");
  }
  
  return user;
}