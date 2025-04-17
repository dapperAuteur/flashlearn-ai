// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import clientPromise from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";
import { getClientIp } from "@/lib/utils";
import { rateLimitRequest } from "@/lib/ratelimit/ratelimit";
import { logAuthEvent, checkSuspiciousActivity } from "@/lib/logging/authLogger";
import { AuthEventType } from "@/models/AuthLog";
import { processSuspiciousActivity } from "@/lib/security/alertService";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials) return null;
        
        const { email, password } = credentials;
        
        try {
          console.log("Authenticating user:", email);

          // Convert req to NextRequest for our utility functions
          const request = req as unknown as NextRequest;

          // Check for suspicious activity
          const ipAddress = getClientIp(request);
          const suspiciousCheck = await checkSuspiciousActivity(email, ipAddress);
          
          if (suspiciousCheck.suspicious) {
            console.log("Suspicious login attempt detected:", suspiciousCheck.reason);
            
            // Log the suspicious activity
            await logAuthEvent({
              request,
              event: AuthEventType.SUSPICIOUS_ACTIVITY,
              email,
              status: "failure",
              reason: suspiciousCheck.reason
            });

            // We can still allow the login, but with additional monitoring
            // Alternatively, we could block it or require additional verification
          }

          const client = await clientPromise;
          const db = client.db();
          const user = await db.collection("users").findOne({ email });
          
          if (!user) {
            console.log("No user found with email:", email);

            // Log failed login
            await logAuthEvent({
              request,
              event: AuthEventType.LOGIN_FAILURE,
              email,
              status: "failure",
              reason: "User not found"
            });
            return null;
          }
          
          const isPasswordValid = await compare(password, user.password);
          
          if (!isPasswordValid) {
            console.log("Invalid password for user:", email);

            // Log failed login
            await logAuthEvent({
              request,
              event: AuthEventType.LOGIN_FAILURE,
              userId: user._id.toString(),
              email,
              status: "failure",
              reason: "Invalid password"
            });
            
            return null;
          }

          // Check if email is verified
          if (!user.emailVerified) {
            console.log("Email not verified for user:", email);

            // Log failed login
            await logAuthEvent({
              request,
              event: AuthEventType.LOGIN_FAILURE,
              userId: user._id.toString(),
              email,
              status: "failure",
              reason: "Email not verified"
            });
            
            throw new Error("email_not_verified");
          }
          
          console.log("User authenticated successfully:", email);

          // Log successful login
          await logAuthEvent({
            request,
            event: AuthEventType.LOGIN,
            userId: user._id.toString(),
            email,
            status: "success",
            metadata: {
              role: user.role,
              lastLogin: new Date()
            }
          });
          
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role
          };
        } catch (error) {
          console.error("Authentication error:", error);
          throw new Error(`Authentication failed: ${error.message}`);
        }
      }
    }),
    // Add an event handler for signOut
    events: {
      async signOut({ token, session }) {
        // Since we don't have the request object here, we'll create a minimal one
        const mockRequest = {
          headers: new Headers(),
          nextUrl: new URL("http://localhost:3000"),
        } as unknown as NextRequest;
        
        if (token?.sub) {
          await logAuthEvent({
            request: mockRequest,
            event: AuthEventType.LOGOUT,
            userId: token.sub,
            email: token.email as string,
            status: "success"
          });
        }
      }
    }
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
    },
    async signIn({ user, account, profile, email, credentials, request }) {
      // Skip rate limiting for non-credentials providers
      if (account?.provider !== "credentials") {
        return true;
      }

      // If request is available, apply rate limiting
      if (request) {
        const req = request as unknown as NextRequest;
        const ip = getClientIp(req);
        
        // Allow 5 login attempts per 5 minutes
        const rateLimitResult = await rateLimitRequest(ip, "login", 5, 300);
        
        if (!rateLimitResult.success) {
          console.log(`Rate limit exceeded for IP ${ip} on login endpoint`);
          throw new Error(`Too many login attempts. Please try again after ${rateLimitResult.reset} seconds.`);
        }
      }
      
      return true;
    },
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
});

export { handler as GET, handler as POST };