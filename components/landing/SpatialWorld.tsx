'use client';

import { PointerEvent, WheelEvent, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

const hotspots = [
  { id: 'threshold', label: 'Threshold', detail: 'A low, compressed entry tunes the ear before the room opens.', x: 18, y: 64, z: 8 },
  { id: 'carrier', label: 'Carrier surface', detail: 'Timber ribs carry the pulse across the long wall.', x: 64, y: 34, z: 16 },
  { id: 'hollow', label: 'Hollow', detail: 'The central void gives the bass a longer after-image.', x: 48, y: 53, z: 46 },
];

const HOME = { x: -16, y: -30 };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function SpatialWorld({ position, onPositionChange }: { position: number; onPositionChange: (value: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [rotation, setRotation] = useState(HOME);
  const [zoom, setZoom] = useState(1);
  const [autoRotate, setAutoRotate] = useState(!reduced);
  const [active, setActive] = useState(hotspots[1]);
  const [expanded, setExpanded] = useState(false);
  const [light, setLight] = useState<'day' | 'dusk'>('day');
  const [isInView, setIsInView] = useState(true);

  const drag = useRef({ x: 0, y: 0, lastX: 0, lastY: 0, active: false });
  const velocity = useRef({ x: 0, y: 0 });
  const turnQueue = useRef(0);
  const pinch = useRef<number | null>(null);
  const interactionAt = useRef(0);
  const isInViewRef = useRef(isInView);

  useEffect(() => {
    isInViewRef.current = isInView;
  }, [isInView]);

  // Pause off-screen rendering
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const touchDistance = (event: globalThis.PointerEvent, other: { x: number; y: number }) =>
    Math.hypot(event.clientX - other.x, event.clientY - other.y);

  const markInteraction = () => {
    interactionAt.current = performance.now();
  };

  const applyZoom = (factor: number) => {
    markInteraction();
    setZoom((value) => clamp(value * factor, 0.55, 3.4));
  };

  useEffect(() => {
    document.body.dataset.light = light;
    return () => {
      delete document.body.dataset.light;
    };
  }, [light]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
      if (expanded && event.key === '0') {
        setRotation(HOME);
        setZoom(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();

    const tick = (time: number) => {
      if (!isInViewRef.current) {
        frame = requestAnimationFrame(tick);
        return;
      }

      const dt = Math.min(0.05, (time - last) / 1000);
      last = time;
      const idle = !reduced && time - interactionAt.current > 1800;

      setRotation((current) => {
        const next = { ...current };
        const queued = turnQueue.current;
        if (Math.abs(queued) > 0.001) {
          const step = queued * (1 - Math.exp(-dt * 4.2));
          next.y += step;
          turnQueue.current -= step;
        }
        if (drag.current.active) return next;
        if (idle && autoRotate) {
          next.y += Math.sin(time * 0.00055) * 0.16 * dt * 5;
          next.x += (Math.sin(time * 0.0009) * 0.03 - (next.x - HOME.x)) * dt * 1.5;
        }
        next.y += velocity.current.x * dt;
        next.x += velocity.current.y * dt;
        const decay = Math.exp(-dt * 4.5);
        velocity.current.x *= decay;
        velocity.current.y *= decay;
        return { x: clamp(next.x, -58, 42), y: next.y };
      });

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [autoRotate, reduced]);

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    markInteraction();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, active: true };
    velocity.current = { x: 0, y: 0 };
    setAutoRotate(false);
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (drag.current.active) {
      const dx = event.clientX - drag.current.lastX;
      const dy = event.clientY - drag.current.lastY;
      const k = Math.PI / Math.max(260, event.currentTarget.clientWidth * 1.6);
      velocity.current = { x: dx * k * 2.2, y: -dy * k * 2.2 };
      drag.current.lastX = event.clientX;
      drag.current.lastY = event.clientY;
      setRotation((current) => ({
        x: clamp(current.x - dy * k * 55, -58, 42),
        y: current.y + dx * k * 55,
      }));
    }
    if (pinch.current !== null) {
      const other = { x: drag.current.lastX, y: drag.current.lastY };
      const distance = touchDistance(event.nativeEvent, other);
      if (distance > 0) applyZoom(distance / pinch.current);
      pinch.current = distance;
    }
  }

  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    drag.current.active = false;
    pinch.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    applyZoom(Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0016)));
  }

  function queueTurn(amount: number) {
    markInteraction();
    turnQueue.current += amount;
  }

  function resetView() {
    markInteraction();
    setRotation(HOME);
    setZoom(1);
    velocity.current = { x: 0, y: 0 };
    turnQueue.current = 0;
  }

  function toggleDetail() {
    markInteraction();
    setZoom((value) => (value > 2.2 ? 1 : 2.6));
  }

  function handleKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      markInteraction();
      setRotation((value) => ({ ...value, y: value.y - 0.18 }));
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      markInteraction();
      setRotation((value) => ({ ...value, y: value.y + 0.18 }));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      markInteraction();
      setRotation((value) => ({ ...value, x: clamp(value.x - 0.18 * 57, -58, 42) }));
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      markInteraction();
      setRotation((value) => ({ ...value, x: clamp(value.x + 0.18 * 57, -58, 42) }));
    }
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      applyZoom(1.2);
    }
    if (event.key === '-') {
      event.preventDefault();
      applyZoom(1 / 1.2);
    }
    if (event.key === '0') resetView();
  }

  return (
    <div ref={containerRef} className={`spatial-world ${expanded ? 'focus' : ''}`} data-light={light}>
      <div className="spatial-world__toolbar">
        <span className="eyebrow">Interactive section / drag to orbit</span>
        <div className="spatial-world__actions">
          <button
            suppressHydrationWarning
            type="button"
            onClick={() => setAutoRotate((value) => !value)}
            aria-pressed={autoRotate}
          >
            {autoRotate ? 'pause orbit' : 'auto orbit'}
          </button>
          <button
            suppressHydrationWarning
            type="button"
            onClick={() => setLight((value) => (value === 'day' ? 'dusk' : 'day'))}
            aria-pressed={light === 'dusk'}
          >
            {light === 'day' ? 'dusk light' : 'day light'}
          </button>
          <button
            suppressHydrationWarning
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-pressed={expanded}
          >
            {expanded ? 'close focus' : 'expand'}
          </button>
          <button suppressHydrationWarning type="button" onClick={resetView}>
            reset view
          </button>
        </div>
      </div>
      <div
        className="spatial-world__viewport"
        tabIndex={0}
        onKeyDown={handleKey}
        onDoubleClick={resetView}
        onWheel={handleWheel}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        role="application"
        aria-label="Interactive 3D listening room. Drag to orbit, use the wheel to zoom, double-click to reset, and click a marker to inspect a design decision."
      >
        <div className="spatial-world__turn-pill">
          <button suppressHydrationWarning type="button" onClick={() => queueTurn(-Math.PI / 2)} aria-label="Turn left 90 degrees">
            ←
          </button>
          <button suppressHydrationWarning type="button" onClick={() => queueTurn(Math.PI * 2)}>
            360°
          </button>
          <button suppressHydrationWarning type="button" onClick={() => queueTurn(Math.PI / 2)} aria-label="Turn right 90 degrees">
            →
          </button>
        </div>
        <div className="spatial-world__zoom">
          <button suppressHydrationWarning type="button" onClick={() => applyZoom(1.35)} aria-label="Zoom in">
            +
          </button>
          <button suppressHydrationWarning type="button" onClick={() => applyZoom(1 / 1.35)} aria-label="Zoom out">
            −
          </button>
          <button suppressHydrationWarning type="button" onClick={toggleDetail} aria-pressed={zoom > 2.2}>
            detail
          </button>
        </div>
        <div
          className="spatial-world__scene"
          style={{ transform: `scale(${zoom}) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}
        >
          <div className="room-shell">
            <div className="room-floor" />
            <div className="room-ceiling" />
            <div className="room-wall room-wall--back" />
            <div className="room-wall room-wall--left" />
            <div className="room-wall room-wall--right" />
            <div className="room-door" />
            <div className="room-rib rib-1" />
            <div className="room-rib rib-2" />
            <div className="room-rib rib-3" />
            <div className="room-rib rib-4" />
            <div className="room-table" />
            <div className="room-speaker speaker-a" />
            <div className="room-speaker speaker-b" />
            <div className="sound-ring ring-a" />
            <div className="sound-ring ring-b" />
            <div className="sound-ring ring-c" />
            <div className="listener" style={{ left: `${position}%` }} />
          </div>
          {hotspots.map((hotspot) => (
            <button
              suppressHydrationWarning
              type="button"
              key={hotspot.id}
              className={`hotspot ${active.id === hotspot.id ? 'active' : ''}`}
              style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%`, transform: `translateZ(${hotspot.z}px)` }}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                markInteraction();
                setActive(hotspot);
              }}
              aria-label={`Inspect ${hotspot.label}`}
            >
              <span>{active.id === hotspot.id ? '−' : '+'}</span>
            </button>
          ))}
        </div>
        <div className="spatial-world__legend">
          <span>
            <i className="legend-dot legend-dot--blue" /> listening point
          </span>
          <span>
            <i className="legend-dot" /> acoustic decision
          </span>
        </div>
      </div>
      <div className="spatial-world__footer">
        <div>
          <span className="mono">ACTIVE NODE / {active.label.toUpperCase()}</span>
          <p>{active.detail}</p>
        </div>
        <label>
          LISTENING POSITION{' '}
          <input
            type="range"
            min="0"
            max="100"
            value={position}
            onChange={(event) => {
              markInteraction();
              onPositionChange(Number(event.target.value));
            }}
          />
        </label>
        <div className="spatial-readout">
          x <b>{(3.2 + position * 0.045).toFixed(1)}</b> m<br />
          depth <b>{(1.4 + (100 - position) * 0.025).toFixed(1)}</b> m<br />
          field <b>{light}</b>
        </div>
      </div>
    </div>
  );
}
