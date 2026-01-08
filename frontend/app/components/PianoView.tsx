"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePianoContext } from "../contexts/PianoContext";
import { usePiano } from "../hooks/usePiano";
import { ConnectWalletMenu } from "../components/ConnectWalletMenu";
import { useSelectedWallet } from "../hooks/useSelectedWallet";
import { useLocalKeypair } from "../hooks/useLocalKeypair";
import { LocalKeypairView } from "../components/LocalKeypairView";
import { UiWalletAccount } from "@wallet-standard/react";
import { isAddress, KeyPairSigner } from "@solana/kit";
import { formatAddress } from "../utils";
import { toast } from "sonner";

const SEMITONES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

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
const DEFAULT_CHORD_THROTTLE_MS = 20;

function buildKeys(baseOctave: number): PianoKey[] {
  const keys: PianoKey[] = [];
  let whiteIndex = 0;

  for (let octave = baseOctave; octave < baseOctave + 2; octave += 1) {
    SEMITONES.forEach((semitone) => {
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

interface PianoViewProps {
  wallet: UiWalletAccount;
}

export function PianoView({ wallet }: PianoViewProps) {
  const [baseOctave, setBaseOctave] = useState(3);
  const [layout, setLayout] = useState<LayoutName>("qwerty");
  const [status, setStatus] = useState<string | null>(null);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(() => new Set());
  const [chordThrottleMs, setChordThrottleMs] = useState(
    DEFAULT_CHORD_THROTTLE_MS
  );
  const {
    isPianoInitialized,
    pianoAddress,
    manualPianoAddress,
    setManualPianoAddress,
    isDelegated,
  } = usePianoContext();
  const {
    sendNotes,
    isInitializing,
    initialize,
    delegate,
    isDelegating,
    undelegate,
    isUndelegating,
  } = usePiano({
    wallet,
    setStatus,
  });
  const chordBufferRef = useRef<string[]>([]);
  const chordTimerRef = useRef<number | null>(null);

  const keys = useMemo(() => buildKeys(baseOctave), [baseOctave]);
  const keyBindings = useMemo(() => KEYMAPS[layout], [layout]);
  const noteByKey = useMemo(() => {
    const map = new Map<string, string>();
    keys.forEach((key, index) => {
      map.set(keyBindings[index], key.label);
    });
    return map;
  }, [keyBindings, keys]);

  const queueNote = useCallback(
    (note: string) => {
      chordBufferRef.current.push(note);
      if (chordTimerRef.current !== null) {
        return;
      }
      chordTimerRef.current = window.setTimeout(() => {
        const batch = chordBufferRef.current.splice(0);
        chordTimerRef.current = null;
        if (batch.length) {
          void sendNotes(batch);
        }
      }, chordThrottleMs);
    },
    [chordThrottleMs, sendNotes]
  );

  const playNote = useCallback(
    (note: string) => {
      if (!isPianoInitialized) {
        return;
      }
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.add(note);
        return next;
      });

      queueNote(note);

      window.setTimeout(() => {
        setActiveNotes((prev) => {
          const next = new Set(prev);
          next.delete(note);
          return next;
        });
      }, ACTIVE_DURATION_MS);
    },
    [isPianoInitialized, layout, queueNote]
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.repeat || !isPianoInitialized) {
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
  }, [isPianoInitialized, noteByKey, playNote]);

  const PianoOverlay = useMemo(() => {
    if (!isPianoInitialized) {
      return (
        <div className="piano-overlay" role="presentation">
          <button
            type="button"
            className="solid"
            onClick={initialize}
            disabled={
              isInitializing || isPianoInitialized || !!manualPianoAddress
            }
          >
            {isInitializing ? "Initializing..." : "Initialize piano"}
          </button>
        </div>
      );
    }
    if (!isDelegated) {
      return (
        <div className="piano-overlay" role="presentation">
          <button
            type="button"
            className="solid"
            onClick={delegate}
            disabled={isDelegating || isDelegated || !!manualPianoAddress}
          >
            {isDelegating ? "Delegating..." : "Delegate piano"}
          </button>
        </div>
      );
    }
  }, [
    isInitializing,
    isPianoInitialized,
    manualPianoAddress,
    initialize,
    delegate,
    isDelegating,
    isDelegated,
  ]);

  return (
    <div className="piano-view">
      <div className="controls">
        <div className="control-group">
          <span className="control-label">PDA</span>
          <span
            className="wallet-meta"
            onClick={() => {
              navigator.clipboard.writeText(pianoAddress?.toString() ?? "");
              toast.success("Copied to clipboard");
            }}
          >
            {pianoAddress ? formatAddress(pianoAddress) : "???"}
          </span>
        </div>
        <div className="control-group">
          <span className="control-label">Custom Piano</span>
          <div className="pda-input">
            <input
              type="text"
              placeholder="Enter your piano address"
              defaultValue={manualPianoAddress?.toString()}
              onChange={(event) => {
                if (isAddress(event.target.value)) {
                  setManualPianoAddress(event.target.value);
                }
              }}
            />
          </div>
        </div>
        <div
          className="control-group"
          style={{ alignSelf: "flex-end", flexDirection: "row" }}
        >
          <button
            type="button"
            className={!isDelegated ? "solid" : "ghost"}
            onClick={delegate}
            disabled={isDelegating || isDelegated || !!manualPianoAddress}
          >
            {isDelegating ? "Delegating..." : "Delegate piano"}
          </button>
          <button
            type="button"
            className={isDelegated ? "solid" : "ghost"}
            onClick={undelegate}
            disabled={isUndelegating || isDelegated || !!manualPianoAddress}
          >
            {isUndelegating ? "Undelegating..." : "Undelegate piano"}
          </button>
        </div>
      </div>
      <div className="controls">
        <div className="control-group">
          <span className="control-label">Octave range</span>
          <div className="control-buttons">
            <button
              type="button"
              className="ghost"
              onClick={() =>
                setBaseOctave((value) => Math.max(MIN_OCTAVE, value - 1))
              }
              disabled={baseOctave <= MIN_OCTAVE}
            >
              Lower
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() =>
                setBaseOctave((value) => Math.min(MAX_OCTAVE, value + 1))
              }
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
        <div className="control-group">
          <span className="control-label">Chord window</span>
          <div className="control-buttons">
            <input
              className="range"
              type="range"
              min={0}
              max={120}
              step={5}
              value={chordThrottleMs}
              onChange={(event) =>
                setChordThrottleMs(Number(event.target.value))
              }
            />
            <span className="wallet-meta">{chordThrottleMs} ms</span>
          </div>
        </div>
      </div>
      <section
        className={`piano-shell ${isPianoInitialized && isDelegated ? "" : "piano-shell-disabled"}`}
        aria-disabled={!isPianoInitialized}
      >
        {PianoOverlay}
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
                  disabled={!isPianoInitialized}
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
                  style={{
                    left: `calc(${key.whiteIndex + 1} * var(--white-key-width) - var(--black-key-offset))`,
                  }}
                  onClick={() => playNote(key.label)}
                  disabled={!isPianoInitialized}
                >
                  <span className="note">{key.label}</span>
                  <span className="binding">{keyBindings[key.order]}</span>
                </button>
              ))}
          </div>
        </div>
      </section>
      {status ? <span className="status-line">{status}</span> : null}
    </div>
  );
}
