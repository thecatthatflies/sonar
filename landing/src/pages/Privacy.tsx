import Nav from "../components/Nav";
import Footer from "../components/Footer";

export default function Privacy() {
  return (
    <div className="subpage">
      <Nav />
      <div className="subpage-hero">
        <div className="subpage-hero-inner">
          <p className="subpage-eyebrow">Legal</p>
          <h1 className="subpage-h">Privacy Policy</h1>
          <p className="subpage-meta">Last updated June 2025</p>
        </div>
      </div>

      <div className="prose-body">
        <div className="prose-inner">
          <div className="prose-section">
            <h2>Overview</h2>
            <p>
              Sonar is a local-first application. It runs entirely on your
              machine and does not transmit your port data, process information,
              or network activity to any external server. What happens on your
              machine stays on your machine.
            </p>
          </div>

          <div className="prose-section">
            <h2>Data we do not collect</h2>
            <p>We do not collect, store, or transmit:</p>
            <ul>
              <li>Port or process information from your machine</li>
              <li>Terminal output or commands</li>
              <li>Browser history or web traffic routed through Sonar</li>
              <li>MCP tool calls or AI agent interactions</li>
              <li>
                Crash reports or telemetry (unless you opt in to a future beta
                program)
              </li>
            </ul>
          </div>

          <div className="prose-section">
            <h2>Website analytics</h2>
            <p>
              This website may use privacy-respecting analytics to understand
              aggregate traffic patterns — page views and referral sources only.
              No personal identifiers, no cross-site tracking, no cookies for
              advertising purposes.
            </p>
          </div>

          <div className="prose-section">
            <h2>Third-party services</h2>
            <p>
              Sonar's built-in browser uses the system WebView. Web content you
              load through it is subject to the privacy policies of the sites
              you visit, just as it would be in any browser. Sonar does not
              inspect, log, or modify that traffic.
            </p>
          </div>

          <div className="prose-section">
            <h2>AI integrations</h2>
            <p>
              Sonar's MCP server exposes local port data to AI agents you
              configure — Claude, Cursor, OpenAI, and others. You control which
              agents connect and what they can access. Sonar itself never sends
              data to any AI provider.
            </p>
          </div>

          <div className="prose-section">
            <h2>Changes to this policy</h2>
            <p>
              If we ever introduce features that involve data collection, this
              policy will be updated and the date above will change. Significant
              changes will be announced in the release notes.
            </p>
          </div>

          <div className="prose-section">
            <h2>Contact</h2>
            <p>
              Questions about privacy? <a href="https://github.com/thecatthatflies/sonar/issues" target="_blank" rel="noopener noreferrer">Open a GitHub issue</a>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
