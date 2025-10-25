"use client";

import Image from "next/image";
import { useState, useRef } from "react";

const ImageHover = ({ src, hoverSrc, alt }: { src: string; hoverSrc: string; alt: string }) => {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null); // ✅ giữ tham chiếu ổn định

  const handleMouseEnter = () => {
    // tránh set lại nhiều lần khi hover nhanh
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => setIsHovered(true), 1000); // 1s delay
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setIsHovered(false);
  };

  return (
    <div className="relative h-52" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <Image src={src} alt={alt} fill sizes="80vw" className={`object-contain transition-opacity duration-500 ${isHovered ? "opacity-0" : "opacity-100"}`} />
      <Image src={hoverSrc} alt={alt} fill sizes="80vw" className={`absolute inset-0 object-contain transition-opacity duration-500 ${isHovered ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
};

export default ImageHover;
