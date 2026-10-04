import { useEffect, useRef, useState } from 'react';
import ThemePreview from './ThemePreview';
import Avatar from './Avatar';
import Icon from './Icon';
import { imageUrl, request } from '../services/api';
export default function ThemeCard({ theme, viewerId, navigate }) {
  const element = useRef(null),
    [preview, setPreview] = useState(null),
    [previewError, setPreviewError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setPreview(null);
    setPreviewError(false);
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        request(`themes/${theme.id}/preview`, { signal: controller.signal })
          .then((result) => setPreview(result.preview))
          .catch(() => {
            if (!controller.signal.aborted) setPreviewError(true);
          });
      },
      { rootMargin: '150px' },
    );
    observer.observe(element.current);
    return () => {
      observer.disconnect();
      controller.abort();
    };
  }, [theme.id]);
  return (
    <article className="theme-card">
      <button
        ref={element}
        className="theme-preview"
        onClick={() => navigate('theme/' + theme.id)}
        aria-label={'Preview ' + theme.name}
      >
        {preview ? (
          <ThemePreview theme={preview} image={imageUrl(theme.id)} />
        ) : (
          <div className="preview-placeholder" role="status">
            {previewError
              ? 'Preview unavailable · open theme to retry'
              : 'Loading theme appearance…'}
          </div>
        )}
        <span>
          Explore theme <Icon name="ArrowRight" />
        </span>
      </button>
      <div className="theme-copy">
        <div className="theme-meta">
          <span>{theme.category}</span>
          {theme.featured && <span>EDITOR’S PICK</span>}
        </div>
        <h3>
          <button onClick={() => navigate('theme/' + theme.id)}>{theme.name}</button>
        </h3>
        <p>{theme.description}</p>
        <button className="theme-card-action" onClick={() => navigate('theme/' + theme.id)}>
          View theme <Icon name="ArrowRight" />
        </button>
        <div className="theme-byline">
          <div>
            <Avatar user={theme.author} viewerId={viewerId} size={30} />
            <span>{theme.author.name}</span>
          </div>
          <span title="Likes">↑ {theme.likes}</span>
          <span title="Dislikes">↓ {theme.dislikes}</span>
          <span title="Comments">{theme.comments} replies</span>
        </div>
      </div>
    </article>
  );
}
