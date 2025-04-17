// app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcrypt";
import clientPromise from "@/lib/db/mongodb";
import { z } from "zod";

// Validation schema for user registration
const userSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" })
});

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    console.log("Registration attempt:", body.email);
    
    // Validate input
    const result = userSchema.safeParse(body);
    if (!result.success) {
      console.log("Validation error:", result.error.errors);
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
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }
    
    // Hash the password
    const hashedPassword = await hash(password, 12);
    
    // Create the user
    const newUser = await db.collection("users").insertOne({
      name,
      email,
      password: hashedPassword,
      role: "free", // Default role
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log("User created successfully:", newUser.insertedId.toString());
    
    return NextResponse.json(
      { 
        message: "User created successfully",
        userId: newUser.insertedId.toString()
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}