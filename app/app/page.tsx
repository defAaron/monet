import Link from "next/link";
import { PreviewHost, PREVIEW_WIDTH_PX } from "@/components/preview";
import { SampleLanding } from "@/samples/landing";
import { ModeToggle } from "./ModeToggle";
import styles from "./page.module.css";

export default function WorkspacePage() {
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brandBlock}>
          <Link href="/" className={styles.brand}>
            Monet
          </Link>
          <span className={styles.sessionName}>Sample session</span>
        </div>
        <div className={styles.controls}>
          <ModeToggle />
          <button
            type="button"
            className={styles.shareSoon}
            disabled
            title="Coming soon"
          >
            Share
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <aside className={styles.rail} aria-label="Tools">
          <h2 className={styles.railTitle}>Tools</h2>
          <ul className={styles.placeholderList}>
            <li>Rect (S1)</li>
            <li>Freehand (S1)</li>
            <li>Clear</li>
            <li>Undo apply</li>
          </ul>
        </aside>

        <main className={styles.canvas}>
          <div className={styles.canvasMeta}>
            <span>Preview · sample/landing</span>
            <span>{PREVIEW_WIDTH_PX}px fixed</span>
          </div>
          <PreviewHost>
            <SampleLanding />
          </PreviewHost>
        </main>

        <aside className={styles.side} aria-label="Instruct">
          <h2 className={styles.sideTitle}>Instruct</h2>
          <ul className={styles.placeholderList}>
            <li>Selection facts (S2)</li>
            <li>Instruction input (S2)</li>
            <li>Stage rail (S3)</li>
            <li>Apply / Undo (S3)</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
