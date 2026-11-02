/** Update only the current casting drill-in; retain its parent tab and other context. */
export function castingDetailLocation(current: string, roleId: string, view: "project" | "role") {
  const url = new URL(current, "https://motiion.invalid");
  url.searchParams.set("casting", roleId);
  url.searchParams.set("view", view);
  return `${url.pathname}${url.search}${url.hash}`;
}
