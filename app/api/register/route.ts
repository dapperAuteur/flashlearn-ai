// app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcrypt";
import clientPromise from "@/lib/db/mongodb";
import { z } from "zod";
import { generateVerificationToken } from "@/lib/tokens";
// import { sendEmail } from "@/lib/email/sendEmail";
// import { getVerificationEmailTemplate } from "@/lib/email/templates/verification";
import { getClientIp } from "@/lib/utils";
import { rateLimitRequest } from "@/lib/ratelimit/ratelimit";
import { logAuthEvent } from "@/lib/logging/authLogger";
import { AuthEventType } from "@/models/AuthLog";
import { sendVerificationEmail } from "@/lib/email/mailgun";

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

  // Get client IP for rate limiting
  const ip = getClientIp(request);

  // Apply rate limiting (5 registration attempts per 10 minutes)
  const rateLimitResult = await rateLimitRequest(ip, "register", 5, 600);

  // If rate limit exceeded, return 429 Too Many Requests
  if (!rateLimitResult.success) {
    console.log(`Rate limit exceeded for IP ${ip} on registration endpoint`);
    return NextResponse.json(
      { 
        error: "Too many registration attempts. Please try again later.", 
        retryAfter: rateLimitResult.reset 
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
    // Parse the request body
    const body = await request.json();
    console.log("Registration attempt:", body.email);
    
    // Validate input
    const result = userSchema.safeParse(body);
    if (!result.success) {
      console.log("Validation error:", result.error.errors);

      // Log failed registration
      await logAuthEvent({
        request,
        event: AuthEventType.REGISTER_FAILURE,
        email: body.email,
        status: "failure",
        reason: "Validation error",
        metadata: { validationErrors: result.error.errors }
      });


      return NextResponse.json(
        { error: "Validation error", details: result.error.errors },
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
      console.log("User already exists:", email);

      // Log failed registration
      await logAuthEvent({
        request,
        event: AuthEventType.REGISTER_FAILURE,
        email,
        status: "failure",
        reason: "User already exists"
      });


      return NextResponse.json(
        { error: "User already exists" },
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
      role: "free", // Default role
      emailVerified: false,
      verificationToken,
      verificationExpires,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const userId = newUser.insertedId.toString();

    console.log("User created successfully:", userId);

    // Log successful registration
    await logAuthEvent({
      request,
      event: AuthEventType.REGISTER,
      userId,
      email,
      status: "success",
      metadata: { name }
    });

    // Create verification URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/api/verify-email?token=${verificationToken}`; 


    // Send verification email
    await sendVerificationEmail(email, name, verificationToken);
    
    return NextResponse.json(
      { 
        message: "User created successfully. Please check your email to verify your account.",
        userId: newUser.insertedId.toString() 
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);

    // Log registration error
    await logAuthEvent({
      request,
      event: AuthEventType.REGISTER_FAILURE,
      email: request.body ? (await request.json()).email : undefined,
      status: "failure",
      reason: "Server error",
      metadata: { error: error.message }
    });
    
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}