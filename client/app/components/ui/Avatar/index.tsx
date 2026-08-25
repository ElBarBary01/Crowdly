import React from "react";
import "./Avatar.css";

export type AvatarSize = "sm" | "md" | "lg";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  initials: string;
  size?: AvatarSize;
  gradient?: boolean;
}


export function Avatar({
  initials,
  size = "md",
  gradient = false,
  className,
  ...rest
}: AvatarProps) {
  const classNames = [
    "avatar",
    size,
    gradient ? "gradient" : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} {...rest}>
      {initials}
    </div>
  );
}

export interface AvatarGroupProps {
  members: string[];
  max?: number;
  size?: AvatarSize;
}


export function AvatarGroup({
  members,
  max = 4,
  size = "md",
}: AvatarGroupProps) {
  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;

  return (
    <div className="avatar-group">
      {visible.map((initials, i) => (
        <Avatar
          key={`${initials}-${i}`}
          initials={initials}
          size={size}
          className="avatar-stacked"
        />
      ))}
      {overflow > 0 && (
        <div className={`avatar ${size} avatar-stacked avatar-overflow`}>
          +{overflow}
        </div>
      )}
    </div>
  );
}

export default Avatar;
