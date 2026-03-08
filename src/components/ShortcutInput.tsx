import { useState, useRef, useEffect, useCallback } from 'react';

interface ShortcutInputProps {
  value: string;
  onChange: (shortcut: string) => void;
}

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta']);
const KEY_DISPLAY: Record<string, string> = {
  Control: 'Ctrl',
  Meta: 'Win',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  ' ': 'Space',
  Escape: 'Esc',
  Backspace: '⌫',
  Delete: 'Del',
  Enter: '↵',
};

function formatKey(key: string) {
  return KEY_DISPLAY[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

function parseShortcut(shortcut: string): string[] {
  return shortcut.split('+').map(s => s.trim());
}

export default function ShortcutInput({ value, onChange }: ShortcutInputProps) {
  const [recording, setRecording] = useState(false);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!recording) return;
      e.preventDefault();
      e.stopPropagation();

      const key = e.key;
      setPressedKeys(prev => new Set([...prev, key]));
    },
    [recording]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (!recording) return;
      e.preventDefault();

      const keys = [...pressedKeys];
      const modifiers = keys.filter(k => MODIFIER_KEYS.has(k));
      const nonModifiers = keys.filter(k => !MODIFIER_KEYS.has(k));

      // Validate: must have at least one modifier and one non-modifier
      if (modifiers.length > 0 && nonModifiers.length === 1) {
        const shortcut = [...modifiers.map(formatKey), formatKey(nonModifiers[0])].join('+');
        onChange(shortcut);
        setRecording(false);
        setPressedKeys(new Set());
      } else if (!MODIFIER_KEYS.has(e.key)) {
        // Invalid combo, reset
        setPressedKeys(new Set());
      }
    },
    [recording, pressedKeys, onChange]
  );

  useEffect(() => {
    if (recording) {
      window.addEventListener('keydown', handleKeyDown, true);
      window.addEventListener('keyup', handleKeyUp, true);
      return () => {
        window.removeEventListener('keydown', handleKeyDown, true);
        window.removeEventListener('keyup', handleKeyUp, true);
      };
    }
  }, [recording, handleKeyDown, handleKeyUp]);

  // Click outside to cancel
  useEffect(() => {
    if (!recording) return;
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setRecording(false);
        setPressedKeys(new Set());
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [recording]);

  const keys = parseShortcut(value);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-card-foreground">Global shortcut</span>
        <button
          onClick={() => onChange('Ctrl+Shift+U')}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Reset default
        </button>
      </div>
      <div
        ref={inputRef}
        onClick={() => {
          setRecording(true);
          setPressedKeys(new Set());
        }}
        className={`flex items-center gap-1 px-2 py-1.5 rounded-md border cursor-pointer transition-colors ${
          recording
            ? 'border-primary bg-primary/5'
            : 'border-border bg-secondary hover:bg-secondary/80'
        }`}
        role="button"
        tabIndex={0}
        aria-label="Click to record keyboard shortcut"
      >
        {recording ? (
          <span className="text-[11px] text-primary animate-pulse">Press keys...</span>
        ) : (
          keys.map((key, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-[10px] text-muted-foreground">+</span>}
              <kbd className="inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 text-[10px] font-mono font-semibold rounded border border-border bg-card text-card-foreground shadow-sm">
                {key}
              </kbd>
            </span>
          ))
        )}
      </div>
    </div>
  );
}
