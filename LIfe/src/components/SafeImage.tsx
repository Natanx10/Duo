import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getCachedSticker } from "@/lib/sticker-cache";

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "onError"> & {
  src: string;
  fallbackSrc: string;
  /** Friendly toast message shown the first time the image fails. */
  fallbackToast?: string;
  /** Whether to use the local cache for this image (recommended for stickers/profile). */
  useCache?: boolean;
};

/**
 * <img> wrapper that gracefully falls back to a default illustration.
 * Now supports local caching to save data and speed up subsequent loads.
 */
export function SafeImage({ 
  src, 
  fallbackSrc, 
  fallbackToast = "Não foi possível carregar a imagem — usando a padrão.", 
  useCache = false,
  ...rest 
}: Props) {
  const [errored, setErrored] = useState(false);
  const [displaySrc, setDisplaySrc] = useState<string>(src);
  const notified = useRef<string | null>(null);

  useEffect(() => {
    setErrored(false);
    notified.current = null;
    
    if (useCache && src && !src.startsWith("data:")) {
      getCachedSticker(src).then(setDisplaySrc).catch(() => setDisplaySrc(src));
    } else {
      setDisplaySrc(src);
    }
  }, [src, useCache]);

  return (
    <img
      {...rest}
      src={errored ? fallbackSrc : displaySrc}
      onError={() => {
        if (errored) return;
        setErrored(true);
        if (notified.current !== src) {
          notified.current = src;
          toast.warning(fallbackToast);
        }
      }}
    />
  );
}
