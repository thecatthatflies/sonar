import { useEffect } from 'react'
import Nav from '../components/Nav'
import Footer from '../components/Footer'

const agents = [
  {
    name: 'Claude',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2L6 18h2.8l1.2-4.5 1.2 4.5H14L10 2z" opacity="0.5" />
        <path d="M10 2L13.5 12H11l-1-3.5L9 12H6.5L10 2z" />
      </svg>
    ),
  },
  {
    name: 'Claude Code',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7l3.5 3.5L4 14" />
        <path d="M10 14h6" />
        <rect x="1.5" y="2.5" width="17" height="15" rx="2.5" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    name: 'Cursor',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M4 2.5l11.5 7.5-6 1.5-2.5 6L4 2.5z" />
      </svg>
    ),
  },
  {
    name: 'OpenAI',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <circle cx="10" cy="10" r="2" />
        <path d="M10 2v3M10 15v3M2 10h3M15 10h3M4.22 4.22l2.12 2.12M13.66 13.66l2.12 2.12M4.22 15.78l2.12-2.12M13.66 6.34l2.12-2.12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    name: 'Gemini CLI',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 1.5C10 1.5 11.8 8.2 18.5 10C11.8 11.8 10 18.5 10 18.5C10 18.5 8.2 11.8 1.5 10C8.2 8.2 10 1.5 10 1.5Z" />
      </svg>
    ),
  },
  {
    name: 'v0',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 5.5l3.5 9" />
        <circle cx="14" cy="10" r="4" />
      </svg>
    ),
  },
  {
    name: 'Lovable',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 16.5l-1.5-1.4C4.5 11.4 2 9.2 2 6.5A4.3 4.3 0 016.3 2.2c1.4 0 2.8.7 3.7 1.8.9-1.1 2.3-1.8 3.7-1.8A4.3 4.3 0 0118 6.5c0 2.7-2.5 4.9-6.5 8.6L10 16.5z" />
      </svg>
    ),
  },
]

