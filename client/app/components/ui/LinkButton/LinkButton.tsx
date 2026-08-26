import Link from "next/link";
import React from "react";
import "./LinkButton.css";

interface LinkButtonProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export default function LinkButton({
  href,
  children,
  className = "",
}: LinkButtonProps) {
  return (
    <Link href={href} className={`linkButton ${className}`}>
      {children}
    </Link>
  );
}
