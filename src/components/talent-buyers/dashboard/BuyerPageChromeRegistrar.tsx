"use client";

import {
  useRegisterBuyerChrome,
  type BuyerPageChromeConfig,
} from "./BuyerPageChromeContext";

export function BuyerPageChromeRegistrar(config: BuyerPageChromeConfig) {
  useRegisterBuyerChrome(config);
  return null;
}
