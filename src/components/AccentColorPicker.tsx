import { useState } from 'react';
import { Palette } from 'lucide-react';

const ACCENT_PRESETS = [
    { name: 'Blue', hsl: '217 91% 60%' },
    { name: 'Purple', hsl: '262 83% 58%' },
    { name: 'Rose', hsl: '346 77% 52%' },
    { name: 'Orange', hsl: '25 95% 53%' },
    { name: 'Green', hsl: '142 71% 45%' },
    { name: 'Cyan', hsl: '195 85% 50%' },
    { name: 'Amber', hsl: '38 92% 50%' },
    { name: 'Indigo', hsl: '239 84% 67%' },
];

interface AccentColorPickerProps {
    currentAccent?: string;
    onSelect: (hsl: string) => void;
}

export default function AccentColorPicker({ currentAccent, onSelect }: AccentColorPickerProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Palette size={12} className="text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Accent Color</span>
            </div>
            <div className="flex flex-wrap gap-2">
                {ACCENT_PRESETS.map(preset => {
                    const isActive = currentAccent === preset.hsl;
                    return (
                        <button
                            key={preset.name}
                            onClick={() => onSelect(preset.hsl)}
                            className={`group relative w-7 h-7 rounded-full border-2 transition-all ${isActive ? 'border-foreground scale-110' : 'border-transparent hover:scale-110'
                                }`}
                            style={{ backgroundColor: `hsl(${preset.hsl})` }}
                            title={preset.name}
                            aria-label={`Set accent color to ${preset.name}`}
                        >
                            {isActive && (
                                <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold">
                                    ✓
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function applyAccentColor(hsl: string) {
    document.documentElement.style.setProperty('--primary', hsl);
}
