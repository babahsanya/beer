"use client";

import { Star } from "lucide-react";

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: number;
  showValue?: boolean;
}

export function RatingStars({
  rating,
  maxRating = 5,
  size = 16,
  showValue = true,
}: RatingStarsProps) {
  const stars: React.ReactNode[] = [];
  for (let i = 1; i <= maxRating; i++) {
    if (i <= Math.floor(rating)) {
      stars.push(
        <span key={i} className="inline-block" style={{ filter: `drop-shadow(0 0 2px rgba(245, 158, 11, 0.3))` }}>
          <Star
            size={size}
            className="fill-amber-400 text-amber-400"
          />
        </span>
      );
    } else if (i - 0.5 <= rating) {
      stars.push(
        <div key={i} className="relative inline-block" style={{ width: size, height: size }}>
          <Star
            size={size}
            className="absolute inset-0 text-muted-foreground/25"
          />
          <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
            <Star
              size={size}
              className="fill-amber-400 text-amber-400"
            />
          </div>
        </div>
      );
    } else {
      stars.push(
        <Star
          key={i}
          size={size}
          className="text-muted-foreground/20"
        />
      );
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      <div className="flex items-center">{stars}</div>
      {showValue && (
        <span
          className="text-sm font-bold ml-0.5"
          style={{
            background: "linear-gradient(135deg, #D97706, #F59E0B)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}