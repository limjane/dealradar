/**
 * Landing page — the live front door. Ports section 1 of the signed-off design
 * (project-docs/mockups/v2-fun-travel.html, D7/D8) plus how-it-works, a deals
 * showcase, and a footer with the affiliate-commission disclosure.
 *
 * Search is presentational for now — live search + real deals land in tasks 4/5.
 * Animated SVG (mascot, sky) is injected raw to keep the signed-off SMIL intact;
 * everything else is plain JSX. Static render → ISR/SEO-friendly.
 */

// Reusable animated symbols: "fire" flame + "Radar" mascot base rig (wing/tail flap SMIL).
const SYMBOLS = `
<symbol id="fire" viewBox="0 0 24 24">
  <path fill="#ff5a1f" d="M12 2C12 2 5 9 5 14.5A7 7 0 0 0 19 14.5C19 9 12 2 12 2Z">
    <animateTransform attributeName="transform" type="rotate" values="-2.5 12 20;2.5 12 20;-2.5 12 20" dur="0.9s" repeatCount="indefinite"/>
  </path>
  <path fill="#ffc94d" d="M12 10.5C12 10.5 8.8 13.4 8.8 15.8A3.2 3.2 0 0 0 15.2 15.8C15.2 13.4 12 10.5 12 10.5Z">
    <animateTransform attributeName="transform" type="rotate" values="3.5 12 18;-3.5 12 18;3.5 12 18" dur="0.6s" repeatCount="indefinite"/>
  </path>
</symbol>
<symbol id="bird-base" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="bodyg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff7a5c"/><stop offset="1" stop-color="#f03e31"/>
    </linearGradient>
  </defs>
  <g>
    <path fill="#e8402f" d="M30 60 C14 50 8 38 12 26 C20 40 30 46 40 50 Z"/>
    <animateTransform attributeName="transform" type="rotate" values="-7 34 56;7 34 56;-7 34 56" dur="0.9s" repeatCount="indefinite"/>
  </g>
  <ellipse cx="62" cy="62" rx="32" ry="28" fill="url(#bodyg)"/>
  <ellipse cx="72" cy="72" rx="17" ry="12" fill="#ffedd0"/>
  <rect x="42" y="40" width="40" height="7" rx="3.5" fill="#231a4f"/>
  <path fill="#ffb648" d="M92 52 L110 58 L92 64 Q95 58 92 52 Z"/>
  <ellipse cx="86" cy="66" rx="4.5" ry="2.8" fill="#ff9d94" opacity=".8"/>
  <circle cx="80" cy="46" r="14" fill="#fff" stroke="#231a4f" stroke-width="4"/>
  <g>
    <path fill="#e8402f" d="M56 56 C40 42 22 42 12 52 C26 56 30 66 44 70 C52 72 58 66 56 56 Z"/>
    <animateTransform attributeName="transform" type="rotate" values="-16 54 58;14 54 58;-16 54 58" dur="0.55s" repeatCount="indefinite"/>
  </g>
</symbol>`;

// Perched "scout" pose (blinks) — the clean, non-buggy pose (avoids the flying-pose eye bug).
const MASCOT = `
<svg class="mascot floaty" viewBox="0 0 120 120" width="96" height="96" role="img" aria-label="Radar, the FareSteal price-scout mascot">
  <use href="#bird-base"/>
  <circle cx="84" cy="48" r="6" fill="#231a4f"/>
  <circle cx="82" cy="46" r="2" fill="#fff"/>
  <circle cx="80" cy="46" r="12.5" fill="#ff7a5c" opacity="0">
    <animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;.85;.9;.95;1" dur="3.8s" repeatCount="indefinite"/>
  </circle>
</svg>`;

// Starfield + drifting clouds behind the hero.
const SKY = `
<svg class="sky" viewBox="0 0 780 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <circle class="star" cx="60" cy="70" r="1.6" fill="#fff"/>
  <circle class="star" style="animation-delay:.4s" cx="180" cy="40" r="1.2" fill="#fff"/>
  <circle class="star" style="animation-delay:.9s" cx="320" cy="90" r="1.4" fill="#fff"/>
  <circle class="star" style="animation-delay:1.3s" cx="700" cy="60" r="1.6" fill="#fff"/>
  <circle class="star" style="animation-delay:1.7s" cx="600" cy="120" r="1.1" fill="#fff"/>
  <circle class="star" style="animation-delay:2.1s" cx="740" cy="160" r="1.3" fill="#fff"/>
  <circle class="star" style="animation-delay:.6s" cx="120" cy="150" r="1.2" fill="#fff"/>
  <circle class="star" style="animation-delay:1.5s" cx="480" cy="45" r="1.5" fill="#fff"/>
  <ellipse class="cloud" cx="90" cy="250" rx="90" ry="26" fill="rgba(255,255,255,.10)"/>
  <ellipse class="cloud" style="animation-delay:2s" cx="700" cy="215" rx="110" ry="30" fill="rgba(255,255,255,.09)"/>
  <ellipse class="cloud" style="animation-delay:4.5s" cx="640" cy="330" rx="150" ry="36" fill="rgba(255,255,255,.07)"/>
</svg>`;

