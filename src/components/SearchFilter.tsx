import { Search, X } from 'lucide-react';
import { useState } from 'react';

interface SearchFilterProps {
    value: string;
    onChange: (query: string) => void;
}

export default function SearchFilter({ value, onChange }: SearchFilterProps) {
    const [focused, setFocused] = useState(false);

    return (
        <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all duration-200 ${focused
                    ? 'border-primary bg-card shadow-sm shadow-primary/10'
                    : 'border-border bg-secondary/50 hover:bg-secondary/80'
                }`}
        >
            <Search size={12} className="text-muted-foreground flex-shrink-0" />
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Filter providers..."
                className="flex-1 bg-transparent text-xs text-card-foreground placeholder:text-muted-foreground outline-none min-w-0"
                aria-label="Search providers"
            />
            {value && (
                <button
                    onClick={() => onChange('')}
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear search"
                >
                    <X size={10} />
                </button>
            )}
        </div>
    );
}
