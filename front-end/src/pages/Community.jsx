import { themeCategories } from "../services/theme-categories";
import { useEffect, useRef, useState } from "react";
import { request } from "../services/api";
import Icon from "../components/Icon";
import ThemeCard from "../components/ThemeCard";
const categories = ["All", ...themeCategories];
export default function Community({ user, navigate }) {
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("All"),
    [themes, setThemes] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [next, setNext] = useState(null),
    [refresh, setRefresh] = useState(0),
    [configured, setConfigured] = useState(true);
  const pagination = useRef(null);
  useEffect(() => {
    pagination.current?.abort();
    const controller = new AbortController(),
      timer = setTimeout(
        () => {
          setLoading(true);
          setError("");
          request(
            `themes&search=${encodeURIComponent(search)}&category=${category}`,
            {
              signal: controller.signal,
            },
          )
            .then((result) => {
              setThemes(result.themes);
              setNext(result.next);
              setConfigured(result.configured);
            })
            .catch((e) => {
              if (!controller.signal.aborted) setError(e.message);
            })
            .finally(() => {
              if (!controller.signal.aborted) setLoading(false);
            });
        },
        search.trim() ? 200 : 0,
      );
    return () => {
      clearTimeout(timer);
      controller.abort();
      pagination.current?.abort();
    };
  }, [search, category, refresh]);
  async function loadMore() {
    if (loading || !next) return;
    const controller = new AbortController();
    pagination.current = controller;
    setLoading(true);
    try {
      const result = await request(
        `themes&search=${encodeURIComponent(search)}&category=${category}&cursor=${next}`,
        { signal: controller.signal },
      );
      setThemes((current) => [...current, ...result.themes]);
      setNext(result.next);
    } catch (error) {
      if (!controller.signal.aborted) setError(error.message);
    } finally {
      if (!controller.signal.aborted) {
        pagination.current = null;
        setLoading(false);
      }
    }
  }

  return (
    <section className="content-page community-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">THE COMMUNITY COLLECTION</p>
          <h1>Community themes.</h1>
          <p>Explore real Codex previews. Find a look that feels like you.</p>
        </div>
        <a className="button primary" href="#/upload">
          <Icon name="Upload" />
          Share a theme
        </a>
      </div>
      <div className="collection-tools">
        <label className="search-field">
          <Icon name="Search" />
          <input
            type="search"
            placeholder="Find your atmosphere…"
            aria-label="Search community themes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="category-filters" aria-label="Theme categories">
          {categories.map((value) => (
            <button
              key={value}
              className={category === value ? "active" : ""}
              aria-pressed={category === value}
              onClick={() => setCategory(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <div className="collection-summary">
        <span>
          {loading
            ? "Finding themes…"
            : `${themes.length}${next ? "+" : ""} ${themes.length === 1 ? "theme" : "themes"}${category !== "All" ? ` · ${category}` : ""}`}
        </span>
        <span>Preview the look. Download the package. Make it yours.</span>
      </div>
      {error && (
        <div className="notice error" role="alert">
          {error}
          <button onClick={() => setRefresh((x) => x + 1)}>Try again</button>
        </div>
      )}
      {loading && !themes.length ? (
        <div className="theme-grid" role="status" aria-label="Loading themes">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-card" aria-hidden="true">
              <div className="skeleton-preview" />
              <div className="skeleton-copy">
                <div className="skeleton-line short" />
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
              </div>
            </div>
          ))}
        </div>
      ) : themes.length ? (
        <>
          <div className="theme-grid">
            {themes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                viewerId={user?.id}
                navigate={navigate}
                onEdited={(updated) =>
                  setThemes((current) =>
                    current
                      .map((theme) =>
                        theme.id === updated.id ? updated : theme,
                      )
                      .filter(
                        (theme) =>
                          (category === "All" ||
                            (theme.categories || [theme.category]).includes(
                              category,
                            )) &&
                          theme.name
                            .toLowerCase()
                            .includes(search.slice(0, 80).toLowerCase()),
                      ),
                  )
                }
                onDeleted={(id) =>
                  setThemes((current) =>
                    current.filter((theme) => theme.id !== id),
                  )
                }
              />
            ))}
          </div>
          {next && (
            <button
              className="button load-more"
              disabled={loading}
              onClick={loadMore}
            >
              {loading ? "Loading…" : "More to explore"}
            </button>
          )}
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-art">
            <Icon name="Grid" size={32} />
          </div>
          <p className="eyebrow">
            {search || category !== "All"
              ? "A FRESH PERSPECTIVE"
              : "A BLANK CANVAS"}
          </p>
          <h2>
            {search || category !== "All"
              ? "Nothing here just yet."
              : "Be the first to set the mood."}
          </h2>
          <p>
            {search || category !== "All"
              ? "Try another search or explore a different category."
              : "A new collection, made by the people who use it. Your theme could be the first."}
          </p>
          <a className="button primary" href="#/upload">
            Share the first theme <Icon name="ArrowRight" />
          </a>
          {!configured && (
            <small>
              Accounts and uploads become available when the owner connects
              Prisma Postgres.
            </small>
          )}
        </div>
      )}
    </section>
  );
}
