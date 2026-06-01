import { cookies } from "next/headers";
import {
  HOME_AB_COOKIE,
  HOME_AB_TEST_NAME,
  isHomeAbTestEnabled,
  normalizeHomeVariant,
  type HomeVariant,
} from "@/lib/analytics/ab-test";
import HomeAbTracker from "@/components/home/HomeAbTracker";
import HomeControl from "@/components/home/HomeControl";
import HomeVariantA from "@/components/home/HomeVariantA";
import HomeVariantB from "@/components/home/HomeVariantB";
import HomeVariantC from "@/components/home/HomeVariantC";

/**
 * Homepage entry point and A/B variant selector.
 *
 * Default OFF: when HOMEPAGE_AB_TEST_ENABLED is not "true" every visitor gets
 * the control (the current production homepage) and nothing is tracked, so
 * enabling/disabling the test never ships a different page by accident.
 *
 * When ON: the variant is read from the cookie that middleware pinned for this
 * visitor, so the server renders the assigned design with no client-side flash.
 */
function renderVariant(variant: HomeVariant) {
  switch (variant) {
    case "a":
      return <HomeVariantA />;
    case "b":
      return <HomeVariantB />;
    case "c":
      return <HomeVariantC />;
    default:
      return <HomeControl />;
  }
}

export default async function Home() {
  if (!isHomeAbTestEnabled()) {
    return <HomeControl />;
  }

  const cookieStore = await cookies();
  const variant = normalizeHomeVariant(cookieStore.get(HOME_AB_COOKIE)?.value);

  return (
    <>
      <HomeAbTracker variant={variant} test={HOME_AB_TEST_NAME} />
      {renderVariant(variant)}
    </>
  );
}
