"use client";

import { useArtists } from "../../../hooks/artists/use-artists";
import "./FeaturedArtists.css";

export default function FeaturedArtists() {
  const { data: artists, isLoading, isError } = useArtists();

  if (isLoading) {
    return null;
  }

  if (isError || !artists || artists.length === 0) {
    return null;
  }

  return (
    <section className="featured-artists">
      <div className="featured-artists-header">
        <h2>Featured Artists</h2>
      </div>

      <div className="featured-artists-grid">
        {artists.map((artist) => (
          <div className="artist-item" key={artist.id}>
            <img
              src={artist.images?.[0]}
              alt={artist.name}
              className="artist-image"
            />

            <h3>{artist.name}</h3>

            <p>{artist.genres?.[0] ?? "Artist"}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
