import React from "react";
import LinkButton from "../../ui/LinkButton/LinkButton";
import { useEvents } from "../../../hooks/events/use-events";
import "./BrwoseByGenre.css";

const GENRES = [
  { id: "rock", emoji: "🎸", title: "Rock" },
  { id: "pop", emoji: "🎤", title: "Pop" },
  { id: "edm", emoji: "🎛️", title: "EDM" },
  { id: "hip_hop", emoji: "🎵", title: "Hip-Hop" },
  { id: "rnb", emoji: "🎶", title: "R&B" },
  { id: "jazz", emoji: "🎷", title: "Jazz" },
  { id: "country", emoji: "🤠", title: "Country" },
  { id: "classical", emoji: "🎻", title: "Classical" },
];

function GenreCard({
  id,
  emoji,
  title,
}: {
  id: string;
  emoji: string;
  title: string;
}) {
  const { data, isLoading } = useEvents({
    sort: "",
    order: "",
    genre: id,
    page: 1,
  });

  return (
    <LinkButton href={`/events?genre=${id}`} className="card">
      <span className="emoji">{emoji}</span>
      <span className="title">{title}</span>
      <span className="subtitle">
        {isLoading ? "Loading..." : `${data?.total ?? 0} shows`}
      </span>
    </LinkButton>
  );
}

export default function BrowseByGenre() {
  return (
    <section className="container">
      <h2 className="heading">Browse by Genre</h2>

      <div className="grid">
        {GENRES.map((genre) => (
          <GenreCard
            key={genre.id}
            id={genre.id}
            emoji={genre.emoji}
            title={genre.title}
          />
        ))}
      </div>
    </section>
  );
}
