import 'next-auth';
import 'next-auth/jwt';
import { DefaultSession, DefaultUser } from "next-auth";

/**
 * This file extends the default types for NextAuth.js.
 * It's crucial for making TypeScript aware of the custom properties (`id`, `role`)
 * you are adding to the session and JWT.
 */

declare module 'next-auth' {
  /**
   * Extends the User model to include your custom 'role' property.
   */
  interface User extends DefaultUser {
    role: string;
    subscriptionTier: string;
    id: string;
    suspended?: boolean;
  }

  /**
   * Extends the Session model to include 'id' and 'role' on the user object.
   */
  interface Session {
    user: {
      id: string;
      role: string;
      subscriptionTier: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extends the JWT token to include 'id' and 'role'.
   */
  interface JWT {
    id: string;
    role: string;
    subscriptionTier: string;
    suspended?: boolean;
  }
}
