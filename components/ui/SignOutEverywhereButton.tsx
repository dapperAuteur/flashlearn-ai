'use client';

import { useId, useState } from 'react';
import {
  SIGN_OUT_EVERYWHERE_HELP,
  SIGN_OUT_EVERYWHERE_LABEL,
  useWitusSignOut,
} from '@/components/providers/WitusEcosystemProvider';

/**
 * "Sign out of WitUS everywhere" (BAM, 2026-10-29, witus task 128 option (b)).
 *
 * A secondary control that sits next to plain "Sign out", never instead of it.
 * It renders only when the server resolved a WitUS end-session URL (this app is
 * a configured ecosystem OIDC client). Clicking it ends FlashLearnAI's session
 * first, then hands the browser to the IdP's endsession endpoint. The help text
 * is visible and linked with aria-describedby.
 */
export default function SignOutEverywhereButton({
  className,
  helpClassName,
  role,
}: {
  className?: string;
  helpClassName?: string;
  /** Pass "menuitem" when rendered inside a role="menu". */
  role?: string;
}) {
  const { signOutEverywhere, canSignOutEverywhere } = useWitusSignOut();
  const [pending, setPending] = useState(false);
  const helpId = useId();

  if (!canSignOutEverywhere) return null;

  return (
    <>
      <button
        type="button"
        role={role}
        className={className}
        aria-describedby={helpId}
        disabled={pending}
        onClick={() => {
          setPending(true);
          void signOutEverywhere();
        }}
      >
        {SIGN_OUT_EVERYWHERE_LABEL}
      </button>
      <p id={helpId} className={helpClassName}>
        {SIGN_OUT_EVERYWHERE_HELP}
      </p>
    </>
  );
}
