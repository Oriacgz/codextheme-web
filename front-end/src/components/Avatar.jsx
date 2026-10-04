import { memo, useEffect, useRef, useState } from 'react';
import { Blobatar } from '@blobatar/react';
import { useGaze } from '@blobatar/react/gaze';
import { happy } from 'blobatar/expression';
import { useReducedMotion } from 'motion/react';
import 'blobatar/motion.css';
import 'blobatar/gaze.css';
export const avatarName = (index) => `codexskin-community-avatar-${index}`;
function Avatar({
  user,
  viewerId,
  size = 42,
  choice = false,
  choiceLabel,
  onChoose,
  selected = false,
}) {
  const reduce = useReducedMotion(),
    [reacting, setReacting] = useState(false),
    timer = useRef(null);
  const own = user?.id && user.id === viewerId;
  const { ref } = useGaze({ travel: 3, lookAt: own && !reduce ? 'pointer' : null });
  useEffect(() => () => clearTimeout(timer.current), []);
  function react() {
    clearTimeout(timer.current);
    setReacting(true);
    timer.current = setTimeout(() => setReacting(false), 1100);
    onChoose?.();
  }
  return (
    <button
      type="button"
      className={
        'avatar-button' + (selected ? ' selected' : '') + (reacting && !reduce ? ' reacting' : '')
      }
      aria-label={
        choice
          ? choiceLabel || `Choose avatar ${user.avatar + 1}`
          : `React with ${user?.name || 'this'}’s avatar`
      }
      aria-pressed={choice ? selected : undefined}
      onClick={react}
    >
      <Blobatar
        ref={ref}
        name={avatarName(user?.avatar || 0)}
        size={size}
        background="circle"
        animate={own && !reduce ? 'always' : 'hover'}
        expression={reacting ? happy : undefined}
      />
    </button>
  );
}

export default memo(Avatar);
