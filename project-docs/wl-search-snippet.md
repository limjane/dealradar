# White Label /search — widget snippet (D22)

Copied from TP dashboard wizard 2026-07-12 (project owning faresteal.com; wl_id=19722).
Marker is embedded server-side via the wl_id — not a secret (appears in page source).

## Loader script (as provided)

```html
<script nowprocket data-noptimize="1" data-cfasync="false" data-wpfc-render="false" seraph-accel-crit="1" data-no-defer="1">
  (function () {
        var script = document.createElement("script");
        script.async = 1;
        script.type = "module";
        script.src = "https://tpembd.com/wl_web/main.js?wl_id=19722";
        document.head.appendChild(script);
      })();
</script>
```

## Search-form placement div (as provided by the wizard, 2026-07-12)

```html
<div id="tpwl-search"></div>
```

## Results placement div (as provided by the wizard, 2026-07-12)

```html
<div id="tpwl-tickets"></div>
```

## Integration notes for the build session

- Complete set from the wizard: loader script + `tpwl-search` (form) + `tpwl-tickets`
  (results). Place both divs on /search — form above results — and load the script.
- Next.js: load via `next/script` (afterInteractive) in a client component — the snippet's
  WordPress-optimizer attributes (nowprocket, data-noptimize, …) are irrelevant to us; the
  functional part is just the module script `https://tpembd.com/wl_web/main.js?wl_id=19722`.
- The WL was configured with the results page = www.faresteal.com/search, default origin
  EMPTY (geo-IP user-country default per D19.1/D22), worldwide destinations.
- Add `noindex` to /search (TP results content, not ours to index).
- Verify locally first (widget renders, a search returns results); live check = ONE
  delayed request or user eyeballs — no curl loops (Vercel bot challenge).
