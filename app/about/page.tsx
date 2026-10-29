import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About the Methodology — Sonic Architecture',
  description:
    'How Sonic Architecture translates cultural taste signals from Qloo into 3D architectural spaces, acoustic telemetry, and spatial soundtracks.',
};

export default function AboutPage() {
  return (
    <main className="sonic-theme font-sans about-page" id="main-content">
      {/* Navigation */}
      <nav className="site-nav" aria-label="Primary navigation">
        <Link className="wordmark" href="/">
          <span className="wordmark-mark" aria-hidden="true" />
          SONIC / ARCHITECTURE
        </Link>
        <div className="nav-links">
          <Link href="/">Home</Link>
          <Link href="/studio">Studio</Link>
          <Link href="/archive">Archive</Link>
          <a
            href="https://github.com/shayspace04/sonic-architecture"
            target="_blank"
            rel="noreferrer"
          >
            GitHub ↗
          </a>
        </div>
      </nav>

      <div className="about-grid">
        <div className="section-number">ABOUT / METHODOLOGY</div>
        <div className="about-copy">
          <div className="eyebrow">Cultural Intelligence to Spatial Form</div>
          <h1>
            Every taste describes an <em>architectural</em> world.
          </h1>
          <p className="lede">
            Sonic Architecture translates cultural taste signals into inhabitable 3D spaces. A visitor inputs an aesthetic collision — an artist, a film, an architectural movement, or an atmosphere — and an agent queries Qloo’s taste graph to ground room geometry, surface materials, lighting, acoustics, and generative soundtracks.
          </p>

          <section id="qloo-architecture">
            <h2>How Qloo is Used</h2>
            <p>
              Rather than using an LLM to hallucinate architectural specs from unstructured text, Sonic Architecture uses Qloo as a deterministic cultural ground truth through a structured 4-stage pipeline:
            </p>

            <div className="about-steps">
              <div>
                <b>01 / RESOLUTION</b>
                <span>Entity & Tag Extraction</span>
                <p style={{ fontSize: '13px', color: 'var(--quiet)', marginTop: '8px' }}>
                  Resolves named artists, movies, and places against Qloo search APIs, rejecting fuzzy or partial queries.
                </p>
              </div>
              <div>
                <b>02 / CROSS-DOMAIN</b>
                <span>Affinities & Venues</span>
                <p style={{ fontSize: '13px', color: 'var(--quiet)', marginTop: '8px' }}>
                  Queries Qloo cross-domain insights to discover real venues, architectural typologies, and listening rooms frequented by that audience.
                </p>
              </div>
              <div>
                <b>03 / INTERPRETATION</b>
                <span>Deterministic Mapping</span>
                <p style={{ fontSize: '13px', color: 'var(--quiet)', marginTop: '8px' }}>
                  Maps cultural tags to physical materials (board-formed concrete, oak slats, velvet), RT60 reverberation, and color palettes in <code>lib/design/qlooMapping.ts</code>.
                </p>
              </div>
            </div>
          </section>

          <section id="evidence">
            <h2>Honest Provenance & The Fair-Test Rule</h2>
            <p>
              Creative AI applications often obscure what the model decided versus what external intelligence provided. Sonic Architecture enforces complete transparency:
            </p>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="provenance-badge provenance-badge--qloo">● Qloo Live Evidence</span>
                <span style={{ fontSize: '14px', color: 'var(--quiet)' }}>
                  Decisions directly triggered by resolved Qloo entities, tags, or cross-domain venue categories.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="provenance-badge provenance-badge--inferred">● Agent Inferred</span>
                <span style={{ fontSize: '14px', color: 'var(--quiet)' }}>
                  Geometric massing and structural engineering computed to satisfy acoustic RT60 constraints.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="provenance-badge provenance-badge--fallback">● Fallback Mode</span>
                <span style={{ fontSize: '14px', color: 'var(--quiet)' }}>
                  Clearly labelled fallback rules when Qloo returns no matches or connectivity is unavailable.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="provenance-badge provenance-badge--sample">◌ Sample Fixture</span>
                <span style={{ fontSize: '14px', color: 'var(--quiet)' }}>
                  Cached verified sample responses used for instant deterministic cold-runs.
                </span>
              </div>
            </div>
          </section>

          <section id="license">
            <h2>Open Source & License</h2>
            <p>
              Sonic Architecture is open-source software released under the <strong>MIT License</strong>. Built for artists, acoustic engineers, architects, and hackathon judges to study how cultural data can inform spatial environments.
            </p>
            <div className="judge-links" style={{ marginTop: '20px' }}>
              <a
                href="https://github.com/shayspace04/sonic-architecture"
                target="_blank"
                rel="noreferrer"
              >
                GitHub Repository ↗
              </a>
              <Link href="/studio">
                Launch Spatial Studio ↗
              </Link>
            </div>
          </section>
        </div>
      </div>

      <footer className="footer-note">
        <span>SONIC / ARCHITECTURE · MIT LICENSE</span>
        <span>taste to spatial form</span>
        <Link href="#top">back to top ↑</Link>
      </footer>
    </main>
  );
}
