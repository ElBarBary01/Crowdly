import React from "react";
import LinkButton from "../../ui/LinkButton/LinkButton";
import "./BrwoseByGenre.css";

const GENRES = [
  { id: "rock", emoji: "🎸", title: "Rock", shows: 142 },
  { id: "pop", emoji: "🎤", title: "Pop", shows: 287 },
  { id: "edm", emoji: "🎛️", title: "EDM", shows: 198 },
  { id: "hip-hop", emoji: "🎵", title: "Hip-Hop", shows: 176 },
  { id: "rb", emoji: "🎶", title: "R&B", shows: 93 },
  { id: "jazz", emoji: "🎷", title: "Jazz", shows: 67 },
  { id: "country", emoji: "🤠", title: "Country", shows: 84 },
  { id: "classical", emoji: "🎻", title: "Classical", shows: 45 },
];

export default function BrowseByGenre() {
  return (
    <section className= "container" >
      <h2 className= "heading">Browse by Genre</h2>
      
      <div className= "grid">
        {GENRES.map((genre) => (
          <LinkButton 
            key={genre.id} 
            href={`/events?genre=${genre.id}`} 
            className= "card"
          >
            <span className= "emoji">{genre.emoji}</span>
            <span className= "title">{genre.title}</span>
            <span className= "subtitle" >{genre.shows} shows</span>
          </LinkButton>
        ))}
      </div>
    </section>
  );
}