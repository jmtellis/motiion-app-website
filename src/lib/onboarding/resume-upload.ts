export const MAX_RESUME_BYTES = 20 * 1024 * 1024;
export const MAX_RESUME_PAGE_BYTES = 1024 * 1024;
export const MAX_RESUME_PAGES = 3;

const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const ownedPath = new RegExp(`^(${uuid})/resume_${uuid}\\.(pdf|jpg)$`);

/** Only our authenticated user's direct-storage source can be processed. */
export function isOwnedResumePath(path: unknown, userId: string): path is string {
  return typeof path === "string" && ownedPath.exec(path)?.[1] === userId.toLowerCase();
}

export function resumeSourceError(size: number | undefined, contentType: string | undefined): string | null {
  if (!size || size > MAX_RESUME_BYTES) return "Choose a resume under 20 MB.";
  if (!["application/pdf", "image/jpeg"].includes(contentType ?? "")) return "Choose a PDF or JPEG resume.";
  return null;
}

export function resumePagesError(pages: readonly { size: number; type: string }[]): string | null {
  if (!pages.length || pages.length > MAX_RESUME_PAGES || pages.some(page => page.size <= 0 || page.size > MAX_RESUME_PAGE_BYTES || page.type !== "image/jpeg")) {
    return "Use up to three readable resume pages. Please choose the file again.";
  }
  return null;
}
