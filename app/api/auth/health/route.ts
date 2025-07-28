/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/auth/health/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/db/mongodb";

export async function GET() {
  try {
    // Test MongoDB connection
    const client = await clientPromise;
    const db = client.db();
    await db.command({ ping: 1 });
    
    return NextResponse.json({
      status: "healthy",
      message: "Auth system is functioning correctly",
      database: "connected"
    });
  } catch (error: any) {
    console.error("Auth health check failed:", error);
    return NextResponse.json({
      status: "error",
      message: "Auth system health check failed",
      error: error.message
    }, { status: 500 });
  }
}