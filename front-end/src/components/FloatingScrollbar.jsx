import { useEffect, useRef, useState } from "react";
import { scrollGeometry } from "../services/scroll";

export default function FloatingScrollbar() {
  const track = useRef(null),
    thumb = useRef(null),
    geometry = useRef(null),
    drag = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let frame = 0;
    function update() {
      frame = 0;
      const root = document.scrollingElement;
      const size = scrollGeometry(
        innerHeight,
        root.scrollHeight,
        track.current.clientHeight,
        root.scrollTop,
      );
      geometry.current = size;
      setVisible(size.maximum > 1);
      thumb.current.style.height = `${size.thumb}px`;
      thumb.current.style.transform = `translateY(${size.offset}px)`;
      track.current.setAttribute(
        "aria-valuenow",
        String(Math.round(size.progress * 100)),
      );
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    observer.observe(track.current);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);
  function pointerScroll(event, grab) {
    const size = geometry.current;
    if (!size?.travel) return;
    const position =
      event.clientY - track.current.getBoundingClientRect().top - grab;
    window.scrollTo({
      top: Math.max(0, Math.min(1, position / size.travel)) * size.maximum,
      behavior: "instant",
    });
  }
  return (
    <div
      ref={track}
      className="floating-scrollbar"
      data-visible={visible}
      role="scrollbar"
      aria-label="Page scroll"
      aria-controls="page-content"
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      tabIndex={visible ? 0 : -1}
      onPointerDown={(event) => {
        if (event.button !== 0 || !visible) return;
        event.preventDefault();
        drag.current =
          event.target === thumb.current
            ? event.clientY - thumb.current.getBoundingClientRect().top
            : geometry.current.thumb / 2;
        event.currentTarget.setPointerCapture(event.pointerId);
        pointerScroll(event, drag.current);
      }}
      onPointerMove={(event) => {
        if (drag.current !== null) pointerScroll(event, drag.current);
      }}
      onPointerUp={(event) => {
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
      onKeyDown={(event) => {
        const keys = {
          ArrowDown: 80,
          ArrowUp: -80,
          PageDown: innerHeight * 0.8,
          PageUp: -innerHeight * 0.8,
          Home: -Infinity,
          End: Infinity,
        };
        if (!(event.key in keys)) return;
        event.preventDefault();
        const top =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? geometry.current.maximum
              : scrollY + keys[event.key];
        window.scrollTo({ top, behavior: "instant" });
      }}
    >
      <div ref={thumb} className="floating-scrollbar-thumb" />
    </div>
  );
}
