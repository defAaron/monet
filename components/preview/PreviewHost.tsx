import type { ReactNode } from "react";
import styles from "./PreviewHost.module.css";

export const PREVIEW_WIDTH_PX = 960;

interface PreviewHostProps {
  children: ReactNode;
  width?: number;
}

/** Fixed-width preview frame with the TRD-required `#monet-preview-root`. */
export function PreviewHost({
  children,
  width = PREVIEW_WIDTH_PX,
}: PreviewHostProps) {
  return (
    <div
      className={styles.host}
      style={{ ["--monet-preview-width" as string]: `${width}px` }}
    >
      <div id="monet-preview-root" className={styles.root} data-monet-preview-root>
        {children}
      </div>
    </div>
  );
}
