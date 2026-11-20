"use client";

import { useId, useRef, useState } from "react";

export type SelectOption = { value: string; label: string };

/**
 * A type-to-filter dropdown (ARIA combobox). The typed text is only for
 * searching; the chosen option's value is submitted through a hidden input
 * named `name`, so server actions see the same field as a native <select>.
 */
export function SearchableSelect({
  name,
  options,
  defaultValue,
  placeholder,
  required = false,
  emptyLabel,
  inputClassName,
}: {
  name: string;
  options: SelectOption[];
  defaultValue?: string | null;
  placeholder: string;
  required?: boolean;
  /** Optional fields only: label for "no value" (the empty string). */
  emptyLabel?: string;
  inputClassName: string;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const labelFor = (value: string) => options.find((o) => o.value === value)?.label ?? "";
  const [value, setValue] = useState(defaultValue ?? "");
  const [query, setQuery] = useState(labelFor(defaultValue ?? ""));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const needle = query.trim().toLowerCase();
  // Show everything when the box still shows the current choice, so opening
  // it lists all options rather than just the one already picked.
  const showAll = needle === "" || query === labelFor(value);
  const matches = showAll
    ? options
    : options.filter((o) => o.label.toLowerCase().includes(needle));
  const items: SelectOption[] =
    emptyLabel && showAll ? [{ value: "", label: emptyLabel }, ...matches] : matches;

  const choose = (option: SelectOption) => {
    setValue(option.value);
    setQuery(option.value === "" ? "" : option.label);
    setOpen(false);
    inputRef.current?.setCustomValidity("");
  };

  /** Snap the text back to the current choice if the user typed something else. */
  const settle = () => {
    setOpen(false);
    inputRef.current?.setCustomValidity("");
    if (query.trim() === "" && !required) {
      setValue("");
      setQuery("");
    } else {
      setQuery(labelFor(value));
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(0);
        return;
      }
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (items.length ? (i + step + items.length) % items.length : 0));
    } else if (e.key === "Enter" && open) {
      // Choose the highlighted option instead of submitting the form.
      e.preventDefault();
      if (items[active]) choose(items[active]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      settle();
    }
  };

  const optionId = (i: number) => `${listId}-${i}`;

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value} />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && items[active] ? optionId(active) : undefined}
        autoComplete="off"
        required={required}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
          // Half-typed text isn't a choice: block submitting until an option
          // is picked (leaving the field also snaps it back to the last one).
          if (required) {
            e.target.setCustomValidity(
              e.target.value.trim() === "" ? "" : "Choose an option from the list."
            );
          }
        }}
        onFocus={(e) => {
          e.target.select();
          setOpen(true);
          setActive(0);
        }}
        onBlur={settle}
        onKeyDown={onKeyDown}
        className={inputClassName}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-black/15 bg-white py-1 text-sm shadow-lg dark:border-white/15 dark:bg-zinc-900"
        >
          {items.length === 0 ? (
            <li className="px-3 py-2 text-zinc-500 dark:text-zinc-400">No matches</li>
          ) : (
            items.map((o, i) => (
              <li
                key={o.value || "__empty"}
                id={optionId(i)}
                role="option"
                aria-selected={o.value === value}
                // Choose on mousedown so it lands before the input's blur.
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(o);
                }}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer px-3 py-2 ${
                  i === active ? "bg-black/5 dark:bg-white/10" : ""
                } ${
                  o.value === ""
                    ? "text-zinc-500 dark:text-zinc-400"
                    : "text-black dark:text-zinc-50"
                } ${o.value === value ? "font-medium" : ""}`}
              >
                {o.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
