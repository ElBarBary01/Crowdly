"use client";

// import { Card, CardContent } from "../../components/ui/card/card";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./events.module.css";
import Pagination from "../../components/ui/navigationComponent/pagination";

type Event = {
  id: string;
  title: string;
  date: string;
  time: string;
  genres: string[];
  images: string[];
  venue: {
    name: string;
  };
  tickets: {
    price: number;
  }[];
};

const EventsPage = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pageSize = 6;
  const sort = searchParams.get("sort") || "";
  const order = searchParams.get("order") || "asc";
  const genre = searchParams.get("genre") || "";
  const page = Number(searchParams.get("page")) || 1;
  const [totalPages, setTotalPages] = useState(1);

  const sortValue = sort ? `${sort}-${order}` : "relevance";

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const params = new URLSearchParams();

        if (sort) {
          params.append("sort", sort);
          params.append("order", order);
        }

        if (genre) {
          params.append("genre", genre);
        }

        params.append("page", page.toString());
        const queryString = params.toString();
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/event${
            queryString ? `?${queryString}` : ""
          }`,
          {
            credentials: "include",
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch events: ${response.status}`);
        }

        const result = await response.json();

        setEvents(result.data);
        setTotalPages(result.totalPages);

        // Log the actual filter/sort being used
        console.log("================================");
        console.log("EVENT FILTER / SORT");
        console.log("Sort:", sort || "relevance");
        console.log("Order:", order);
        console.log("Genre:", genre || "all");
        console.log(
          "API URL:",
          `${process.env.NEXT_PUBLIC_API_URL}/event${queryString ? `?${queryString}` : ""}`,
        );

        // Log the events returned by the backend
        console.log("Events returned:", result.data);
        console.log("Number of events:", result.data.length);
        console.log("================================");
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    fetchEvents();
  }, [sort, order, genre, page]);

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    switch (value) {
      case "relevance":
        params.delete("sort");
        params.delete("order");
        break;

      case "date-asc":
        params.set("sort", "date");
        params.set("order", "asc");
        break;

      case "date-desc":
        params.set("sort", "date");
        params.set("order", "desc");
        break;

      case "title-asc":
        params.set("sort", "title");
        params.set("order", "asc");
        break;

      case "title-desc":
        params.set("sort", "title");
        params.set("order", "desc");
        break;
    }

    router.push(`?${params.toString()}`);
  };
  const handleGenreChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set("genre", value);
    } else {
      params.delete("genre");
    }

    router.push(`?${params.toString()}`);
  };
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set("page", newPage.toString());

    router.push(`?${params.toString()}`);
  };

  const getImageUrl = (image?: string) => {
    if (!image) return "";
    const markdownMatch = image.match(/\]\((.*?)\)/);
    if (markdownMatch) {
      return markdownMatch[1];
    }
    return image;
  };

  const formatDate = (date: string) => {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return "Date unavailable";
    }
    return parsedDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className={styles.page}>
      {/* Heading */}
      <div className={styles.heading}>
        <h1>All Events</h1>
        <p>{events.length} events found</p>
      </div>
      {/* Controls */}
      <div className={styles.controls}>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={styles.filterButton}
        >
          Filters
        </button>

        <select
          value={sortValue}
          onChange={(e) => handleSortChange(e.target.value)}
          className={styles.sortSelect}
        >
          <option value="relevance">Sort: Relevance</option>
          <option value="date-desc">Date: Soonest</option>
          <option value="date-asc">Date: Latest</option>
          <option value="title-asc">Title: A-Z</option>
          <option value="title-desc">Title: Z-A</option>
        </select>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label htmlFor="genre" className={styles.filterLabel}>
              Genre
            </label>
            <select
              id="genre"
              value={genre}
              onChange={(e) => handleGenreChange(e.target.value)}
              className={styles.genreSelect}
            >
              <option value="">All Genres</option>
              <option value="ROCK">Rock</option>
              <option value="POP">Pop</option>
              <option value="EDM">EDM</option>
              <option value="HIP_HOP">Hip Hop</option>
              <option value="RNB">R&B</option>
              <option value="JAZZ">Jazz</option>
              <option value="COUNTRY">Country</option>
              <option value="CLASSICAL">Classical</option>
            </select>
          </div>

          <button
            onClick={() => handleGenreChange("")}
            className={styles.clearButton}
          >
            Clear
          </button>
        </div>
      )}
      {/* Event Grid */}
      <div className={styles.paginationContainer}>
        <Pagination
          defaultPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
};

export default EventsPage;
