import Link from "next/link";
import styles from "./page.module.css";

export default function MarketingPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="monet-brand">
        <h1 id="monet-brand" className={styles.brand}>
          Monet
        </h1>
        <p className={styles.headline}>Lasso a region. Direct the change.</p>
        <p className={styles.support}>
          A precision edit atelier — select any patch of a live page and let a
          specialized agent crew apply the improvement in place.
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
      <div className={styles.wash} aria-hidden="true" />
    </main>
  );
}
