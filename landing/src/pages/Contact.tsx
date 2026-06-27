import Nav from '../components/Nav'
import Footer from '../components/Footer'

export default function Contact() {
  return (
    <div className="subpage">
      <Nav />
      <div className="subpage-hero">
        <div className="subpage-hero-inner">
          <p className="subpage-eyebrow">Get in touch</p>
          <h1 className="subpage-h">Contact</h1>
          <p className="subpage-meta">Pick the right channel and we'll get back to you.</p>
        </div>
      </div>

      <div className="prose-body">
        <div className="prose-inner">
          <div className="contact-grid">
            <a
              href="https://github.com/thecatthatflies/sonar/issues/new?template=bug_report.md"
              className="contact-card"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="contact-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="contact-card-title">Bug report</div>
              <div className="contact-card-desc">
                Found something broken? Open an issue with steps to reproduce and we'll
                investigate.
              </div>
              <span className="contact-card-link">
                GitHub Issues
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M7 7h10v10" />
                </svg>
              </span>
            </a>

            <a
              href="https://github.com/thecatthatflies/sonar/discussions/new?category=ideas"
              className="contact-card"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="contact-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <div className="contact-card-title">Feature requests</div>
              <div className="contact-card-desc">
                Have an idea that would make Sonar better? Share it in Discussions and let
                the community weigh in.
              </div>
              <span className="contact-card-link">
                GitHub Discussions
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M7 7h10v10" />
                </svg>
              </span>
            </a>

            <a
              href="https://github.com/thecatthatflies/sonar"
              className="contact-card"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="contact-card-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </div>
              <div className="contact-card-title">GitHub</div>
              <div className="contact-card-desc">
                Browse the source, contribute a fix, or star the repo to stay up to date
                with releases.
              </div>
              <span className="contact-card-link">
                View on GitHub
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M7 7h10v10" />
                </svg>
              </span>
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
