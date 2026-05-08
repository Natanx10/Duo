
/**
 * Sticker Cache Utility
 * Saves sticker DataURLs to localStorage to reduce network usage.
 */

const CACHE_PREFIX = "duo-sticker-";
const MAX_CACHE_ITEMS = 20;

export async function getCachedSticker(url: string): Promise<string> {
  const cacheKey = CACHE_PREFIX + btoa(url).substring(0, 32);
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    console.log("[StickerCache] Hit:", url);
    return cached;
  }

  console.log("[StickerCache] Miss:", url);
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        try {
          // Manage cache size
          const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
          if (keys.length >= MAX_CACHE_ITEMS) {
            localStorage.removeItem(keys[0]); // Simple FIFO
          }
          localStorage.setItem(cacheKey, dataUrl);
        } catch (e) {
          console.warn("[StickerCache] Failed to save to localStorage (quota exceeded?)");
        }
        resolve(dataUrl);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("[StickerCache] Error fetching sticker:", error);
    return url; // Fallback to original URL
  }
}

export function clearStickerCache() {
  Object.keys(localStorage)
    .filter(k => k.startsWith(CACHE_PREFIX))
    .forEach(k => localStorage.removeItem(k));
}
