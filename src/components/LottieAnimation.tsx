"use client";

import { useCallback, useRef, useState } from "react";
import { Lottie, type LottieHandle } from "lottie-react";

export function LottieAnimation({ src, className }: { src: string; className: string }) {
  const animationRef = useRef<LottieHandle>(null);
  const [hasError, setHasError] = useState(false);

  const playWhenReady = useCallback(() => {
    animationRef.current?.play();
  }, []);
  const handleError = useCallback(({ error }: { error: Error }) => {
    console.error("Unable to load Lottie animation:", error);
    setHasError(true);
  }, []);

  if (hasError) {
    return <span className={className} aria-hidden="true" />;
  }

  return (
    <Lottie
      src={src}
      loop
      autoplay={false}
      lottieRef={animationRef}
      subscriptions={{ ready: playWhenReady, error: handleError }}
      aria-hidden="true"
      className={className}
    />
  );
}
