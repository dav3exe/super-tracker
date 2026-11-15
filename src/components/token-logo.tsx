"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

type TokenLogoProps = {
  src?: string;
  symbol: string;
  size?: number;
  className?: string;
};

/**
 * Token logos come from arbitrary hosts, so they bypass the image optimizer.
 * Falls back to the symbol's first letter when the image is missing or broken.
 */
export function TokenLogo({ src, symbol, size = 40, className }: TokenLogoProps) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };

  if (!src || failed) {
    return (
      <span
        aria-hidden
        style={style}
        className={cn(
          "grid shrink-0 place-items-center rounded-full bg-white/10 text-xs font-semibold text-muted-foreground",
          className
        )}
      >
        {symbol.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      unoptimized
      onError={() => setFailed(true)}
      style={style}
      className={cn("shrink-0 rounded-full bg-white/5 object-cover", className)}
    />
  );
}
