import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "onError"> & {
  src: string;
  fallbackSrc: string;
  /** Friendly toast message shown the first time the image fails. */
  fallbackToast?: string;
};

/**
 * <img> wrapper that gracefully falls back to a default illustration when the
 * primary src fails to load (e.g. corrupted upload or removed DataURL).
 * Shows a friendly toast once per src so the layout never breaks.
 *
 * Behaves exactly like <img> — accepts the same className/style — so it can
 * drop into existing layouts without wrapping in extra elements.
 */
export function SafeImage({ src, fallbackSrc, fallbackToast = "Não foi possível carregar a imagem — usando a padrão.", ...rest }: Props) {
  const [errored, setErrored] = useState(false);
  const notified = useRef<string | null>(null);
  useEffect(() => {
    setErrored(false);
    notified.current = null;
  }, [src]);
  return (
    <img
      {...rest}
      src={errored ? fallbackSrc : src}
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