function Flame({ size = 14 }: { size?: number }) {
  return (
    <svg className="flame" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <use href="#fire" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <svg
        width="0"
        height="0"
        style={{ position: "absolute" }}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: SYMBOLS }}
      />

      <main>
        {/* ---------- HERO ---------- */}
        <section className="hero">
          <div dangerouslySetInnerHTML={{ __html: SKY }} />
          <header className="site on-dark" style={{ position: "relative" }}>
            <div className="logo">
              <span className="mark">✈</span>Fare<span style={{ fontWeight: 400 }}>Steal</span>
            </div>
            <nav className="site">
              <a href="#how">How it works</a>
              <a href="#deals" className="pill">
                Today&apos;s deals
              </a>
            </nav>
          </header>

          <div className="hero-inner">
            <div dangerouslySetInnerHTML={{ __html: MASCOT }} />
            <h1>
              Is that flight price
              <br />
              actually{" "}
              <span className="zing">
                a steal?
                <svg viewBox="0 0 120 10" preserveAspectRatio="none">
                  <path
                    d="M2 7 Q 20 1, 40 6 T 80 5 T 118 6"
                    fill="none"
                    stroke="#ffb648"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
            <p className="lead">
              We track fares every day, so you know a good price when you see one.
            </p>

            <div className="searchcard">
              <div className="fields">
                <div className="field">
                  <label>From</label>
                  <input type="text" defaultValue="Singapore (SIN)" aria-label="From" />
                </div>
                <div className="field">
                  <label>To</label>
                  <input type="text" placeholder="Anywhere fun ✨" aria-label="To" />
                </div>
                <div className="field">
                  <label>Depart</label>
                  <input type="text" placeholder="12 Sep" aria-label="Depart" />
                </div>
                <div className="field">
                  <label>Return</label>
                  <input type="text" placeholder="+ Add" aria-label="Return" />
                </div>
              </div>
              <button type="button">Check the price →</button>
            </div>

            <div className="hot-chips">
              <a href="#deals">🗼 Tokyo <b>fr S$312</b></a>
              <a href="#deals">🏝️ Bali <b>fr S$168</b></a>
              <a href="#deals">🇰🇷 Seoul <b>fr S$385</b></a>
              <a href="#deals">🌆 Bangkok <b>fr S$142</b></a>
            </div>

            <div className="trustbar">
              <span>📈 60 days of real price tracking</span>
              <span>🤝 Commission, never a markup</span>
              <span>⚡ Verdict in one search</span>
            </div>
          </div>
        </section>

        {/* ---------- HOW IT WORKS ---------- */}
        <section className="section" id="how">
          <h2>How FareSteal works</h2>
          <p className="sub">Three steps between you and a fare you can trust.</p>
          <div className="steps">
            <div className="step">
              <div className="ico">🔍</div>
              <h3>1 · Search any route</h3>
              <p>
                Tell us where from and where to. We pull fares from Trip.com, Kiwi, Aviasales and
                more — all in one place.
              </p>
            </div>
            <div className="step">
              <div className="ico">📊</div>
              <h3>2 · See the verdict</h3>
              <p>
                We check today&apos;s price against 60 days of tracked history and tell you plainly:
                grab it, fair, or wait.
              </p>
            </div>
            <div className="step">
              <div className="ico">✈️</div>
              <h3>3 · Book with confidence</h3>
              <p>
                Click through to the airline or travel site at their price. We earn a small
                commission — never a markup on you.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- DEALS SHOWCASE ---------- */}
        <section className="deals">
          <div className="section" id="deals">
            <h2>
              Deals from Singapore <Flame size={20} />
            </h2>
            <p className="sub">Fresh fares, checked against 60 days of history.</p>

            <div className="deal-card">
              <div className="dest" style={{ background: "linear-gradient(135deg,#34d399,#0ea5e9)" }}>
                🏝️
              </div>
              <div style={{ flex: 1 }}>
                <span className="badge grab">
                  <Flame /> 41% below normal
                </span>
                <div className="route">SIN → Bali (DPS)</div>
                <div className="when">Nov travel · direct</div>
              </div>
              <div className="p">
                S$168<small>S$285</small>
              </div>
            </div>

            <div className="deal-card">
              <div className="dest" style={{ background: "linear-gradient(135deg,#f472b6,#8b5cf6)" }}>
                🗼
              </div>
              <div style={{ flex: 1 }}>
                <span className="badge grab">
                  <Flame /> 38% below normal
                </span>
                <div className="route">SIN → Tokyo (HND)</div>
                <div className="when">Sep travel · direct</div>
              </div>
              <div className="p">
                S$312<small>S$505</small>
              </div>
            </div>

            <div className="deal-card">
              <div className="dest" style={{ background: "linear-gradient(135deg,#fb923c,#f43f5e)" }}>
                🌸
              </div>
              <div style={{ flex: 1 }}>
                <span className="badge grab">
                  <Flame /> 29% below normal
                </span>
                <div className="route">SIN → Seoul (ICN)</div>
                <div className="when">Oct travel · 1 stop</div>
              </div>
              <div className="p">
                S$385<small>S$540</small>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- FOOTER ---------- */}
        <footer className="site-footer">
          <div className="inner">
            <div className="row1">
              <div className="logo">
                <span className="mark">✈</span>Fare<span style={{ fontWeight: 400 }}>Steal</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                © 2026 FareSteal · Flight price intelligence for Singapore travellers
              </div>
            </div>
            <p className="disc">
              FareSteal compares fares and shows price history. Bookings happen on the airline or
              travel provider&apos;s own website — we may earn a commission from partners, which
              never changes the price you pay. Fares shown are illustrative; always confirm the
              final total on the provider&apos;s site.
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
