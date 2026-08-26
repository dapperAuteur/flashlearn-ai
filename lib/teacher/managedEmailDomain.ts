/**
 * The synthetic address a teacher-managed student account carries, and the test
 * for one.
 *
 * Split out of `lib/teacher/managedStudents.ts` so a browser component can ask
 * the question. That module reaches for `crypto` and the Mongoose models, which
 * a client bundle must not pull in, and the alternative was a second copy of
 * the domain string sitting in a page waiting to fall out of step with this one.
 *
 * See `managedStudents.ts` for why a managed account needs an address at all.
 */

/**
 * RFC 2606 reserves `.invalid` so that it can never be delegated and never
 * resolve. A managed address cannot receive mail by construction rather than by
 * a delivery attempt failing.
 */
export const MANAGED_EMAIL_DOMAIN = 'students.invalid';

export function isManagedEmail(email: string | null | undefined): boolean {
  return typeof email === 'string' && email.toLowerCase().endsWith(`@${MANAGED_EMAIL_DOMAIN}`);
}
