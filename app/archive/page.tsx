import type { Metadata } from 'next';
import Link from 'next/link';
import { SonicMark } from '@/components/brand/SonicMark';
import { STARTER_PROMPTS, buildStudioHref } from '@/lib/design-tokens';

export const metadata: Metadata = {
  title: 'World Archive — Sonic Architecture',
  description:
    'Catalog of stored spatial worlds and architectural studies translated from cultural taste signals.',
};

const ARCHIVE_WORLDS = [
  {
    prompt: STARTER_PROMPTS[0], // Miles Davis + Brutalist concrete
    typology: 'Brutalist Listening Room',
    materials: 'Board-formed concrete · Acoustic walnut slats',
    acoustics: 'RT60 0.44s · 4.4m ceiling',
    provenance: 'Qloo live evidence',
  },
  {
    prompt: STARTER_PROMPTS[1], // Aphex Twin + gallery warehouse
    typology: 'Industrial Warehouse',
    materials: 'Polished concrete · Space frame truss · Anodized aluminum',
    acoustics: 'RT60 0.65s · 6.8m ceiling',
    provenance: 'Qloo live evidence',
  },
  {
    prompt: STARTER_PROMPTS[2], // A24 films + indie music
    typology: 'Cinematic Micro-Cinema',
    materials: 'Acoustic dark velvet · Limewash plaster',
    acoustics: 'RT60 0.44s · 3.8m ceiling',
    provenance: 'Qloo live evidence',
  },
  {
    prompt: STARTER_PROMPTS[3], // Japanese Gardens + ambient
    typology: 'Open-Air Engawa Pavilion',
    materials: 'Hinoki cedar · Rice paper shoji · Tatami mats',
    acoustics: 'RT60 0.36s · 3.4m ceiling',
    provenance: 'Qloo live evidence',
  },
  {
    prompt: 'Kavinsky + French electro neon',
    typology: 'Retro-Futurist Listening Bar',
    materials: 'Dark smoked acrylic · Neon accents · Black rubber',
    acoustics: 'RT60 0.50s · 3.8m ceiling',
    provenance: 'Agent inferred',
  },
  {
    prompt: 'Brian Eno + minimal concrete pavilion',
    typology: 'Contemplative Ambient Sanctuary',
    materials: 'Architectural cast concrete · Travertine stone',
    acoustics: 'RT60 0.85s · 4.5m ceiling',
    provenance: 'Agent inferred',
  },
];

export default function ArchivePage() {
  return (
    <main className="sonic-theme font-sans archive-page" id="main-content">
      {/* Navigation */}
      <nav className="site-nav" aria-label="Primary navigation">
        <Link className="wordmark" href="/">
          <SonicMark height={24} aria-hidden="true" className="wordmark-mark" />
          SONIC / ARCHITECTURE
        </Link>
        <div className="nav-links">
          <Link href="/">Home</Link>
          <Link href="/studio">Studio</Link>
          <Link href="/about">About</Link>
          <a
            href="https://github.com/shayspace04/sonic-architecture"
            target="_blank"
            rel="noreferrer"
          >
            GitHub ↗
          </a>
        </div>
      </nav>

      <div className="archive-grid">
        <div className="section-number">ARCHIVE / 02</div>
        <div className="archive-copy">
          <div className="eyebrow">Spatial Index</div>
          <h1>
            Catalog of <em>grounded</em> worlds.
          </h1>
          <p className="lede">
            Each entry in this archive is a synthesized spatial world. Select any world to launch it in the interactive 3D spatial studio workbench with real-time acoustic telemetry, camera presets, and generative soundtracks.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px',
              marginTop: '40px',
            }}
          >
            {ARCHIVE_WORLDS.map((world, idx) => (
              <Link
                key={world.prompt}
                href={buildStudioHref(world.prompt)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '24px',
                  border: '1px solid var(--line)',
                  borderRadius: '1px',
                  background: 'var(--paper-deep)',
                  transition: 'border-color 0.25s var(--ease), background 0.25s var(--ease)',
                }}
                className="archive-card"
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '14px',
                  }}
                >
                  <span className="eyebrow">WORLD / {String(idx + 1).padStart(2, '0')}</span>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--blue)' }}>
                    Launch ↗
                  </span>
                </div>

                <h3
                  style={{
                    margin: '0 0 10px',
                    fontSize: '18px',
                    fontWeight: 600,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.3,
                  }}
                >
                  {world.prompt}
                </h3>

                <div style={{ fontSize: '13px', color: 'var(--quiet)', marginBottom: '8px' }}>
                  <strong>Typology:</strong> {world.typology}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--quiet)', marginBottom: '6px' }}>
                  {world.materials}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--quiet)', marginBottom: '14px' }}>
                  {world.acoustics}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--line-subtle)' }}>
                  <span
                    className={`provenance-badge ${
                      world.provenance.includes('live')
                        ? 'provenance-badge--qloo'
                        : 'provenance-badge--inferred'
                    }`}
                  >
                    ● {world.provenance}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <footer className="footer-note">
        <span>SONIC / ARCHITECTURE · MIT LICENSE</span>
        <span>cataloged worlds / 01—06</span>
        <Link href="#top">back to top ↑</Link>
      </footer>
    </main>
  );
}
