// types/next-auth.usage.test.ts

/**
 * @fileoverview
 * This file serves as a compile-time test for the augmented NextAuth types
 * defined in `next-auth.d.ts`. It does not contain runtime tests but verifies
 * that TypeScript correctly recognizes the added `id` and `role` properties
 * on the Session and User types.
 *
 * If this file compiles without errors (`tsc --noEmit`), the type declarations
 * are considered valid and correctly applied.
 */

import { Session, User } from 'next-auth'; // Import the base types from next-auth
import { DefaultSession } from 'next-auth';

// --- Test User Type Augmentation ---

// Mock user data conforming to the augmented User interface
const mockAugmentedUser: User = {
  // Properties from the augmented User interface in next-auth.d.ts
  id: 'user_abc123',
  role: 'admin',

  // Properties potentially from the original User type or adapter
  // (These might vary based on your adapter/provider, but often include these)
  name: 'Test Admin User',
  email: 'admin@example.com',
  image: null,
};

// Verify we can access the augmented properties without TS errors
const userId: string = mockAugmentedUser.id;
const userRole: string = mockAugmentedUser.role;

// Verify we can still access potentially existing default properties
const userName: string | null | undefined = mockAugmentedUser.name;
const userEmail: string | null | undefined = mockAugmentedUser.email;

console.log('User type checks passed:', { userId, userRole, userName, userEmail });


// --- Test Session Type Augmentation ---

// Mock session data conforming to the augmented Session interface
const mockAugmentedSession: Session = {
  user: {
    // Properties from the augmented Session['user'] in next-auth.d.ts
    id: 'session_user_xyz789',
    role: 'paid',

    // Properties from DefaultSession['user']
    name: 'Test Paid User',
    email: 'paid@example.com',
    image: 'https://example.com/avatar.png',
  },
  // Standard Session property
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Example expiry
};

// Verify we can access the augmented properties within the session user
const sessionUserId: string = mockAugmentedSession.user.id;
const sessionUserRole: string = mockAugmentedSession.user.role;

// Verify we can access the default properties within the session user
const sessionUserName: string | null | undefined = mockAugmentedSession.user.name;
const sessionUserEmail: string | null | undefined = mockAugmentedSession.user.email;
const sessionUserImage: string | null | undefined = mockAugmentedSession.user.image;

// Verify we can access standard session properties
const sessionExpires: string = mockAugmentedSession.expires;

console.log('Session type checks passed:', {
  sessionUserId,
  sessionUserRole,
  sessionUserName,
  sessionUserEmail,
  sessionUserImage,
  sessionExpires,
});


// --- Type Compatibility Check ---

// Function expecting the augmented Session type
function processSession(session: Session): void {
  console.log(`Processing session for user ID: ${session.user.id}, Role: ${session.user.role}`);
}

// Call the function with the mock augmented session - should compile fine
processSession(mockAugmentedSession);


// Function expecting the augmented User type
function processUser(user: User): void {
    console.log(`Processing user ID: ${user.id}, Role: ${user.role}`);
}

// Call the function with the mock augmented user - should compile fine
processUser(mockAugmentedUser);


console.log("Compile-time type checks for 'next-auth.d.ts' completed successfully if no TypeScript errors were reported.");

// You can optionally export something to make TypeScript treat it as a module
export const testMarker = true;
