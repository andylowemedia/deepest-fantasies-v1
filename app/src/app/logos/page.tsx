import {
  Great_Vibes,
  Cormorant_Garamond,
  Cinzel,
  Italianno,
  Dancing_Script,
  Tangerine,
  Cormorant_SC,
  Playfair_Display,
} from "next/font/google";
import styles from "./page.module.css";

const greatVibes = Great_Vibes({ weight: "400", subsets: ["latin"], variable: "--font-great-vibes" });
const cormorant = Cormorant_Garamond({ weight: ["300", "400", "500", "700"], subsets: ["latin"], variable: "--font-cormorant" });
const cinzel = Cinzel({ weight: ["400", "700", "900"], subsets: ["latin"], variable: "--font-cinzel" });
const italianno = Italianno({ weight: "400", subsets: ["latin"], variable: "--font-italianno" });
const dancing = Dancing_Script({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-dancing" });
const tangerine = Tangerine({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-tangerine" });
const cormorantSC = Cormorant_SC({ weight: ["400", "500", "700"], subsets: ["latin"], variable: "--font-cormorant-sc" });
const playfair = Playfair_Display({ weight: ["400", "700", "900"], subsets: ["latin"], variable: "--font-playfair-test" });

interface LogoBlockProps {
  number: number;
  name: string;
  description: string;
  children: React.ReactNode;
}

function LogoBlock({ number, name, description, children }: LogoBlockProps) {
  return (
    <article className={styles.block}>
      <header className={styles.blockHeader}>
        <span className={styles.number}>{String(number).padStart(2, "0")}</span>
        <div>
          <h3 className={styles.blockName}>{name}</h3>
          <p className={styles.blockDesc}>{description}</p>
        </div>
      </header>
      <div className={styles.logoStage}>{children}</div>
    </article>
  );
}

// Reusable feminine silhouette — abstract back view with hourglass profile
function FemaleSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 140" className={className} aria-hidden="true">
      <path
        d="
          M 30,4
          C 23,4 22,16 26,21
          C 18,24 16,34 22,40
          C 13,44 12,58 19,64
          C 14,70 12,84 18,94
          C 22,104 21,118 24,134
          L 36,134
          C 39,118 38,104 42,94
          C 48,84 46,70 41,64
          C 48,58 47,44 38,40
          C 44,34 42,24 34,21
          C 38,16 37,4 30,4 Z
        "
        fill="currentColor"
      />
    </svg>
  );
}

// A side-profile silhouette (curve view — hip, waist, bust)
function SideCurveSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 140" className={className} aria-hidden="true">
      <path
        d="
          M 50,4
          C 42,4 40,14 44,20
          C 50,22 50,28 48,32
          C 56,38 60,50 52,58
          C 62,66 64,82 50,90
          C 60,98 60,118 56,134
          L 38,134
          C 36,118 38,98 42,90
          C 30,84 28,68 36,60
          C 32,52 36,40 42,32
          C 38,28 40,22 44,20
          C 48,14 50,8 50,4 Z
        "
        fill="currentColor"
      />
    </svg>
  );
}

