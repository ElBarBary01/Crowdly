"use client";

import "./styles.css";
import { useState } from "react";

export default function TestPage() {
  const [clicks, setClicks] = useState(0);

  return (
    <main className="container">
      <h1>Click Counter</h1>
      <p>Clicks: {clicks}</p>
      <button type="button" onClick={() => setClicks((count) => count + 1)}>
        Click me
      </button>
    </main>
  );
}
