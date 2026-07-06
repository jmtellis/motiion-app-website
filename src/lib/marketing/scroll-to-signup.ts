export const HOME_SIGNUP_SECTION_ID = "signup";

export function scrollToSignupSection() {
  const spacer = document.querySelector(".marketing-footer-reveal__spacer");
  if (spacer instanceof HTMLElement) {
    spacer.scrollIntoView({ behavior: "smooth", block: "end" });
    return;
  }

  const target = document.getElementById(HOME_SIGNUP_SECTION_ID);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  window.location.hash = HOME_SIGNUP_SECTION_ID;
}
