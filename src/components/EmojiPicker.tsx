"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Button } from "antd";
import { Smile } from "lucide-react";

const EmojiPickerWidget = dynamic(
  () => import("emoji-picker-react").then((module) => module.default),
  { ssr: false },
);

export function EmojiPicker({ onEmojiSelect }: { onEmojiSelect: (emoji: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div ref={pickerRef} className="relative z-20 flex-none">
      <Button
        type="text"
        aria-label="Choose an emoji"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <Smile size={18} aria-hidden="true" />
      </Button>
      {isOpen && (
        <div className="absolute bottom-full left-0 z-50 mb-3 overflow-hidden rounded-xl border border-line-soft shadow-[0_12px_32px_rgb(37_36_58_/_18%)]">
          <EmojiPickerWidget
            width="min(340px, calc(100vw - 32px))"
            height="min(360px, 55svh)"
            emojiStyle="native"
            previewConfig={{ showPreview: false }}
            onEmojiClick={(emojiData) => {
              onEmojiSelect(emojiData.emoji);
              setIsOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
