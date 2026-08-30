// components/home/FeaturedArtists/FeaturedArtists.tsx
"use client";

import ArtistCard from "../../ui/card/ArtistCard";
import { FeaturedArtist } from "../../../types/home";
import styles from "./FeaturedArtists.module.css";

interface FeaturedArtistsProps {
  artists: FeaturedArtist[];
  loading?: boolean;
  viewAllHref?: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

export default function FeaturedArtists({
  artists,
  loading,
  viewAllHref = "/artists",
}: FeaturedArtistsProps) {
  return (
    <section className={styles.container}>
      <div className={styles.heading}>
        <h2>Featured Artists</h2>
        {viewAllHref && <a href={viewAllHref}>All artists &gt;</a>}
      </div>

      <div className={styles.grid}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.skeletonCard} />
            ))
          : artists.map((artist) => (
              <ArtistCard
                key={artist.id}
                initials={getInitials(artist.name)}
                title={artist.name}
                subtext={artist.genreLabel || "Artist"}
              />
            ))}
      </div>
    </section>
  );
}
