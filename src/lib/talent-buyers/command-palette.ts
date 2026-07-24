export const BUYER_OPEN_COMMAND_PALETTE_EVENT = "buyer:open-command-palette";

export function openBuyerCommandPalette() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BUYER_OPEN_COMMAND_PALETTE_EVENT));
}
