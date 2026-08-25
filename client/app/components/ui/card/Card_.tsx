import React from "react";
import "./Card.css";

export type CardType = "event" | "order" | "artist";

export interface CardProps {
    type?: CardType;
    children: React.ReactNode;
    className?: string;
}

export const Card: React.FC<CardProps> = ({ type, children, className = "" }) => {
    return (
        <div className={`card card-${type} ${className}`}>
        {children}
        </div>
    );
};