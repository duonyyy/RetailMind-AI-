import Image from "next/image";
import Link from "next/link";

export interface BrandLogoProps {
  theme?: "light" | "dark";
  withTagline?: boolean;
  compact?: boolean;
  href?: string;
  className?: string;
  priority?: boolean;
}

export function BrandLogo({
  theme = "light",
  withTagline = false,
  compact = false,
  href = "/",
  className = "",
  priority = false,
}: BrandLogoProps) {
  if (compact) {
    const markContent = (
      <Image
        src="/brand/logo-mark.png"
        alt="ThiSmart Logo Mark"
        width={40}
        height={40}
        priority={priority}
        className={`h-9 w-9 object-contain ${className}`}
      />
    );

    return href ? (
      <Link href={href} aria-label="ThiSmart Trang chủ" className="inline-flex items-center">
        {markContent}
      </Link>
    ) : (
      markContent
    );
  }

  let src = "/brand/logo-horizontal-light.png";
  let width = 1406;
  let height = 451;

  if (withTagline) {
    if (theme === "dark") {
      src = "/brand/logo-horizontal-tagline-dark.png";
      width = 1442;
      height = 469;
    } else {
      src = "/brand/logo-horizontal-tagline-light.png";
      width = 1448;
      height = 481;
    }
  }

  const logoImg = (
    <Image
      src={src}
      alt="ThiSmart — Thi thông minh. Đánh giá chính xác."
      width={width}
      height={height}
      priority={priority}
      className={`h-9 w-auto max-h-10 object-contain ${className}`}
    />
  );

  return href ? (
    <Link href={href} aria-label="ThiSmart Trang chủ" className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md">
      {logoImg}
    </Link>
  ) : (
    logoImg
  );
}
