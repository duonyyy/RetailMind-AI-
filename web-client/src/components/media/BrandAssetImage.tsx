"use client";

import React, { useState } from "react";
import Image from "next/image";

interface BrandAssetImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  unoptimized?: boolean;
  glow?: boolean;
  float?: boolean;
}

export function BrandAssetImage({
  src,
  alt,
  width = 64,
  height = 64,
  className = "",
  priority = false,
  unoptimized = false,
  glow = false,
  float = false,
}: BrandAssetImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${
        float ? "animate-float" : ""
      } ${className}`.trim()}
    >
      {glow && (
        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl -z-10 pointer-events-none scale-125" />
      )}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        unoptimized={unoptimized}
        onLoad={() => setIsLoaded(true)}
        className={`object-contain transition-opacity duration-300 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
