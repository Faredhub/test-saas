"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export interface EntityOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface Props {
  value: string;
  options: EntityOption[];
  placeholder?: string;
  onSelect: (option: EntityOption) => void;
  onChange: (text: string) => void;
}

// Searchable combobox that links a field to existing records (Project / Client)
// while still allowing free text entry when no record matches.
export function EntityPicker({ value, options, placeholder, onSelect, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const matches = options
    .filter(
      (o) =>
        !query ||
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.sublabel ?? "").toLowerCase().includes(query.toLowerCase()),
    )
    .slice(0, 8);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={open ? query : value}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(e) => {
            if (open) {
              setQuery(e.target.value);
            } else {
              onChange(e.target.value);
            }
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="pl-7"
          placeholder={placeholder}
        />
      </div>
      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="max-h-56 overflow-auto">
            {matches.map((o) => (
              <button
                key={o.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(o);
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span className="flex-1 truncate">{o.label}</span>
                {o.sublabel && (
                  <span className="text-xs text-muted-foreground truncate">{o.sublabel}</span>
                )}
              </button>
            ))}
            {matches.length === 0 && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(query || value);
                  setQuery("");
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
              >
                Use &ldquo;{query || value}&rdquo; as typed
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
