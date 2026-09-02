import CredentialsProvider from "next-auth/providers/credentials";
import crypto from "crypto";
import { compare } from "bcrypt";
import clientPromise from "@/lib/db/mongodb";
import { NextAuthOptions } from "next-auth";
import type { User } from "next-auth";
import type { OAuthConfig } from "next-auth/providers/oauth";
import { Logger, LogContext } from "@/lib/logging/logger";
import dbConnect from "@/lib/db/dbConnect";
import { restoreUserAccount } from "@/lib/api/purgeUserAccount";
import { WITUS_OIDC_DISCOVERY_FALLBACK } from "@/lib/auth/witusEcosystem";
import {
  isLocalUserId,
  readRefusalReason,
  refusalUserId,
  resolveWitusUser,
  type WitusResolution,
} from "@/lib/auth/witusSso";

// --- WitUS ecosystem SSO ("Sign in with WitUS") ---
// Central Better-Auth/OIDC IdP at accounts.witus.online. Added as a standard
// OIDC provider ALONGSIDE the existing Credentials providers — public users can
// still sign in with email/password or email code. No admin gate here.
export const WITUS_PROVIDER_ID = "witus";

interface WitusProfile {
  sub: string;
  email?: string;
  name?: string;
  /**
   * The IdP's assertion that it has proved the person controls this address.
   * It advertises the claim in `claims_supported`, and it is the only thing
   * that makes attaching an SSO identity to an existing password account safe,
   * so a sign-in without it is refused rather than trusted.
   */
  email_verified?: boolean;
}

