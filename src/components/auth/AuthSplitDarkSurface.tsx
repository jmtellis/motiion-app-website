import { MARKETING_DARK } from "@/lib/marketing/dark-theme";

/** Server-rendered dark canvas so auth-split routes never flash the paper body. */
export function AuthSplitDarkSurface() {
  return (
    <style>{`html,body{background-color:${MARKETING_DARK.bg}!important;}`}</style>
  );
}
