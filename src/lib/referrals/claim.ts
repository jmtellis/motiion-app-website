export function referralClaimMessage(code: unknown) {
  if (code === "account_too_old") return "Referral codes can be confirmed within 48 hours of creating your account.";
  if (code === "self_referral") return "Use the code of the person who invited you, rather than your own code.";
  if (code === "referrer_not_found" || code === "invalid_code") return "We couldn’t find that referral code. Check your friend’s username and try again.";
  if (code === "not_authenticated") return "Sign in to confirm your referral.";
  return "Couldn’t confirm this referral. Please try again.";
}
