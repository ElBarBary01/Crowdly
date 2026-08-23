"use client";

import { useState } from "react";
import styles from "./pagination.module.css";

type PaginationItem = number | "ellipsis";

interface PaginationProps {
  defaultPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

function getPaginationItems(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 2) {
    return [1, 2, 3, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 1) {
    return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis", currentPage, "ellipsis", totalPages];
}

export default function Pagination({
  defaultPage = 2,
  totalPages = 12,
  onPageChange,
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const [currentPage, setCurrentPage] = useState(
    Math.min(Math.max(1, defaultPage), safeTotalPages),
  );

  const selectPage = (page: number) => {
    const nextPage = Math.min(Math.max(1, page), safeTotalPages);
    setCurrentPage(nextPage);
    onPageChange?.(nextPage);
  };

  const paginationItems = getPaginationItems(currentPage, safeTotalPages);

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <button
        className={styles.control}
        type="button"
        aria-label="Previous page"
        disabled={currentPage === 1}
        onClick={() => selectPage(currentPage - 1)}
      >
        {"\u2190"}
      </button>

      {paginationItems.map((item, index) =>
        item === "ellipsis" ? (
          <span
            className={`${styles.control} ${styles.ellipsis}`}
            aria-hidden="true"
            key={`ellipsis-${index}`}
          >
            ...
          </span>
        ) : (
          <button
            className={`${styles.control} ${item === currentPage ? styles.active : ""}`}
            type="button"
            aria-current={item === currentPage ? "page" : undefined}
            aria-label={`Page ${item}`}
            key={item}
            onClick={() => selectPage(item)}
          >
            {item}
          </button>
        ),
      )}

      <button
        className={styles.control}
        type="button"
        aria-label="Next page"
        disabled={currentPage === safeTotalPages}
        onClick={() => selectPage(currentPage + 1)}
      >
        {"\u2192"}
      </button>
    </nav>
  );
}
