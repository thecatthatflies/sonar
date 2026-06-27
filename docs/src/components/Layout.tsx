import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { docs, getDocBySlug } from "../docs";

export default function Layout() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const contentRef = useRef<HTMLElement>(null);

  const doc = slug ? getDocBySlug(slug) : undefined;

  useEffect(() => {
    if (slug && !doc && docs.length > 0) {
      navigate(`/${docs[0].slug}`, { replace: true });
    }
  }, [slug, doc, navigate]);

  // Scroll to top on doc change
  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
  }, [slug]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [slug]);

  if (!doc) return null;

  return (
    <div className="layout">
      <header className="nav">
        <div className="nav-inner">
          <a
            href="https://sonar.aiyan.tech"
            className="nav-logo"
            aria-label="Sonar home"
          >
            <img src="/icons/logo-96.png" alt="" width="22" height="22" />
            <span>Sonar</span>
          </a>
          <span className="nav-sep" aria-hidden="true">
            /
          </span>
          <span className="nav-section">Docs</span>
          <div className="nav-right">
            <a href="https://sonar.aiyan.tech" className="nav-home">
              ← sonar.aiyan.tech
            </a>
            <a
              href="https://github.com/thecatthatflies/sonar"
              className="nav-gh"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub repository"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
          </div>
          <button
            className="menu-btn"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? "Close menu" : "Open menu"}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <line x1="2" y1="2" x2="14" y2="14" />
                <line x1="14" y1="2" x2="2" y2="14" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <line x1="1" y1="4" x2="15" y2="4" />
                <line x1="1" y1="8" x2="15" y2="8" />
                <line x1="1" y1="12" x2="15" y2="12" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="body">
        <aside
          className={`sidebar${sidebarOpen ? " open" : ""}`}
          aria-label="Documentation navigation"
        >
          <nav>
            <p className="sidebar-label">On this site</p>
            <ul role="list">
              {docs.map((d) => (
                <li key={d.slug}>
                  <Link
                    to={`/${d.slug}`}
                    className={`sidebar-link${d.slug === slug ? " active" : ""}`}
                  >
                    {d.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="content" ref={contentRef}>
          <article
            className="prose"
            dangerouslySetInnerHTML={{ __html: doc.html }}
          />
          <footer className="doc-footer">
            <a
              href={`https://github.com/thecatthatflies/sonar/edit/main/docs/content/${slug}.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="edit-link"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit on GitHub
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
}
