"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const SEMITONES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

type LayoutName = "qwerty" | "azerty";

type PianoKey = {
  note: string;
  octave: number;
  label: string;
  isSharp: boolean;
  order: number;
  whiteIndex: number;
};

const KEYMAPS: Record<LayoutName, string[]> = {
  qwerty: [
    "z",
    "s",
    "x",
    "d",
    "c",
    "v",
    "g",
    "b",
    "h",
    "n",
    "j",
    "m",
    "q",
    "2",
    "w",
    "3",
    "e",
    "r",
    "5",
    "t",
    "6",
    "y",
    "7",
    "u",
  ],
  azerty: [
    "w",
    "s",
    "x",
    "d",
    "c",
    "v",
    "g",
    "b",
    "h",
    "n",
    "j",
    "m",
    "a",
    "2",
    "z",
    "3",
    "e",
    "r",
    "5",
    "t",
    "6",
    "y",
    "7",
    "u",
  ],
};

const MIN_OCTAVE = 1;
const MAX_OCTAVE = 6;
const ACTIVE_DURATION_MS = 180;

function buildKeys(baseOctave: number): PianoKey[] {
  const keys: PianoKey[] = [];
  let whiteIndex = 0;

  for (let octave = baseOctave; octave < baseOctave + 2; octave += 1) {
    SEMITONES.forEach((semitone, idx) => {
      const isSharp = semitone.includes("#");
      if (!isSharp) {
        whiteIndex += 1;
      }

      keys.push({
        note: semitone,
        octave,
        label: `${semitone}${octave}`,
        isSharp,
        order: keys.length,
        whiteIndex: isSharp ? whiteIndex - 1 : whiteIndex - 1,
      });
    });
  }

  return keys;
}

async function triggerMock(note: string, layout: LayoutName) {
  try {
    await fetch("/api/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note, layout, at: Date.now() }),
    });
  } catch (error) {
    console.error("Mock API call failed", error);
  }
}

export default function Home() {
  const [baseOctave, setBaseOctave] = useState(3);
  const [layout, setLayout] = useState<LayoutName>("qwerty");
  const [activeNotes, setActiveNotes] = useState<Set<string>>(() => new Set());

  const keys = useMemo(() => buildKeys(baseOctave), [baseOctave]);
  const keyBindings = useMemo(() => KEYMAPS[layout], [layout]);
  const noteByKey = useMemo(() => {
    const map = new Map<string, string>();
    keys.forEach((key, index) => {
      map.set(keyBindings[index], key.label);
    });
    return map;
  }, [keyBindings, keys]);

  const playNote = useCallback(
    (note: string) => {
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.add(note);
        return next;
      });

      void triggerMock(note, layout);

      window.setTimeout(() => {
        setActiveNotes((prev) => {
          const next = new Set(prev);
          next.delete(note);
          return next;
        });
      }, ACTIVE_DURATION_MS);
    },
    [layout]
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }
      const key = event.key.toLowerCase();
      const note = noteByKey.get(key);
      if (!note) {
        return;
      }
      event.preventDefault();
      playNote(note);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [noteByKey, playNote]);

  return (
    <main className="page">
      <header className="title-bar">
        <h1>Magicblock Piano</h1>
        <div className="controls">
          <div className="control-group">
            <span className="control-label">Octave range</span>
            <div className="control-buttons">
              <button
                type="button"
                className="ghost"
                onClick={() => setBaseOctave((value) => Math.max(MIN_OCTAVE, value - 1))}
                disabled={baseOctave <= MIN_OCTAVE}
              >
                Lower
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => setBaseOctave((value) => Math.min(MAX_OCTAVE, value + 1))}
                disabled={baseOctave >= MAX_OCTAVE}
              >
                Higher
              </button>
            </div>
          </div>
          <div className="control-group">
            <span className="control-label">Keyboard layout</span>
            <div className="control-buttons">
              {(["qwerty", "azerty"] as LayoutName[]).map((name) => (
                <button
                  key={name}
                  type="button"
                  className={layout === name ? "solid" : "ghost"}
                  onClick={() => setLayout(name)}
                >
                  {name.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="piano-shell">
        <div className="piano">
          <div className="white-keys">
            {keys
              .filter((key) => !key.isSharp)
              .map((key, index) => (
                <button
                  key={key.label}
                  type="button"
                  className={`key white ${activeNotes.has(key.label) ? "active" : ""}`}
                  onClick={() => playNote(key.label)}
                >
                  <span className="note">{key.label}</span>
                  <span className="binding">{keyBindings[key.order]}</span>
                  <span className="divider" />
                  <span className="index">{index + 1}</span>
                </button>
              ))}
          </div>
          <div className="black-keys">
            {keys
              .filter((key) => key.isSharp)
              .map((key) => (
                <button
                  key={key.label}
                  type="button"
                  className={`key black ${activeNotes.has(key.label) ? "active" : ""}`}
                  style={{ left: `calc(${key.whiteIndex + 1} * var(--white-key-width) - var(--black-key-offset))` }}
                  onClick={() => playNote(key.label)}
                >
                  <span className="note">{key.label}</span>
                  <span className="binding">{keyBindings[key.order]}</span>
                </button>
              ))}
          </div>
        </div>
      </section>

    </main>
  );
}
