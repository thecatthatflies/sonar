import Nav from "../components/Nav";
import Footer from "../components/Footer";

export default function Terms() {
  return (
    <div className="subpage">
      <Nav />
      <div className="subpage-hero">
        <div className="subpage-hero-inner">
          <p className="subpage-eyebrow">Legal</p>
          <h1 className="subpage-h">Terms of Use</h1>
          <p className="subpage-meta">Last updated June 2025</p>
        </div>
      </div>

      <div className="prose-body">
        <div className="prose-inner">
          <div className="prose-section">
            <h2>Acceptance</h2>
            <p>
              By downloading or using Sonar, you agree to these terms. If you
              don't agree, don't use Sonar.
            </p>
          </div>

          <div className="prose-section">
            <h2>License</h2>
            <p>
              Sonar is provided for personal and commercial use. You may install
              and use it on any machines you own or administer. You may not
              redistribute, resell, or repackage the application without written
              permission.
            </p>
          </div>

          <div className="prose-section">
            <h2>Acceptable use</h2>
            <p>Sonar is a local developer tool. You agree not to use it:</p>
            <ul>
              <li>
                To monitor systems you do not own or have explicit permission to
                monitor
              </li>
              <li>To interfere with others' network services</li>
              <li>In violation of any applicable law or regulation</li>
            </ul>
          </div>

          <div className="prose-section">
            <h2>No warranty</h2>
            <p>
              Sonar is provided "as is" without warranty of any kind. We do not
              guarantee that it will be error-free, uninterrupted, or suitable
              for any particular purpose. Use it at your own risk.
            </p>
          </div>

          <div className="prose-section">
            <h2>Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, we are not liable for any
              indirect, incidental, special, or consequential damages arising
              from your use of Sonar, including data loss or system disruption.
            </p>
          </div>

          <div className="prose-section">
            <h2>Updates</h2>
            <p>
              We may update Sonar and these terms at any time. Continued use
              after an update constitutes acceptance of the revised terms.
            </p>
          </div>

          <div className="prose-section">
            <h2>Contact</h2>
            <p>
              Questions?{" "}
              <a href="mailto:hello@sonar.aiyan.tech">hello@sonar.aiyan.tech</a>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