export default function Home() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.reveal')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            observer.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <Nav />

      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              Real-time port intelligence
            </div>
            <h1 className="hero-h1">
              Every port.<br />
              <em>One window.</em>
            </h1>
            <p className="hero-sub">
              Sonar watches every local port on your machine in real time.
              Built-in browser, terminal, and MCP server for AI agents.
            </p>
            <div className="hero-ctas">
              <a href="#download" className="btn-dark">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download for macOS
              </a>
              <a href="https://github.com/ai-hyyan/sonar" className="btn-outline" target="_blank" rel="noopener noreferrer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                View on GitHub
              </a>
            </div>
          </div>

          <div className="hero-right">
            <div className="hero-card hero-card-dark">
              <div className="port-ui-header">
                <div className="port-ui-dots">
                  <span className="port-ui-dot r" />
                  <span className="port-ui-dot y" />
                  <span className="port-ui-dot g" />
                </div>
                <span className="port-ui-title">Sonar</span>
                <span className="port-badge-live">● Live</span>
              </div>
              <div className="port-list-ui">
                {[
                  { port: '3000', proc: 'next.js', sub: 'node' },
                  { port: '5173', proc: 'vite', sub: 'node', active: true },
                  { port: '8080', proc: 'api-server', sub: 'go' },
                  { port: '5432', proc: 'postgres', sub: 'db' },
                  { port: '6379', proc: 'redis', sub: 'cache' },
                ].map(({ port, proc, sub, active }) => (
                  <div key={port} className={`port-row${active ? ' active-row' : ''}`}>
                    <span className="port-dot" />
                    <span className="port-num-ui">{port}</span>
                    <span className="port-proc">{proc} <span>{sub}</span></span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hero-card hero-card-light">
              <img src="/screenshots/app-browser2.webp" alt="Built-in browser" />
              <div className="hero-card-light-body">
                <div className="hero-card-light-label">Built-in browser</div>
                <div className="hero-card-light-text">Open any port instantly</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Editorial ────────────────────────────────────────────────── */}
      <section className="editorial">
        <div className="editorial-inner reveal">
          <div className="editorial-left">
            <span className="editorial-eyebrow">Built different</span>
            <h2 className="editorial-h">
              No tabs.<br />
              <em>No chaos.</em>
            </h2>
          </div>
          <img
            src="/screenshots/app-ports-crop.webp"
            alt="Sonar port panel"
            className="editorial-img"
          />
        </div>
      </section>

      {/* ─── Features bento ───────────────────────────────────────────── */}
      <section className="features">
        <div className="container">
          <p className="section-eyebrow reveal">Features</p>
          <h2 className="section-h reveal reveal-d1">Everything your stack needs.</h2>
          <div className="bento">
            {/* Ports */}
            <div className="bento-cell ports reveal">
              <span className="cell-tag">Ports</span>
              <h3 className="cell-h">Real-time port monitoring</h3>
              <p className="cell-p">
                Every port on your machine, live. Process names, PIDs, protocols — all in one
                glanceable list. No more digging through netstat.
              </p>
              <div className="mini-port-list">
                <div className="mini-port-header">
                  <span className="mini-port-title">Active ports</span>
                  <span className="mini-port-live">
                    <span className="mini-live-dot" /> Live
                  </span>
                </div>
                <div className="mini-port-rows">
                  {[
                    { n: '3000', p: 'next.js', l: 'HTTP' },
                    { n: '5173', p: 'vite dev', l: 'HTTP' },
                    { n: '8080', p: 'api-server', l: 'HTTP' },
                    { n: '5432', p: 'postgres', l: 'TCP' },
                    { n: '6379', p: 'redis', l: 'TCP' },
                  ].map(({ n, p, l }) => (
                    <div key={n} className="mini-port-row">
                      <span className="mpd" />
                      <span className="mpn">{n}</span>
                      <span className="mpp">{p}</span>
                      <span className="mpl">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Browser */}
            <div className="bento-cell browser reveal reveal-d1">
              <span className="cell-tag">Browser</span>
              <h3 className="cell-h">Built-in browser</h3>
              <p className="cell-p">
                Click any port to open it in a full browser — tabs, devtools, everything.
                No switching windows.
              </p>
              <div className="cell-screenshot">
                <img src="/screenshots/app-browser2.webp" alt="Built-in browser" />
              </div>
            </div>

            {/* Terminal */}
            <div className="bento-cell terminal reveal">
              <span className="cell-tag">Terminal</span>
              <div className="terminal-body">
                <div className="terminal-text">
                  <h3 className="cell-h">Integrated terminal</h3>
                  <p className="cell-p">
                    A full terminal lives right next to your ports. Run commands, kill processes,
                    and restart services — without ever leaving Sonar. Use any shell you want.
                    Pipe output to files, tail logs in real time, or run one-off debug commands
                    right from the panel that already shows you what's running. Zero context switching.
                  </p>
                </div>
                <div className="cell-screenshot terminal-screenshot">
                  <img src="/screenshots/app-terminal.webp" alt="Integrated terminal" />
                </div>
              </div>
            </div>

            {/* AI */}
            <div className="bento-cell ai reveal reveal-d1">
              <span className="cell-tag">AI</span>
              <h3 className="cell-h">MCP server for AI agents</h3>
              <p className="cell-p">
                Sonar ships an MCP server that lets AI agents discover, inspect, and interact
                with your local services — no config, just connect.
              </p>
              <div className="ai-logo-row">
                {agents.map(({ name, icon }) => (
                  <div key={name} className="ai-logo-wrap">
                    <div className="ai-logo-item">{icon}</div>
                    <span className="ai-tooltip">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Manifesto ────────────────────────────────────────────────── */}
      <section className="manifesto">
        <div className="manifesto-inner reveal">
          <div className="manifesto-aside">
            <p>
              Your ports, processes, and code never leave your machine. Sonar runs entirely
              local — no cloud sync, no telemetry, no subscriptions. Just a fast, private
              window into your dev environment.
            </p>
            <p>
              Most dev tools phone home. Sonar doesn't. There's no account to create, no
              dashboard to log into, no data piped to a third-party analytics service.
              What you build stays between you and your machine.
            </p>
            <p>
              This isn't a privacy policy promise. It's the architecture. When there's no
              network request to make, there's nothing to leak.
            </p>
          </div>
          <div className="manifesto-right">
            <span className="manifesto-star">✦</span>
            <div className="manifesto-text">
              <em>Local-first.</em>
              <br />
              <span className="line-orange">Zero data.</span>
              <br />
              All yours.
            </div>
          </div>
        </div>
      </section>

      {/* ─── Download ─────────────────────────────────────────────────── */}
      <section className="download" id="download">
        <div className="download-inner">
          <h2 className="download-h reveal">Download Sonar</h2>
          <p className="download-sub reveal reveal-d1">Free. No account required.</p>
          <div className="download-cards">
            {/* macOS */}
            <div className="dl-card reveal">
              <span className="dl-version">v1</span>
              <div className="dl-os-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
              </div>
              <div className="dl-os-name">macOS</div>
              <div className="dl-os-arch">Apple Silicon · Intel</div>
              <div className="dl-buttons">
                <a href="https://github.com/ai-hyyan/sonar/releases/latest/download/Sonar_aarch64.dmg" className="dl-btn">
                  <span>Apple Silicon</span>
                  <span className="dl-ext">.dmg</span>
                </a>
                <a href="https://github.com/ai-hyyan/sonar/releases/latest/download/Sonar_x64.dmg" className="dl-btn-outline">
                  <span>Intel</span>
                  <span className="dl-ext">.dmg</span>
                </a>
              </div>
            </div>

            {/* Linux */}
            <div className="dl-card reveal reveal-d1">
              <span className="dl-version">v1</span>
              <div className="dl-os-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a3.5 3.5 0 1 0 0 7A3.5 3.5 0 0 0 12 2zm0 8c-3.31 0-6 2.24-6 5 0 1.46.64 2.78 1.67 3.72C7.24 19.51 7 20.23 7 21h10c0-.77-.24-1.49-.67-2.28C17.36 17.78 18 16.46 18 15c0-2.76-2.69-5-6-5z" />
                </svg>
              </div>
              <div className="dl-os-name">Linux</div>
              <div className="dl-os-arch">x86_64 · ARM64</div>
              <div className="dl-buttons">
                <a href="https://github.com/ai-hyyan/sonar/releases/latest/download/Sonar_x86_64.AppImage" className="dl-btn">
                  <span>x86_64</span>
                  <span className="dl-ext">.AppImage</span>
                </a>
                <a href="https://github.com/ai-hyyan/sonar/releases/latest/download/Sonar_aarch64.AppImage" className="dl-btn-outline">
                  <span>ARM64</span>
                  <span className="dl-ext">.AppImage</span>
                </a>
              </div>
            </div>

            {/* Windows */}
            <div className="dl-card dl-soon reveal reveal-d2">
              <div className="dl-os-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M0 3.5 9.9 2.1v9.4H0zM11 1.9 24 0v11.5H11zM0 12.6h9.9v9.4L0 20.6zM11 12.6H24V24L11 22.1z" />
                </svg>
              </div>
              <div className="dl-os-name">Windows</div>
              <div className="dl-os-arch">x86_64</div>
              <div className="dl-buttons">
                <div className="dl-soon-label">Coming soon — stay tuned</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
