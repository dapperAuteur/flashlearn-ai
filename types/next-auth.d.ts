import "next-auth";
import "next-auth/jwt";
import { DefaultSession } from "next-auth";

// By declaring the module, you are "opening it up" to add your own properties.
// This is called module augmentation.

declare module "next-auth" {
  /**
   * This adds the 'role' property to the User object.
   * It MERGES with the original User type from next-auth, not replaces it.
   */
  interface User {
    role?: string;
  }

  /**
   * This adds 'id' and 'role' to the session's user object.
   */
  interface Session {
    user: {
      id: string;
      role?: string;
    } & DefaultSession["user"]; // This keeps the default properties like name, email, image
  }
}

declare module "next-auth/jwt" {
  /**
   * This adds 'id' and 'role' to the JWT token.
   */
  interface JWT {
    id: string;
    role?: string;
  }
}
