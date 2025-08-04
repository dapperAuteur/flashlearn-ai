import 'next-auth';
import 'next-auth/jwt';
import { DefaultSession } from "next-auth";

/**
 * This file extends the default types for NextAuth.js.
 * It's crucial for making TypeScript aware of the custom properties (`id`, `role`)
 * you are adding to the session and JWT.
 */

declare module 'next-auth' {
  /**
   * Extends the User model to include your custom 'role' property.
   */
  interface User {
    // FIX: Made 'role' a required string, as every user in your system has a role.
    role: string;
  }

  /**
   * Extends the Session model to include 'id' and 'role' on the user object.
   */
  interface Session {
    user: {
      id: string;
      // FIX: Made 'role' a required string.
      role: string;
    } & DefaultSession['user']; // This keeps the default properties like name, email, image
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extends the JWT token to include 'id' and 'role'.
   */
  interface JWT {
    id: string;
    // FIX: Made 'role' a required string.
    role: string;
  }
}
