/** Move each display photo together with its original, preserving their association. */
export function reorderHeadshots(urls: string[], originals: string[], from: number, to: number) {
  const photos = urls.map((url, index) => ({ url, original: originals[index] || url }));
  if (from >= 0 && to >= 0 && from < photos.length && to < photos.length) {
    photos.splice(to, 0, photos.splice(from, 1)[0]);
  }
  return { headshotUrls: photos.map(photo => photo.url), headshotOriginalUrls: photos.map(photo => photo.original) };
}
