import Link from "next/link";
import styles from "./page.module.css";

export default function MarketingPage() {
  return (
    <main className={styles.page}>
      <div className={styles.atmosphere} aria-hidden="true">
        <div className={styles.grid} />
        <div className={styles.grain} />
        <div className={styles.atelier}>
          <div className={styles.canvas}>
            <div className={styles.canvasBody}>
              <div className={styles.mockNav} />
              <div className={styles.mockHero}>
                <div className={styles.mockLine} />
                <div className={styles.mockLineShort} />
                <div className={styles.mockCta} />
              </div>
              <div className={styles.mockBlock} />
              <div className={styles.mockRow} />
            </div>
            <svg
              className={styles.lasso}
              viewBox="0 0 480 340"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                className={styles.lassoPath}
                d="M248 118
                   C286 96, 352 104, 382 136
                   C408 164, 402 218, 364 244
                   C328 268, 268 272, 230 248
                   C200 228, 190 188, 208 154
                   C218 134, 230 122, 248 118 Z"
              />
              <path
                className={styles.lassoDash}
                d="M248 118
                   C286 96, 352 104, 382 136
                   C408 164, 402 218, 364 244
                   C328 268, 268 272, 230 248
                   C200 228, 190 188, 208 154
                   C218 134, 230 122, 248 118 Z"
              />
            </svg>
            <div className={styles.crosshair} />
          </div>
        </div>
        <div className={styles.wash} />
      </div>

      <section className={styles.hero} aria-labelledby="monet-brand">
        <h1 id="monet-brand" className={styles.brand}>
          Monet
        </h1>
        <p className={styles.headline}>Lasso a region. Direct the change.</p>
        <p className={styles.support}>
          Select any patch of a live page — a specialized agent crew applies the
          improvement in place.
        </p>
        <div className={styles.ctaRow}>
          <Link className={styles.ctaPrimary} href="/app">
            Open workspace
          </Link>
          <Link className={styles.ctaGhost} href="/app">
            Try the sample page
          </Link>
        </div>
      </section>
    </main>
  );
}
