"use client";

import type { ReactNode } from "react";
import type {
  RegionColorFact,
  RegionContrastFact,
  RegionFacts,
  RegionFontFact,
} from "@/lib/schemas";
import styles from "./FactsPanel.module.css";

export interface FactsPanelProps {
  /** Scout output for the active selection; null/undefined = empty state. */
  facts: RegionFacts | null | undefined;
  className?: string;
  /** Optional slot below facts — reserved for S2-E instruct input/chips. */
  children?: ReactNode;
}

function formatRatio(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

function formatContrast(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}

function fontLabel(font: RegionFontFact): string {
  const parts: string[] = [];
  if (font.family) parts.push(font.family);
  if (font.sizePx != null) parts.push(`${Math.round(font.sizePx)}px`);
  if (font.weight != null) parts.push(`${font.weight}`);
  return parts.length > 0 ? parts.join(" · ") : "Unknown";
}

function ColorSwatches({ colors }: { colors: RegionColorFact[] }) {
  if (colors.length === 0) {
    return <p className={styles.muted}>No color samples</p>;
  }

  return (
    <ul className={styles.swatchList} aria-label="Dominant colors">
      {colors.slice(0, 6).map((color) => (
        <li key={`${color.hex}-${color.ratio}`} className={styles.swatchItem}>
          <span
            className={styles.swatch}
            style={{ backgroundColor: color.hex }}
            title={color.hex}
            aria-hidden
          />
          <span className={styles.swatchMeta}>
            <code className={styles.hex}>{color.hex}</code>
            <span className={styles.ratio}>{formatRatio(color.ratio)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function ContrastRows({ contrast }: { contrast: RegionContrastFact[] }) {
  if (contrast.length === 0) {
    return <p className={styles.muted}>No contrast pairs detected</p>;
  }

  return (
    <ul className={styles.contrastList} aria-label="Contrast pairs">
      {contrast.slice(0, 4).map((pair, index) => (
        <li
          key={`${pair.foreground}-${pair.background}-${index}`}
          className={styles.contrastItem}
        >
          <span className={styles.pairSwatches} aria-hidden>
            <span
              className={styles.pairChip}
              style={{ backgroundColor: pair.foreground }}
            />
            <span
              className={styles.pairChip}
              style={{ backgroundColor: pair.background }}
            />
          </span>
          <span className={styles.contrastMeta}>
            <span className={styles.contrastRatio}>
              {formatContrast(pair.ratio)}
            </span>
            <span
              className={pair.passAA ? styles.pass : styles.fail}
              title={pair.passAA ? "WCAG AA pass" : "WCAG AA fail"}
            >
              {pair.passAA ? "AA" : "Fail"}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Lightweight Scout facts chrome (S2-D).
 * Shows ≥3 signals: colors, contrast, interactive count (+ fonts when present).
 * Pass `facts` from store / scouting so S2-F can wire without coupling.
 */
export function FactsPanel({ facts, className, children }: FactsPanelProps) {
  const rootClass = className ? `${styles.root} ${className}` : styles.root;

  if (!facts) {
    return (
      <section className={rootClass} aria-label="Region facts">
        <header className={styles.header}>
          <h3 className={styles.title}>Facts</h3>
          <p className={styles.subtitle}>Scout</p>
        </header>
        <p className={styles.empty}>
          Confirm a selection to see colors, contrast, and interactive targets.
        </p>
        {children}
      </section>
    );
  }

  const contrast = facts.contrast ?? [];
  const fonts = facts.fonts ?? [];
  const targets = facts.targetIds ?? [];

  return (
    <section className={rootClass} aria-label="Region facts">
      <header className={styles.header}>
        <h3 className={styles.title}>Facts</h3>
        <p className={styles.subtitle}>Scout</p>
      </header>

      <dl className={styles.signals}>
        <div className={styles.signal}>
          <dt className={styles.label}>Colors</dt>
          <dd className={styles.value}>
            <ColorSwatches colors={facts.colors} />
          </dd>
        </div>

        <div className={styles.signal}>
          <dt className={styles.label}>Contrast</dt>
          <dd className={styles.value}>
            <ContrastRows contrast={contrast} />
          </dd>
        </div>

        <div className={styles.signal}>
          <dt className={styles.label}>Interactive</dt>
          <dd className={styles.value}>
            <p className={styles.statLine}>
              <span className={styles.stat}>
                <strong>{facts.interactiveCount}</strong> controls
              </span>
              <span className={styles.statSep} aria-hidden>
                ·
              </span>
              <span className={styles.stat}>
                <strong>{facts.linkCount}</strong> links
              </span>
            </p>
            {targets.length > 0 ? (
              <ul className={styles.targetList} aria-label="Target ids">
                {targets.slice(0, 4).map((id) => (
                  <li key={id}>
                    <code className={styles.targetId}>{id}</code>
                  </li>
                ))}
              </ul>
            ) : null}
          </dd>
        </div>

        {fonts.length > 0 ? (
          <div className={styles.signal}>
            <dt className={styles.label}>Type</dt>
            <dd className={styles.value}>
              <ul className={styles.fontList}>
                {fonts.slice(0, 3).map((font, index) => (
                  <li key={`${fontLabel(font)}-${index}`}>{fontLabel(font)}</li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}

        {facts.textSample ? (
          <div className={styles.signal}>
            <dt className={styles.label}>Text</dt>
            <dd className={styles.value}>
              <p className={styles.textSample}>“{facts.textSample}”</p>
            </dd>
          </div>
        ) : null}
      </dl>

      {/* S2-E: mount instruct input / chips here via children */}
      {children}
    </section>
  );
}