export default function LogosPage() {
  return (
    <div
      className={`${greatVibes.variable} ${cormorant.variable} ${cinzel.variable} ${italianno.variable} ${dancing.variable} ${tangerine.variable} ${cormorantSC.variable} ${playfair.variable}`}
    >
      <div className="container">

        {/* Intro */}
        <div className={styles.intro}>
          <h1 className={styles.pageTitle}>Logo Concepts</h1>
          <p className={styles.pageSubtitle}>
            Erotic-artistic directions in the spirit of the silhouette and shower
            photography in the gallery.
          </p>
        </div>

        {/* === Section: Artistic / Erotic === */}
        <h2 className={styles.sectionTitle}>Artistic — Erotic</h2>
        <div className={styles.grid}>

          {/* 01 — Backlit Doorway */}
          <LogoBlock
            number={1}
            name="Doorway"
            description="A backlit silhouette in a glowing vertical doorway — the hero image as a mark"
          >
            <div className={styles.doorwayRow}>
              <div className={styles.doorway}>
                <FemaleSilhouette className={styles.doorwayFigure} />
              </div>
              <div className={styles.doorwayText}>
                <span className={`${styles.cormorant} ${styles.spacedSm} ${styles.italic}`}>Deepest</span>
                <span className={`${styles.cinzel} ${styles.spacedMd} gradient-text`}>FANTASIES</span>
              </div>
            </div>
          </LogoBlock>

          {/* 02 — Lipstick Streak Across Wordmark */}
          <LogoBlock
            number={2}
            name="Lipstick Swipe"
            description="A streak of red across the wordmark — like a kiss left on glass"
          >
            <div className={styles.lipstickStage}>
              <span className={`${styles.playfairLogo}`}>Deepest Fantasies</span>
              <span className={styles.lipstickSwipe} aria-hidden="true" />
            </div>
          </LogoBlock>

          {/* 03 — Steam / Wet Glass */}
          <LogoBlock
            number={3}
            name="Steam"
            description="The wordmark behind condensation — clear where a finger wiped, foggy everywhere else"
          >
            <div className={styles.steamStage}>
              <span className={`${styles.steamBlur} ${styles.cormorant}`}>Deepest Fantasies</span>
              <span className={`${styles.steamSharp} ${styles.cormorant}`}>Deepest Fantasies</span>
            </div>
          </LogoBlock>

          {/* 04 — Mirror Reflection */}
          <LogoBlock
            number={4}
            name="Reflection"
            description="The wordmark mirrored below as if reflected in dark water"
          >
            <div className={styles.mirrorStage}>
              <span className={`${styles.italianno} ${styles.mirrorMain}`}>Deepest Fantasies</span>
              <span className={`${styles.italianno} ${styles.mirrorRefl}`} aria-hidden="true">Deepest Fantasies</span>
            </div>
          </LogoBlock>

          {/* 05 — Window Cutout */}
          <LogoBlock
            number={5}
            name="Window"
            description="Negative-space silhouette cut from a tall window — purple glow leaks through"
          >
            <div className={styles.windowRow}>
              <div className={styles.windowFrame}>
                <div className={styles.windowGlow} />
                <FemaleSilhouette className={styles.windowFigure} />
              </div>
              <div className={styles.windowText}>
                <span className={`${styles.cormorant} ${styles.italic} ${styles.windowEyebrow}`}>a gallery of</span>
                <span className={`${styles.cinzelBlack} ${styles.spacedLg}`}>DEEPEST<br />FANTASIES</span>
              </div>
            </div>
          </LogoBlock>

          {/* 06 — Body Curve Flourish */}
          <LogoBlock
            number={6}
            name="Curve"
            description="A single sensual S-curve sweeps beneath the wordmark like a flourish"
          >
            <div className={styles.curveStage}>
              <span className={`${styles.italianno} ${styles.curveText}`}>Deepest Fantasies</span>
              <svg viewBox="0 0 320 40" className={styles.curveLine} aria-hidden="true">
                <defs>
                  <linearGradient id="curveStroke" x1="0" x2="1">
                    <stop offset="0%" stopColor="transparent" />
                    <stop offset="20%" stopColor="#a855f7" />
                    <stop offset="50%" stopColor="#ec4899" />
                    <stop offset="80%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                </defs>
                <path
                  d="M 10,20 Q 60,4 110,20 Q 160,38 210,20 Q 260,4 310,20"
                  stroke="url(#curveStroke)"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </LogoBlock>

          {/* 07 — Whisper Fade */}
          <LogoBlock
            number={7}
            name="Whisper"
            description="The wordmark fading at the edges like breath dispersing across glass"
          >
            <span className={`${styles.whisperText} ${styles.cormorant} ${styles.spacedXl}`}>
              DEEPEST FANTASIES
            </span>
          </LogoBlock>

          {/* 08 — Rim Light Silhouette */}
          <LogoBlock
            number={8}
            name="Rim Light"
            description="A side-profile silhouette outlined in a single hot rim light beside the wordmark"
          >
            <div className={styles.rimRow}>
              <SideCurveSilhouette className={styles.rimFigure} />
              <div className={styles.rimText}>
                <span className={`${styles.italianno} ${styles.rimMain}`}>Deepest</span>
                <span className={`${styles.cinzel} ${styles.spacedMd}`}>FANTASIES</span>
              </div>
            </div>
          </LogoBlock>

          {/* 09 — Two Silhouettes Embrace */}
          <LogoBlock
            number={9}
            name="Embrace"
            description="Two silhouettes intertwined — the wordmark below in elegant script"
          >
            <div className={styles.embraceColumn}>
              <svg viewBox="0 0 120 110" className={styles.embraceFigs} aria-hidden="true">
                <defs>
                  <linearGradient id="embraceGrad" x1="0" x2="1">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
                <path
                  d="M 38,8 C 32,8 30,18 33,22 C 27,26 24,38 30,44 C 22,50 24,68 34,76 C 30,86 32,98 36,108 L 48,108 C 50,98 52,90 60,86 C 68,90 70,98 72,108 L 84,108 C 88,98 90,86 86,76 C 96,68 98,50 90,44 C 96,38 93,26 87,22 C 90,18 88,8 82,8 C 76,8 74,18 77,22 C 71,26 68,34 70,40 C 66,42 62,44 60,46 C 58,44 54,42 50,40 C 52,34 49,26 43,22 C 46,18 44,8 38,8 Z"
                  fill="url(#embraceGrad)"
                  opacity="0.95"
                />
              </svg>
              <span className={`${styles.italianno} ${styles.embraceText}`}>Deepest Fantasies</span>
            </div>
          </LogoBlock>

          {/* 10 — Stroke of Heat */}
          <LogoBlock
            number={10}
            name="Stroke of Heat"
            description="A single warm horizontal beam slices through the wordmark — dawn light through curtains"
          >
            <div className={styles.heatStage}>
              <div className={styles.heatBeam} aria-hidden="true" />
              <span className={`${styles.cinzelBlack} ${styles.spacedLg} ${styles.heatText}`}>
                DEEPEST FANTASIES
              </span>
            </div>
          </LogoBlock>
        </div>

        {/* === Section: Wordmark Studies === */}
        <h2 className={styles.sectionTitle}>Wordmark Studies</h2>
        <div className={styles.grid}>

          {/* Current */}
          <LogoBlock
            number={11}
            name="Current"
            description="The existing Playfair gradient wordmark, for comparison"
          >
            <span className={`${styles.current} gradient-text`}>Deepest Fantasies</span>
          </LogoBlock>

          {/* Pure Script */}
          <LogoBlock
            number={12}
            name="Pure Script"
            description="No icon, no fuss — a sweeping handwritten signature"
          >
            <span className={`${styles.tangerine} gradient-text`}>Deepest Fantasies</span>
          </LogoBlock>

          {/* Editorial Masthead */}
          <LogoBlock
            number={13}
            name="Editorial"
            description="A magazine masthead with kicker and ultra-wide letter-spacing"
          >
            <div className={styles.editorialColumn}>
              <span className={styles.editorialKicker}>— A GALLERY OF —</span>
              <span className={`${styles.cinzelBlack} ${styles.spacedUltra}`}>
                DEEPEST<br />FANTASIES
              </span>
            </div>
          </LogoBlock>

          {/* Stacked */}
          <LogoBlock
            number={14}
            name="Stacked Serif"
            description="DEEPEST stacked above FANTASIES with a thin gradient divider"
          >
            <div className={styles.stackedColumn}>
              <span className={`${styles.cinzelBlack} gradient-text ${styles.stackTop}`}>DEEPEST</span>
              <span className={styles.stackDivider} />
              <span className={`${styles.cinzelBlack} gradient-text ${styles.stackBottom}`}>FANTASIES</span>
            </div>
          </LogoBlock>
        </div>

      </div>
    </div>
  );
}