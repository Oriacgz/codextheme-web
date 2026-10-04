import { memo } from 'react';
import { previewAppearance } from '../services/preview';

function PreviewIcon({ kind }) {
  const paths = {
    home: 'M3 10 12 3l9 7v10h-6v-6H9v6H3Z',
    folder: 'M3 6h7l2 3h9v11H3Z',
    clock: 'M12 7v6l-4 2',
    edit: 'm15 4 5 5-10 10-6 1 1-6Z',
    search: 'm16 16 5 5',
    grid: 'M3 3h7v18H3ZM14 3h7v18h-7Z',
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      {['clock', 'search'].includes(kind) && (
        <circle
          cx={kind === 'search' ? 10 : 12}
          cy={kind === 'search' ? 10 : 12}
          r={kind === 'search' ? 7 : 9}
        />
      )}
      <path d={paths[kind] || paths.grid} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function ThemePreview({ theme = {}, image }) {
  const appearance = previewAppearance(theme);
  const style = {
    '--preview-text': appearance.text,
    '--preview-muted': appearance.muted,
    '--preview-accent': appearance.accent,
    '--preview-sidebar': appearance.sidebar,
    '--preview-sidebar-blur': appearance.sidebarBlur,
    '--preview-composer': appearance.composer,
    '--preview-composer-blur': appearance.composerBlur,
    '--preview-chooser': appearance.chooser,
  };
  return (
    <div
      className="codex-preview"
      style={style}
      role="img"
      aria-label="Codex start screen preview using this theme’s saved appearance settings"
    >
      <div
        className="codex-preview-art"
        style={{
          backgroundImage: `url("${image}")`,
          backgroundSize: appearance.backgroundSize,
          backgroundPosition: appearance.position,
          transform: `scale(${appearance.zoom})`,
          transformOrigin: appearance.position,
          opacity: appearance.opacity,
          filter: `brightness(${appearance.brightness}) blur(${appearance.blur})`,
        }}
      />
      <div className="codex-preview-titlebar">
        <div>
          ← <i>→</i>
          <PreviewIcon kind="grid" />
          <span>File</span>
          <span>Edit</span>
          <span>View</span>
          <span>Help</span>
        </div>
        <div>− &nbsp; □ &nbsp; ×</div>
      </div>
      <aside className="codex-preview-sidebar">
        <div className="codex-preview-rail">
          <b>
            <PreviewIcon kind="home" />
          </b>
          <PreviewIcon kind="clock" />
          <PreviewIcon kind="grid" />
          <PreviewIcon kind="folder" />
          <span>◎</span>
          <span>···</span>
          <PreviewIcon kind="folder" />
          <em>AP</em>
        </div>
        <div className="codex-preview-navigation">
          <strong>
            Codex ⌄ <PreviewIcon kind="search" />
          </strong>
          <p>
            <PreviewIcon kind="edit" />
            New chat
          </p>
          <p>Projects ›</p>
          <p>Recents ›</p>
          <div className="codex-preview-onboarding">
            <b>
              Getting started <small>0 of 2</small>
            </b>
            <div className="preview-progress" />
            <p>○ &nbsp; Catch me up on updates and blockers</p>
            <p>○ &nbsp; Summarize current priorities</p>
          </div>
        </div>
      </aside>
      <main className="codex-preview-chat">
        <div className="codex-preview-welcome">
          <div>✧</div>
          <p>What should we build?</p>
        </div>
        <div className="codex-preview-input">
          <div className="codex-preview-chooser">
            <span>
              <PreviewIcon kind="folder" />
              My workspace
            </span>
            <span>▱ &nbsp; This computer</span>
            <span>Worktree □</span>
          </div>
          <div className="codex-preview-composer">
            <p>Do anything</p>
            <div>
              <span>＋ &nbsp; ♧ Approve for me</span>
              <span>
                GPT-6.1 Sol Medium ⌄ &nbsp; ♩ <b>≋</b>
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default memo(ThemePreview);
