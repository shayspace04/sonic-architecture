'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';
import { InteractiveSignal } from './InteractiveSignal';
import { PromptComposer, STARTER_PROMPTS, buildStudioHref } from './PromptComposer';
import { SpatialWorld } from './SpatialWorld';

const concepts = [
  ['01 / VOLUME', 'Contain the air.', 'Boundaries give sound a body, pressure, and a place to arrive.'],
  ['02 / RHYTHM', 'Repeat with variance.', 'Columns, apertures, and footsteps establish a beat — the smallest difference makes it alive.'],
  ['03 / RESONANCE', 'Leave room for echo.', 'A good room is never finished at the wall. Its after-image is part of the composition.'],
];

const moments = [
  ['00:00', 'Threshold', 'the room takes a breath and tunes the ear'],
  ['00:47', 'Carrier', 'structural timber ribs catch the cadence'],
  ['01:36', 'Hollow', 'acoustic void opens around the listener'],
  ['02:42', 'Afterimage', 'sound remains vibrating in the material'],
];

export function LandingPage() {
  const reduced = useReducedMotion();
  const [sequence, setSequence] = useState(0);
  const [position, setPosition] = useState(58);
  const [activeConcept, setActiveConcept] = useState(0);

  return (
    <main id="main-content" className="sonic-theme font-sans">
      {/* Site Navigation */}
      <nav className="site-nav" aria-label="Primary navigation">
        <Link className="wordmark" href="/">
          <span className="wordmark-mark" aria-hidden="true" />
          SONIC / ARCHITECTURE
        </Link>
        <div className="nav-links">
          <Link href="#studies">Studies</Link>
          <Link href="#sequence">Sequence</Link>
          <Link href="#spatial">Spatial field</Link>
          <Link href="/studio">Studio</Link>
          <Link href="/about">About</Link>
          <Link href="/archive">Archive</Link>
          <span>
            No. 01 / <b>2026—</b>
          </span>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero" id="top">
        <div className="hero-meta">
          <div className="eyebrow">An audiovisual study</div>
          <p>Architecture is not only the room. It is the duration of the room.</p>
        </div>
        <motion.div
          className="hero-center"
          initial={{ opacity: 0, y: reduced ? 0 : 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.22, 0.8, 0.24, 1] }}
        >
          <div className="architecture-frame" />
          <InteractiveSignal />
        </motion.div>
        <div className="hero-title">
          <span>SONIC</span>
          <em>Architecture</em>
        </div>
        <div className="hero-side">
          <div>
            <div className="side-line" />
            <p>Spaces composed as instruments. Frequencies given a section.</p>
          </div>
          <div className="meta-row">
            <span>48° 51′ 24″ N</span>
            <span>01 / 04</span>
          </div>
        </div>
        <div className="scroll-cue">Scroll to enter</div>
      </header>

      {/* Prompt Section */}
      <section className="prompt-section">
        <div className="section-number">00 — START</div>
        <div className="prompt-copy">
          <div className="eyebrow">Describe a taste</div>
          <h1>
            Your taste has a <em>world</em> of its own.
          </h1>
          <p>
            Give us a collision of references. The agent turns cultural signals into an architectural space you can walk through, hear, and export.
          </p>
          <PromptComposer />
        </div>
        <div className="prompt-side">
          <span>01</span>
          <p>
            Type what you love.
            <br />
            We’ll find the architecture inside it.
          </p>
        </div>
      </section>

      {/* How it Works */}
      <section className="how-it-works" id="studies">
        <div className="section-head">
          <h2>From taste to place</h2>
          <span>How the world is composed / 01—03</span>
        </div>
        <div className="process-grid">
          <article>
            <span>01</span>
            <h3>Describe a taste</h3>
            <p>Jazz, brutalism, late nights, a garden after rain. Start with an artist, film, or aesthetic collision.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Qloo grounds form</h3>
            <p>Live Qloo taste signals ground choices for materials, lighting, acoustics, geometry, and spatial soundtracks.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Explore, hear, export</h3>
            <p>Walk the 3D room, inspect why each decision was made, and export an architectural design brief.</p>
          </article>
        </div>
      </section>

      {/* Why Qloo Section: Real Evidence Comparison */}
      <section className="why-qloo" id="why-qloo">
        <div className="why-qloo__copy">
          <div className="eyebrow">Why Qloo</div>
          <h2>
            Not a moodboard.
            <br />
            <em>A point of view with evidence.</em>
          </h2>
          <p>
            Each design choice is honestly labelled as Qloo evidence, inferred, or fallback — so the leap from what you love to what you see stays legible.
          </p>
          <Link className="text-link" href="/about#evidence">
            See the evidence model ↗
          </Link>
        </div>
        <div className="comparison" aria-label="Grounded and ungrounded design comparison">
          <div>
            <span className="comparison-label">QLOO-GROUNDED · EXAMPLE OUTPUT</span>
            <div className="comparison-visual grounded">
              <i />
              <i />
              <i />
              <b />
            </div>
            <p>
              <strong>Miles Davis + Brutalist:</strong> Low subterranean jazz cellar (3.4m), board-formed raw concrete, acoustic dark walnut slats, deep indigo (#0b1428) & amber (#e28743) lighting, RT60 = 0.85s intimate warmth.
            </p>
          </div>
          <div>
            <span className="comparison-label">PLAIN LLM (UNGROUNDED) · EXAMPLE OUTPUT</span>
            <div className="comparison-visual plain">
              <i />
              <i />
              <i />
              <b />
            </div>
            <p>
              <strong>Generic LLM fallback:</strong> Standard monumental concrete cube (12m), flat grey drywall, polished floor, uniform monochrome grey (#707070), RT60 = 3.2s echoing hall with no cultural intimacy.
            </p>
          </div>
        </div>
      </section>

      {/* Architectural Concepts */}
      <section className="concepts" aria-labelledby="concept-title">
        <div className="section-head">
          <h2 id="concept-title">Three conditions for a listening space</h2>
          <span>Tap to trace</span>
        </div>
        <div className="concept-grid">
          {concepts.map(([label, title, body], index) => (
            <article
              key={label}
              className={activeConcept === index ? 'concept active' : 'concept'}
              tabIndex={0}
              role="button"
              aria-pressed={activeConcept === index}
              onClick={() => setActiveConcept(index)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') setActiveConcept(index);
              }}
            >
              <span className="concept-number">{label}</span>
              <div className={`concept-mark mark-${index}`} />
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Gallery of Starter Worlds */}
      <section className="gallery">
        <div className="section-head">
          <h2>Starter worlds</h2>
          <span>Grounded architectural studies / try in studio</span>
        </div>
        <div className="world-grid">
          {STARTER_PROMPTS.slice(0, 3).map((world, index) => (
            <Link href={buildStudioHref(world)} key={world} className="world-card">
              <div className={`world-art world-art-${index}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>
              </div>
              <strong>{world}</strong>
              <small>Grounded study · Launch studio ↗</small>
            </Link>
          ))}
        </div>
      </section>

      {/* Sequence Section */}
      <section className="sequence" id="sequence">
        <div className="section-head">
          <h2>A short score for moving through space</h2>
          <span>duration / 03:18</span>
        </div>
        <div className="sequence-layout">
          <div>
            <div className="eyebrow">Sequence / 002</div>
            <h2>
              From <em>threshold</em> to afterimage.
            </h2>
            <p>
              Four movements describe the passage: a door opens, a surface carries the pulse, a void widens, and the room continues vibrating after we leave it.
            </p>
          </div>
          <div className="sequence-control">
            <div className="timeline-visual">
              <InteractiveSignal compact />
              <div className="sequence-marker" style={{ left: `${[4, 34, 66, 96][sequence]}%` }} />
            </div>
            <div className="sequence-labels" role="tablist" aria-label="Sequence moments">
              {moments.map(([time, title, body], index) => (
                <button
                  suppressHydrationWarning
                  type="button"
                  key={title}
                  className={sequence === index ? 'active' : ''}
                  role="tab"
                  aria-selected={sequence === index}
                  onClick={() => setSequence(index)}
                >
                  <span>{time}</span>
                  <strong>{title}</strong>
                  <small>{body}</small>
                </button>
              ))}
            </div>
            <div className="sequence-readout">movement {String(sequence + 1).padStart(2, '0')} / 04</div>
          </div>
        </div>
      </section>

      {/* Spatial Field Section */}
      <section className="spatial" id="spatial">
        <div className="spatial-intro">
          <div className="eyebrow">Spatial field / 003</div>
          <h2>
            Stand inside the <em>sound.</em>
          </h2>
          <p>
            Move through a sectional field. The blue point is your listening position; the lines are not walls, but the distance between acoustic events.
          </p>
        </div>
        <SpatialWorld position={position} onPositionChange={setPosition} />
      </section>

      {/* Judges / Builders Section */}
      <section className="judges">
        <div className="section-number">05 — UNDER THE HOOD</div>
        <div>
          <div className="eyebrow">For judges / builders</div>
          <h2>Grounded taste signals become visible design decisions.</h2>
          <p>
            The landing page connects to the full interactive 3D studio. Sonic Architecture reveals the exact reasoning chain: Qloo cultural signals in, agent interpretation through, spatial geometry out — with real latency, cache provenance, and health telemetry.
          </p>
          <div className="judge-links">
            <Link href="/about#how-it-works">Read how it works ↗</Link>
            <a href="https://github.com/shayspace04/sonic-architecture" target="_blank" rel="noreferrer">
              View repository on GitHub ↗
            </a>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact" id="contact">
        <div className="section-number">06 — OPEN SOURCE</div>
        <div className="contact-main">
          <div>
            <div className="eyebrow">Repository & Contributions</div>
            <h2>
              Make a room <em>resonate.</em>
            </h2>
          </div>
          <div className="contact-bottom">
            <p>
              Sonic Architecture is open-source software built for the Qloo Hackathon. Designed for spatial identities, sound installations, and cultural spaces.
            </p>
            <a
              className="contact-link"
              href="https://github.com/shayspace04/sonic-architecture"
              target="_blank"
              rel="noreferrer"
            >
              github.com/shayspace04/sonic-architecture ↗
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-note">
        <span>SONIC / ARCHITECTURE · MIT LICENSE</span>
        <span>built from taste signals / 01—06</span>
        <Link href="#top">back to top ↑</Link>
      </footer>
    </main>
  );
}