function witusProvider(): OAuthConfig<WitusProfile> {
  return {
    id: WITUS_PROVIDER_ID,
    name: "WitUS",
    type: "oauth",
    // Shared with the ecosystem-SSO helpers so the one external URL this app
    // asserts about accounts.witus.online is written down exactly once.
    wellKnown: process.env.WITUS_OIDC_DISCOVERY_URL ?? WITUS_OIDC_DISCOVERY_FALLBACK,
    clientId: process.env.WITUS_OIDC_CLIENT_ID,
    clientSecret: process.env.WITUS_OIDC_CLIENT_SECRET,
    // `email_verified` rides along inside the id token's standard OIDC claims,
    // so no extra scope is needed for it.
    authorization: { params: { scope: "openid email profile" } },
    idToken: true,
    checks: ["pkce", "state"],
    /**
     * next-auth 4.24 awaits this hook (`await provider.profile(...)` in
     * core/lib/oauth/callback.js), so the local lookup belongs here rather than
     * in the `signIn` callback: whatever comes back is what the JWT is built
     * from, which means `session.user.id` is a real MongoDB `_id` from the very
     * first token instead of the IdP's subject identifier.
     */
    async profile(profile): Promise<User> {
      let resolution: WitusResolution;
      try {
        const client = await clientPromise;
        resolution = await resolveWitusUser(client.db(), profile);
      } catch (error) {
        Logger.error(LogContext.AUTH, "WitUS sign-in could not resolve a local account.", { error });
        resolution = { ok: false, reason: "resolution_failed" };
      }

      if (!resolution.ok) {
        // Throwing here would be swallowed by next-auth's OAUTH_PARSE_PROFILE
        // catch and land the browser back on the sign-in page with nothing on
        // it. Returning the reason in `id` lets the `signIn` callback refuse
        // where a refusal is actually visible.
        return {
          id: refusalUserId(resolution.reason),
          email: profile.email ?? "",
          name: profile.name ?? "",
          image: null,
          role: "Student",
          subscriptionTier: "Free",
          emailVerified: false,
        };
      }

      return { ...resolution.user };
    },
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials) return null;
        
        const { email, password } = credentials;
        
        try {
          const client = await clientPromise;
          const db = client.db();
          const userDoc = await db.collection("users").findOne({ email });
          
          if (!userDoc) {
            Logger.warning(LogContext.AUTH, "Authorize failed: No user found.", { email });
            return null;
          }
          
          // A teacher-managed classroom account holds no password at all, so
          // bcrypt would throw on the undefined hash below and the catch would
          // return null. That is the right answer for the wrong reason: it is
          // an accident of the library, not a decision. Refuse first, and
          // return the same null every other failure here returns, so an
          // attacker cannot tell a managed account from a wrong password.
          if (userDoc.isManaged === true || !userDoc.password) {
            Logger.warning(LogContext.AUTH, "Authorize failed: Account has no password.", { email });
            return null;
          }

          const isPasswordValid = await compare(password, userDoc.password);
          
          if (!isPasswordValid) {
            Logger.warning(LogContext.AUTH, "Authorize failed: Invalid password.", { email });
            return null;
          }

          if (userDoc.suspended === true) {
            Logger.warning(LogContext.AUTH, "Authorize failed: User account is suspended.", { email });
            return null;
          }

          if (!userDoc.emailVerified) {
            Logger.warning(LogContext.AUTH, "Authorize failed: Email not verified.", { email });
            return null;
          }

          Logger.info(LogContext.AUTH, "User authorized successfully. Preparing data for JWT.", { email, role: userDoc.role });
          return {
            id: userDoc._id.toString(),
            name: userDoc.name,
            email: userDoc.email,
            role: userDoc.role,
            subscriptionTier: userDoc.subscriptionTier || 'Free',
            emailVerified: userDoc.emailVerified,
            image: userDoc.profilePicture || null,
          };
        } catch (error) {
          Logger.error(LogContext.AUTH, "Error during authorization.", { error });
          return null;
        }
      }
    }),
    CredentialsProvider({
      id: "email-code",
      name: "Email Code",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials) return null;

        const { email, code } = credentials;

        try {
          const client = await clientPromise;
          const db = client.db();
          const userDoc = await db.collection("users").findOne({ email });

          // Same refusal as the password path. A managed address sits in the
          // .invalid TLD so no code could ever have been delivered to it, and
          // a managed account never carries a loginCode, so both checks below
          // would already reject it. Neither is a rule anyone wrote down, and
          // relying on them means a future change to either one quietly opens
          // a sign-in path for these accounts.
          if (userDoc?.isManaged === true) {
            Logger.warning(LogContext.AUTH, "Email-code authorize failed: Account has no password.", { email });
            return null;
          }

          if (!userDoc || !userDoc.loginCode || !userDoc.loginCodeExpires) {
            Logger.warning(LogContext.AUTH, "Email-code authorize failed: No user or no pending code.", { email });
            return null;
          }

          if (userDoc.suspended === true) {
            Logger.warning(LogContext.AUTH, "Email-code authorize failed: User suspended.", { email });
            return null;
          }

          if (new Date() > new Date(userDoc.loginCodeExpires)) {
            Logger.warning(LogContext.AUTH, "Email-code authorize failed: Code expired.", { email });
            return null;
          }

          if ((userDoc.loginCodeAttempts || 0) >= 5) {
            Logger.warning(LogContext.AUTH, "Email-code authorize failed: Too many attempts.", { email });
            return null;
          }

          const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

          if (hashedCode !== userDoc.loginCode) {
            await db.collection("users").updateOne(
              { _id: userDoc._id },
              { $inc: { loginCodeAttempts: 1 } }
            );
            Logger.warning(LogContext.AUTH, "Email-code authorize failed: Invalid code.", { email });
            return null;
          }

          // Clear login code fields and mark email as verified (they proved ownership)
          await db.collection("users").updateOne(
            { _id: userDoc._id },
            {
              $unset: { loginCode: "", loginCodeExpires: "", loginCodeAttempts: "" },
              $set: { emailVerified: true },
            }
          );

          Logger.info(LogContext.AUTH, "User authorized via email code.", { email });
          return {
            id: userDoc._id.toString(),
            name: userDoc.name,
            email: userDoc.email,
            role: userDoc.role,
            subscriptionTier: userDoc.subscriptionTier || "Free",
            emailVerified: true,
            image: userDoc.profilePicture || null,
          };
        } catch (error) {
          Logger.error(LogContext.AUTH, "Error during email-code authorization.", { error });
          return null;
        }
      },
    }),
    ...(process.env.WITUS_OIDC_CLIENT_ID ? [witusProvider()] : []),
  ],
  callbacks: {
    // Signing in during the deletion grace period cancels the deletion. Getting
    // into the account is the same proof an emailed cancellation token would
    // give, so this is the entire undo path. It costs one indexed _id lookup
    // and returns immediately for any account that never asked to be deleted.
    async signIn({ user, account }) {
      if (account?.provider === WITUS_PROVIDER_ID) {
        const refusal = readRefusalReason(user.id);
        // The gate is the positive test, not the sentinel: a WitUS sign-in
        // proceeds only when `profile()` handed back a real MongoDB `_id`.
        // Anything else fails closed, so a sentinel can never become a session
        // even if a future reason string stops being recognised here.
        if (refusal || !isLocalUserId(user.id)) {
          // The reason stays in the server log. The browser gets one refusal
          // for all of them, because a per-reason message would tell anyone
          // holding an address whether it is suspended, managed, or unknown
          // here.
          Logger.warning(LogContext.AUTH, "WitUS sign-in refused.", {
            metadata: { reason: refusal ?? "unresolved_local_account" },
          });
          return false;
        }
      }

      try {
        await dbConnect();
        const { restored, restoredSetCount } = await restoreUserAccount(user.id);
        if (restored) {
          Logger.info(LogContext.AUTH, "Pending account deletion cancelled by sign-in.", {
            userId: user.id,
            metadata: { restoredSetCount },
          });
        }
      } catch (error) {
        // A failed restore must never lock anybody out. The stamps survive and
        // the next sign-in tries again.
        Logger.error(LogContext.AUTH, "Failed to cancel pending account deletion.", { error });
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        Logger.info(LogContext.AUTH, "JWT callback: Adding user data to token.", { userId: user.id, role: user.role });
        token.id = user.id;
        token.role = user.role;
        token.subscriptionTier = user.subscriptionTier || 'Free';
        token.suspended = user.suspended || false;
        token.emailVerified = !!user.emailVerified;
        token.image = user.image || undefined;
      }
      // Refresh subscriptionTier from DB on update trigger (e.g. after purchase)
      if (trigger === 'update') {
        try {
          const client = await clientPromise;
          const db = client.db();
          const { ObjectId } = await import('mongodb');
          const userDoc = await db.collection('users').findOne({ _id: new ObjectId(token.id) });
          if (userDoc) {
            token.subscriptionTier = userDoc.subscriptionTier || 'Free';
            token.name = userDoc.name;
            token.suspended = userDoc.suspended || false;
            token.emailVerified = userDoc.emailVerified || false;
            token.image = userDoc.profilePicture || null;
          }
        } catch (error) {
          Logger.error(LogContext.AUTH, "Failed to refresh subscriptionTier in JWT.", { error });
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.subscriptionTier = token.subscriptionTier || 'Free';
        session.user.emailVerified = token.emailVerified || false;
        session.user.image = token.image || null;
      }
      return session;
    }
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
