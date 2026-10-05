import { memo, useEffect, useRef, useState } from "react";
import { Blobatar } from "@blobatar/react";
import { useGaze } from "@blobatar/react/gaze";
import {
  happy,
  surprised,
  wink,
  smug,
  thinking,
  sleepy,
} from "blobatar/expression";
import { useReducedMotion } from "motion/react";
import { dragIntent, dragPose } from "../services/avatar-gestures";
import "blobatar/motion.css";
import "blobatar/gaze.css";
export const avatarName = (index) => `codexskin-community-avatar-${index}`;
const expressions = { happy, surprised, wink, smug, thinking, sleepy };
const clicks = ["happy", "surprised", "wink", "smug"];

function Avatar({
  user,
  viewerId,
  size = 42,
  choice = false,
  choiceLabel,
  onChoose,
  selected = false,
}) {
  const reduce = useReducedMotion();
  const [reaction, setReaction] = useState(null);
  const [motion, setMotion] = useState("");
  const timers = useRef([]),
    gesture = useRef(null),
    body = useRef(null);
  const suppressClick = useRef(false),
    count = useRef(0),
    lastTap = useRef(0);
  const own = Boolean(user?.id && user.id === viewerId);
  const { ref, lookAt } = useGaze({
    travel: 3,
    lookAt: own && !reduce ? "pointer" : null,
  });
  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }
  useEffect(() => () => clearTimers(), []);
  function react(expression, animation, duration = 1100) {
    clearTimers();
    setReaction(expression);
    setMotion(reduce ? "" : animation);
    timers.current.push(
      setTimeout(() => {
        setReaction(null);
        setMotion("");
      }, duration),
    );
  }
  function resetPose() {
    body.current?.style.removeProperty("--avatar-x");
    body.current?.style.removeProperty("--avatar-y");
    body.current?.style.removeProperty("--avatar-angle");
    lookAt(own && !reduce ? "pointer" : null);
  }
  function cancel() {
    if (!gesture.current) return;
    gesture.current = null;
    suppressClick.current = true;
    lastTap.current = 0;
    clearTimers();
    resetPose();
    setReaction(null);
    setMotion("");
  }
  function release(event) {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    gesture.current = null;
    clearTimers();
    resetPose();
    if (active.dragged || active.held) {
      suppressClick.current = true;
      lastTap.current = 0;
      react(
        active.dragged ? "wink" : "happy",
        active.dragged ? "wobble" : "tap",
      );
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  return (
    <button
      type="button"
      className={"avatar-button" + (selected ? " selected" : "")}
      aria-label={
        choice
          ? choiceLabel || `Choose avatar ${user.avatar + 1}`
          : `React with ${user?.name || "this"}’s avatar`
      }
      aria-pressed={choice ? selected : undefined}
      title={
        choice
          ? "Choose this avatar"
          : "Tap, double-tap, hold or drag for a reaction"
      }
      data-reaction={reaction || "idle"}
      onContextMenu={(event) => {
        if (!choice) event.preventDefault();
      }}
      onPointerDown={(event) => {
        if (choice || !event.isPrimary || event.button !== 0) return;
        clearTimers();
        suppressClick.current = false;
        const active = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          held: false,
          dragged: false,
        };
        gesture.current = active;
        event.currentTarget.setPointerCapture(event.pointerId);
        timers.current.push(
          setTimeout(() => {
            active.held = true;
            setReaction("thinking");
            setMotion("");
          }, 550),
        );
        timers.current.push(
          setTimeout(() => {
            setReaction("sleepy");
          }, 1500),
        );
      }}
      onPointerMove={(event) => {
        const active = gesture.current;
        if (!active || active.id !== event.pointerId) return;
        const dx = event.clientX - active.x,
          dy = event.clientY - active.y;
        const intent = active.dragged
          ? "drag"
          : dragIntent(dx, dy, event.pointerType);
        if (intent === "pending") return;
        if (intent === "scroll") {
          cancel();
          return;
        }
        if (!active.dragged) {
          active.dragged = true;
          clearTimers();
          setReaction("surprised");
          setMotion("drag");
        }
        if (!reduce) {
          const pose = dragPose(dx, dy);
          body.current.style.setProperty("--avatar-x", `${pose.x}px`);
          body.current.style.setProperty("--avatar-y", `${pose.y}px`);
          body.current.style.setProperty("--avatar-angle", `${pose.angle}deg`);
          lookAt({ x: event.clientX, y: event.clientY });
        }
      }}
      onPointerUp={release}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
      onClick={(event) => {
        if (suppressClick.current && event.detail > 0) {
          suppressClick.current = false;
          return;
        }
        suppressClick.current = false;
        if (choice) {
          react("happy", "tap");
          onChoose?.();
          return;
        }
        const now = performance.now();
        const double =
          event.detail > 0 &&
          (event.detail === 2 ||
            (lastTap.current > 0 && now - lastTap.current < 300));
        lastTap.current = double ? 0 : now;
        react(
          double ? "surprised" : clicks[count.current++ % clicks.length],
          double ? "excited" : "tap",
        );
      }}
    >
      <span ref={body} className="avatar-body" data-motion={motion}>
        <Blobatar
          ref={ref}
          name={avatarName(user?.avatar || 0)}
          size={size}
          background="circle"
          animate={reduce ? undefined : own ? "always" : "hover"}
          expression={expressions[reaction]}
        />
      </span>
    </button>
  );
}
export default memo(Avatar);
