"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Shared, on-brand search form (D23) — used on both the home hero and /search, replacing
 * the static hero mockup and the retired Travelpayouts White Label widget. From/To use TP's
 * free Places autocomplete (no auth, no gating); Depart/Return are a small custom calendar
 * (no heavy date-picker dep to fight our CSS). Submitting builds a `/go/aviasales` deep link
 * (see lib/go-links.ts) — results open on Aviasales under our marker; on-brand embedded
 * results return once the Aviasales Search API ungates at 50k MAU (D21).
 */

type Place = {
  code: string;
  name: string;
  city_name?: string;
  country_name?: string;
  type: string;
};

type Airport = { code: string; label: string };

const DEFAULT_FROM: Airport = { code: "SIN", label: "Singapore (SIN)" };

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoToDate(iso: string): Date {
  const parts = iso.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  return new Date(y, m - 1, d);
}

function dateToISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function formatPretty(iso: string): string {
  return isoToDate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function AirportAutocomplete({
  label,
  placeholder,
  value,
  onSelect,
}: {
  label: string;
  placeholder: string;
  value: Airport | null;
  onSelect: (a: Airport) => void;
}) {
  const [term, setTerm] = useState(value?.label ?? "");
  const [options, setOptions] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setTerm(value?.label ?? "");
  }, [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleChange(next: string) {
    setTerm(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (next.trim().length < 2) {
      setOptions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const url = new URL("https://autocomplete.travelpayouts.com/places2");
        url.searchParams.set("term", next.trim());
        url.searchParams.set("locale", "en");
        url.searchParams.append("types[]", "city");
        url.searchParams.append("types[]", "airport");
        const res = await fetch(url.toString());
        if (!res.ok) return;
        const data: Place[] = await res.json();
        setOptions(data.filter((p) => p.code).slice(0, 8));
        setOpen(true);
      } catch {
        // best-effort suggestions; a failed lookup just leaves the list empty
      }
    }, 250);
  }

  function pick(p: Place) {
    const city = p.city_name && p.city_name !== p.name ? `${p.name}, ` : "";
    const label = `${city || p.name + " "}(${p.code})`.trim();
    onSelect({ code: p.code, label });
    setTerm(label);
    setOpen(false);
    setOptions([]);
  }

  return (
    <div className="field ac-field" ref={boxRef}>
      <label>{label}</label>
      <input
        type="text"
        value={term}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => options.length > 0 && setOpen(true)}
      />
      {open && options.length > 0 && (
        <ul className="ac-list" role="listbox">
          {options.map((p) => (
            <li key={`${p.code}-${p.type}`}>
              <button type="button" onClick={() => pick(p)}>
                <span className="ac-name">{p.city_name && p.city_name !== p.name ? `${p.name}, ${p.country_name ?? ""}` : p.name}</span>
                <span className="ac-code">{p.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Calendar({
  min,
  selected,
  onSelect,
  onClose,
}: {
  min: string;
  selected: string | null;
  onSelect: (iso: string) => void;
  onClose: () => void;
}) {
  const start = isoToDate(selected ?? min);
  const [viewYear, setViewYear] = useState(start.getFullYear());
  const [viewMonth, setViewMonth] = useState(start.getMonth());

  const first = new Date(viewYear, viewMonth, 1);
  const leadingBlanks = (first.getDay() + 6) % 7; // Monday-first grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const minDate = isoToDate(min);

  function changeMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  return (
    <div className="cal-pop">
      <div className="cal-head">
        <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">
          ‹
        </button>
        <span>{new Date(viewYear, viewMonth, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
        <button type="button" onClick={() => changeMonth(1)} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="cal-grid cal-weekdays">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="cal-grid">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const d = new Date(viewYear, viewMonth, day);
          const iso = dateToISO(d);
          const disabled = d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
          const isSelected = iso === selected;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              className={isSelected ? "cal-day cal-day-selected" : "cal-day"}
              onClick={() => {
                onSelect(iso);
                onClose();
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DateField({
  label,
  placeholder,
  value,
  min,
  onChange,
  onClear,
}: {
  label: string;
  placeholder: string;
  value: string | null;
  min: string;
  onChange: (iso: string) => void;
  onClear?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="field date-field" ref={boxRef}>
      <label>{label}</label>
      <button type="button" className="date-trigger" onClick={() => setOpen((o) => !o)}>
        {value ? formatPretty(value) : placeholder}
      </button>
      {value && onClear && (
        <button
          type="button"
          className="date-clear"
          aria-label={`Clear ${label.toLowerCase()}`}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
        >
          ×
        </button>
      )}
      {open && (
        <Calendar min={min} selected={value} onSelect={onChange} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

export function FlightSearchForm({
  variant = "hero",
  initialTo = null,
}: {
  variant?: "hero" | "page";
  /** Pre-fill the destination (e.g. /search?to=DPS from a route page) so the form carries
   * the user's context instead of starting blank. */
  initialTo?: Airport | null;
}) {
  const router = useRouter();
  const [from, setFrom] = useState<Airport>(DEFAULT_FROM);
  const [to, setTo] = useState<Airport | null>(initialTo);
  const [depart, setDepart] = useState<string | null>(null);
  const [ret, setRet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const min = todayISO();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!to) {
      setError("Pick a destination.");
      return;
    }
    if (!depart) {
      setError("Pick a depart date.");
      return;
    }
    setError(null);
    const qs = new URLSearchParams({ from: from.code, to: to.code, depart });
    if (ret) qs.set("return", ret);
    router.push(`/go/aviasales?${qs.toString()}`);
  }

  return (
    <form className={variant === "hero" ? "searchcard" : "searchcard searchcard-page"} onSubmit={handleSubmit}>
      <div className="fields">
        <AirportAutocomplete label="From" placeholder="Where from?" value={from} onSelect={setFrom} />
        <AirportAutocomplete label="To" placeholder="Anywhere fun ✨" value={to} onSelect={setTo} />
        <DateField label="Depart" placeholder="Add date" value={depart} min={min} onChange={setDepart} onClear={() => { setDepart(null); setRet(null); }} />
        <DateField
          label="Return"
          placeholder="+ Add"
          value={ret}
          min={depart ?? min}
          onChange={setRet}
          onClear={() => setRet(null)}
        />
      </div>
      {error && <p className="search-error">{error}</p>}
      <button type="submit" className="cta">
        Check the price →
      </button>
      <p className="handoff-note">
        Opens our booking partner Aviasales — same price, we may earn a commission.
      </p>
    </form>
  );
}
