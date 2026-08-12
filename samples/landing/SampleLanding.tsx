import styles from "./SampleLanding.module.css";

/** Intentionally imperfect demo page with known issues for the pitch spine. */
export function SampleLanding() {
  return (
    <div className={styles.root}>
      <header className={styles.nav}>
        <div className={styles.logo}>Harborleaf</div>
        <nav aria-label="Primary">
          <ul className={styles.navLinks} data-monet-id="primary-nav">
            <li>
              <a href="#product">Product</a>
            </li>
            <li>
              <a href="#pricing">Pricing</a>
            </li>
            <li>
              <a href="#customers">Customers</a>
            </li>
            <li>
              <a href="#docs">Docs</a>
            </li>
            <li>
              <a href="#blog">Blog</a>
            </li>
            <li>
              <a href="#careers">Careers</a>
            </li>
            <li>
              <button type="button">Sign in</button>
            </li>
            <li>
              <button type="button" className={styles.navCta}>
                Start free
              </button>
            </li>
            <li>
              <button type="button" className={styles.navCta}>
                Book demo
              </button>
            </li>
          </ul>
        </nav>
      </header>

      <section className={styles.hero}>
        <p className={styles.kicker}>Operations for growing teams</p>
        <h1>Ship clearer work without the busywork</h1>
        <p>
          Harborleaf helps teams coordinate launches, approvals, and status —
          but a few surfaces still need a sharper hierarchy.
        </p>
        <div className={styles.heroActions}>
          <button type="button" className={styles.heroCta} data-monet-id="hero-cta">
            Get started
          </button>
          <button type="button" className={styles.heroSecondary}>
            See how it works
          </button>
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="signup-heading">
        <h2 id="signup-heading">Join the early list</h2>
        <p>Leave your email — we will send a quiet monthly note.</p>
        <form className={styles.form} data-monet-id="signup-form" action="#">
          <div className={styles.field}>
            <label htmlFor="signup-name">Name</label>
            <input id="signup-name" name="name" autoComplete="name" />
          </div>
          <div className={styles.field}>
            <label htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
            />
          </div>
          <button type="submit" className={styles.submit}>
            Join waitlist
          </button>
        </form>
      </section>
    </div>
  );
}
