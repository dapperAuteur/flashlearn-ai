/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcrypt";
import clientPromise from "@/lib/db/mongodb";
import { z } from "zod";
import { generateVerificationToken } from "@/lib/tokens";
import { getClientIp } from "@/lib/utils/utils";
import { getRateLimiter } from "@/lib/ratelimit/rateLimitAPI";
import { logAuthEvent } from "@/lib/logging/authLogger";
import { AuthEventType } from "@/models/AuthLog"; // Correctly imports the full enum
import { sendVerificationEmail } from "@/lib/email/mailgun";
import { Logger, LogContext } from "@/lib/logging/logger";

// Validation schema for user registration
const userSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(10, { message: "Password must be at least 10 characters" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
    .regex(/[0-9]/, { message: "Password must contain at least one number" })
    .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character" })
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request) ?? "127.0.0.1";

  // Apply rate limiting (5 registration attempts per 10 minutes)
  const limiter = getRateLimiter("register", 5, 600);
  const rateLimitResult = await limiter.limit(ip);

  // If rate limit exceeded, return 429 Too Many Requests
  if (!rateLimitResult.success) {
    await Logger.warning(LogContext.AUTH, "Rate limit exceeded for registration", { ip });
    return NextResponse.json(
      { 
        error: "Too many registration attempts. Please try again later.", 
      },
      { 
        status: 429,
        headers: {
          "Retry-After": rateLimitResult.reset.toString(),
        }
      }
    );
  }

  try {
    const body = await request.json();
    await Logger.info(LogContext.AUTH, "Registration attempt started.", { email: body.email, ip });
    
    // Validate input
    const result = userSchema.safeParse(body);
    if (!result.success) {
      await logAuthEvent({
        request,
        event: AuthEventType.REGISTER_FAILURE, // This will now work
        email: body.email,
        status: "failure",
        reason: "Validation error",
        metadata: { validationErrors: result.error.formErrors.fieldErrors }
      });
      return NextResponse.json(
        { error: "Validation error", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    const { name, email, password } = result.data;
    
    // Connect to database
    const client = await clientPromise;
    const db = client.db();
    
    // Check if user already exists
    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      await logAuthEvent({
        request,
        event: AuthEventType.REGISTER_FAILURE, // This will now work
        email,
        status: "failure",
        reason: "User already exists"
      });
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Generate verification token and expiry date (24 hours from now)
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // Hash the password
    const hashedPassword = await hash(password, 12);
    
    // Create the user
    const newUser = await db.collection("users").insertOne({
      name,
      email,
      password: hashedPassword,
      role: "Student", // Default role
      emailVerified: false,
      verificationToken,
      verificationExpires,
      createdAt: new Date(),
      updatedAt: new Date(),
      profiles: [],
      subscriptionTier: 'Free'
    });
    
    const userId = newUser.insertedId.toString();

    await logAuthEvent({
      request,
      event: AuthEventType.REGISTER,
      userId,
      email,
      status: "success",
      metadata: { name }
    });

    // Send verification email
    await sendVerificationEmail(email, name, verificationToken);
    
    return NextResponse.json(
      { 
        message: "User created successfully. Please check your email to verify your account.",
        userId
      },
      { status: 201 }
    );
  } catch (error: any) {
    let email: string | undefined;
    try {
        // We clone the request because the body can only be read once.
        const body = await request.clone().json();
        email = body.email;
    } catch (e) {
      await logAuthEvent({
      request,
      event: AuthEventType.REGISTER,
      email,
      status: "success",
      metadata: { name, e }
    });
        // It's okay if we can't get the email, we'll just log without it.
    }
    await logAuthEvent({
      request,
      event: AuthEventType.REGISTER_FAILURE, // This will now work
      email: email,
      status: "failure",
      reason: "Internal server error",
      metadata: { error: error.message, stack: error.stack }
    });
    
    return NextResponse.json(
      { error: "An unexpected error occurred on the server." },
      { status: 500 }
    );
  }
}
