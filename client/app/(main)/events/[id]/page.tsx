"use client";

import { useParams } from "next/navigation";

export default function EventPage() {
  const params = useParams();

  return (
    <div>
      <h1>Event Page</h1>
      <p>ID: {params.id as string}</p>
    </div>
  );
}
