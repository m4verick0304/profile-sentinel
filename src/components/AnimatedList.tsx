// React Bits - Animated List
// Source: https://reactbits.dev/components/animated-list
import { useEffect, useRef, useState } from "react";

interface AnimatedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number, isSelected: boolean) => React.ReactNode;
  onItemSelect?: (item: T, index: number) => void;
  showGradients?: boolean;
  enableArrowNavigation?: boolean;
  className?: string;
  itemClassName?: string;
  displayScrollbar?: boolean;
  initialSelectedIndex?: number;
}

export function AnimatedList<T>({
  items,
  renderItem,
  onItemSelect,
  showGradients = true,
  enableArrowNavigation = true,
  className = "",
  itemClassName = "",
  displayScrollbar = false,
  initialSelectedIndex = -1,
}: AnimatedListProps<T>) {
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
  const [visibleCount, setVisibleCount] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Animate items appearing one by one
  useEffect(() => {
    setVisibleCount(0);
    const timer = setInterval(() => {
      setVisibleCount((c) => {
        if (c >= items.length) { clearInterval(timer); return c; }
        return c + 1;
      });
    }, 80);
    return () => clearInterval(timer);
  }, [items]);

  // Keyboard navigation
  useEffect(() => {
    if (!enableArrowNavigation) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        onItemSelect?.(items[selectedIndex], selectedIndex);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enableArrowNavigation, items, selectedIndex, onItemSelect]);

  // Scroll selected into view
  useEffect(() => {
    if (selectedIndex < 0 || !listRef.current) return;
    const el = listRef.current.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIndex]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {showGradients && (
        <>
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-8 z-10"
            style={{ background: "linear-gradient(to bottom, hsl(var(--card)), transparent)" }} />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 z-10"
            style={{ background: "linear-gradient(to top, hsl(var(--card)), transparent)" }} />
        </>
      )}
      <ul
        ref={listRef}
        className={`overflow-y-auto h-full ${displayScrollbar ? "" : "scrollbar-hide"}`}
        style={{ scrollbarWidth: displayScrollbar ? "thin" : "none" }}
      >
        {items.map((item, i) => (
          <li
            key={i}
            className={`transition-all duration-300 cursor-pointer ${itemClassName} ${
              i < visibleCount
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            } ${selectedIndex === i ? "ring-1 ring-primary/40 rounded-lg" : ""}`}
            style={{ transitionDelay: `${i * 20}ms` }}
            onClick={() => {
              setSelectedIndex(i);
              onItemSelect?.(item, i);
            }}
          >
            {renderItem(item, i, selectedIndex === i)}
          </li>
        ))}
      </ul>
    </div>
  );
}
