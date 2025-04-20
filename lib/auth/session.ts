// lib/auth/session.ts
import {getServerSession} from "next-auth/next"
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getSession() {
  return await getServerSession(authOptions);
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
    console.log("User not authenticated, redirecting to sign in");
    redirect("/signin");
  }
  
  return user;
}