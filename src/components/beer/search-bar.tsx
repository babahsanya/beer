"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
  showBack?: boolean;
  onBack?: () => void;
  autoFocus?: boolean;
  loading?: boolean;
}

export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = "Найти пиво...",
  autoFocus = false,
  loading = false,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.trim()) {
      onSearch();
    }
  };

  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div
      className={`relative flex items-center rounded-xl transition-all duration-300 ${
        focused
          ? "bg-white/80 dark:bg-stone-800/80 backdrop-blur-xl border-2 border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/20 dark:ring-amber-500/20 shadow-lg shadow-amber-200/40 dark:shadow-amber-900/30"
          : "bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl border-2 border-amber-200/80 dark:border-amber-900/50 shadow-md"
      }`}
    >
      <div className="ml-3 shrink-0">
        <motion.div
          animate={
            loading
              ? { scale: 1, rotate: 360 }
              : focused
              ? { scale: 1.15, rotate: 10 }
              : { scale: 1, rotate: 0 }
          }
          transition={
            loading
              ? { duration: 1, repeat: Infinity, ease: "linear" }
              : { duration: 0.2 }
          }
        >
          {loading ? (
            <Loader2 className="h-5 w-5 text-amber-500" />
          ) : (
            <Search className="h-5 w-5 text-amber-500" />
          )}
        </motion.div>
      </div>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12 text-base bg-transparent"
      />
      {!value && !focused && (
        <kbd className="mr-3 hidden sm:inline-flex items-center gap-0.5 h-5 px-1.5 rounded border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      )}
      {value && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="mr-1 h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}