import { el, fmtNum, h, ICONS } from '../ui';

type Unit = { id: string; name: string; factor: number };
type Category = { id: string; label: string; units: Unit[] };

const CATEGORIES: Category[] = [
  {
    id: 'length',
    label: 'Length',
    units: [
      { id: 'mm', name: 'Millimeter', factor: 0.001 },
      { id: 'cm', name: 'Centimeter', factor: 0.01 },
      { id: 'm', name: 'Meter', factor: 1 },
      { id: 'km', name: 'Kilometer', factor: 1000 },
      { id: 'in', name: 'Inch', factor: 0.0254 },
      { id: 'ft', name: 'Foot', factor: 0.3048 },
      { id: 'yd', name: 'Yard', factor: 0.9144 },
      { id: 'mi', name: 'Mile', factor: 1609.344 },
    ],
  },
  {
    id: 'weight',
    label: 'Weight',
    units: [
      { id: 'mg', name: 'Milligram', factor: 1e-6 },
      { id: 'g', name: 'Gram', factor: 0.001 },
      { id: 'kg', name: 'Kilogram', factor: 1 },
      { id: 't', name: 'Metric ton', factor: 1000 },
      { id: 'oz', name: 'Ounce', factor: 0.028349523125 },
      { id: 'lb', name: 'Pound', factor: 0.45359237 },
    ],
  },
  {
    id: 'temp',
    label: 'Temperature',
    units: [
      { id: 'C', name: 'Celsius', factor: 1 },
      { id: 'F', name: 'Fahrenheit', factor: 1 },
      { id: 'K', name: 'Kelvin', factor: 1 },
    ],
  },
  {
    id: 'area',
    label: 'Area',
    units: [
      { id: 'm2', name: 'Square meter', factor: 1 },
      { id: 'km2', name: 'Square kilometer', factor: 1e6 },
      { id: 'ha', name: 'Hectare', factor: 1e4 },
      { id: 'ft2', name: 'Square foot', factor: 0.09290304 },
      { id: 'acre', name: 'Acre', factor: 4046.8564224 },
    ],
  },
  {
    id: 'volume',
    label: 'Volume',
    units: [
      { id: 'ml', name: 'Milliliter', factor: 0.001 },
      { id: 'l', name: 'Liter', factor: 1 },
      { id: 'm3', name: 'Cubic meter', factor: 1000 },
      { id: 'gal', name: 'Gallon (US)', factor: 3.785411784 },
      { id: 'qt', name: 'Quart (US)', factor: 0.946352946 },
      { id: 'pt', name: 'Pint (US)', factor: 0.473176473 },
      { id: 'cup', name: 'Cup (US)', factor: 0.2365882365 },
      { id: 'floz', name: 'Fluid ounce (US)', factor: 0.0295735295625 },
    ],
  },
  {
    id: 'speed',
    label: 'Speed',
    units: [
      { id: 'ms', name: 'Meters/second', factor: 1 },
      { id: 'kmh', name: 'Kilometers/hour', factor: 1 / 3.6 },
      { id: 'mph', name: 'Miles/hour', factor: 0.44704 },
      { id: 'fts', name: 'Feet/second', factor: 0.3048 },
      { id: 'kn', name: 'Knot', factor: 0.514444444 },
    ],
  },
];

function toBase(v: number, u: Unit): number {
  if (u.id === 'F') return ((v - 32) * 5) / 9;
  if (u.id === 'K') return v - 273.15;
  return v * u.factor;
}

function fromBase(base: number, u: Unit): number {
  if (u.id === 'F') return (base * 9) / 5 + 32;
  if (u.id === 'K') return base + 273.15;
  return base / u.factor;
}

export function render(root: HTMLElement): void {
  let cat = CATEGORIES[0];

  const seg = el('div', { class: 'segmented' });
  const fromSel = document.createElement('select');
  const toSel = document.createElement('select');
  const input = el('input', {
    type: 'number',
    step: 'any',
    value: '1',
    inputmode: 'decimal',
    placeholder: 'Enter value',
  }) as HTMLInputElement;
  const outValue = el('div', { class: 'result-value' }, '—');
  const outLabel = el('div', { class: 'result-label' }, 'Result');

  function fillSelects(): void {
    fromSel.innerHTML = '';
    toSel.innerHTML = '';
    for (const u of cat.units) {
      for (const sel of [fromSel, toSel]) {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = `${u.name} (${u.id})`;
        sel.append(opt);
      }
    }
    fromSel.selectedIndex = 0;
    toSel.selectedIndex = Math.min(1, cat.units.length - 1);
  }

  function convert(): void {
    const v = parseFloat(input.value);
    if (isNaN(v)) {
      outValue.textContent = '—';
      outLabel.textContent = 'Result';
      return;
    }
    const from = cat.units.find((u) => u.id === fromSel.value) ?? cat.units[0];
    const to = cat.units.find((u) => u.id === toSel.value) ?? cat.units[1] ?? cat.units[0];
    outValue.textContent = fmtNum(fromBase(toBase(v, from), to));
    outLabel.textContent = `${fmtNum(v)} ${from.id} → ${to.id}`;
  }

  function setCategory(id: string): void {
    cat = CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
    seg.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-cat') === id);
    });
    fillSelects();
    convert();
  }

  for (const c of CATEGORIES) {
    const btn = el('button', { 'data-cat': c.id, type: 'button' }, c.label);
    btn.addEventListener('click', () => setCategory(c.id));
    seg.append(btn);
  }

  input.addEventListener('input', convert);
  fromSel.addEventListener('change', convert);
  toSel.addEventListener('change', convert);

  const swapBtn = el(
    'button',
    { class: 'btn btn-secondary', type: 'button' },
    h(ICONS.swap),
    ' Swap units'
  );
  swapBtn.addEventListener('click', () => {
    const a = fromSel.value;
    fromSel.value = toSel.value;
    toSel.value = a;
    convert();
  });

  const panel = el(
    'div',
    { class: 'panel' },
    seg,
    el('label', { class: 'field-label' }, 'Value'),
    input,
    el('label', { class: 'field-label' }, 'From'),
    fromSel,
    el('label', { class: 'field-label' }, 'To'),
    toSel,
    swapBtn,
    el('div', { class: 'result-card' }, outLabel, outValue)
  );

  root.append(
    h('<a class="back-link" href="#/">‹ All tools</a>'),
    h('<h1 class="large-title">Unit Converter</h1>'),
    h('<p class="subtitle">Convert between everyday units — works fully offline.</p>'),
    panel
  );

  setCategory('length');
}
