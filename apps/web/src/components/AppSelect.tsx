"use client";

import { KeyboardEvent, useEffect, useId, useRef, useState } from "react";

type AppSelectOption = {
  label: string;
  value: string;
};

type AppSelectProps = {
  label: string;
  options: AppSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function AppSelect({ label, options, value, onChange, placeholder = "Select option" }: AppSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const id = useId();
  const labelId = `${id}-label`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((option) => option.value === value);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  function openMenu(nextIndex = selectedIndex) {
    setActiveIndex(nextIndex);
    setOpen(true);
  }

  function selectOption(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      setActiveIndex((current) => Math.min(options.length - 1, current + 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      setActiveIndex((current) => Math.max(0, current - 1));
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) {
        selectOption(activeIndex);
      } else {
        openMenu();
      }
    }
  }

  return (
    <div className="app-select-field" ref={rootRef}>
      <span className="app-select-label" id={labelId}>{label}</span>
      <button
        aria-controls={id}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby={labelId}
        className="app-select-trigger"
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            openMenu();
          }
        }}
        onKeyDown={handleKeyDown}
        type="button"
      >
        <span>{selectedOption?.label ?? placeholder}</span>
        <span aria-hidden="true" className="app-select-chevron" />
      </button>
      {open ? (
        <div aria-labelledby={labelId} className="app-select-menu" id={id} role="listbox">
          {options.map((option, index) => (
            <button
              aria-selected={option.value === value}
              className={[option.value === value ? "selected" : "", index === activeIndex ? "active" : ""].filter(Boolean).join(" ")}
              key={option.value}
              onClick={() => {
                selectOption(index);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              role="option"
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
