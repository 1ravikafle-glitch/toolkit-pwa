import { copyText, el, h, haptic, ICONS, setIcon, toast } from '../ui';
import { load, store } from '../store';

type SavedPw = { label: string; pw: string; ts: number };

const KEY = 'tk-pw-saved';
const DOTS = '••••••••';

const SETS: { id: string; label: string; hint: string; chars: string; on: boolean }[] = [
  { id: 'upper', label: 'Uppercase (A–Z)', hint: 'ABC', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', on: true },
  { id: 'lower', label: 'Lowercase (a–z)', hint: 'abc', chars: 'abcdefghijklmnopqrstuvwxyz', on: true },
  { id: 'digits', label: 'Numbers (0–9)', hint: '123', chars: '0123456789', on: true },
  { id: 'symbols', label: 'Symbols (!@#…)', hint: '!@#', chars: '!@#$%^&*()-_=+[]{};:,.?/', on: false },
  { id: 'excludeAmbiguous', label: 'Exclude look-alikes (Il1O0)', hint: '', chars: '', on: false },
];

const AMBIGUOUS = 'Il1O0o';

const iconBtn = (icon: string, label: string, danger = false): HTMLButtonElement =>
  el(
    'button',
    { class: danger ? 'icon-btn danger' : 'icon-btn', type: 'button', 'aria-label': label, title: label },
    h(icon)
  );

function secureRandom(max: number): number {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0xffffffff / max) * max;
  let v: number;
  do {
    crypto.getRandomValues(buf);
    v = buf[0];
  } while (v >= limit);
  return v % max;
}

// ---------- Photo export: one saved record → shareable PNG ----------
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  font: string
): string[] {
  ctx.font = font;
  const lines: string[] = [];
  for (const word of text.split(/\s+/)) {
    // Hard-chunk a word (passwords) that can't fit on a line of its own.
    let rest = word;
    while (ctx.measureText(rest).width > maxW && rest.length > 1) {
      let cut = rest.length - 1;
      while (cut > 1 && ctx.measureText(rest.slice(0, cut)).width > maxW) cut--;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    const last = lines.length > 0 ? lines[lines.length - 1] : undefined;
    if (last === undefined) {
      lines.push(rest);
    } else if (ctx.measureText(`${last} ${rest}`).width <= maxW) {
      lines[lines.length - 1] = `${last} ${rest}`;
    } else {
      lines.push(rest);
    }
  }
  return lines;
}

function exportPhoto(item: SavedPw): void {
  const W = 1080;
  const PAD = 72;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  if (!ctx) {
    toast('Photo export isn’t supported here');
    return;
  }
  const sys = '-apple-system, "Segoe UI", Roboto, sans-serif';
  const mono = 'Menlo, Consolas, monospace';

  const labelLines = wrapText(ctx, item.label, W - PAD * 2, `700 60px ${sys}`);
  const pwLines = wrapText(ctx, item.pw, W - PAD * 2 - 80, `600 48px ${mono}`);

  const STRIPE = 14;
  const LINE_LH = 74;
  const LINE_PWH = 64;
  const boxH = 56 + pwLines.length * LINE_PWH + 40;

  const H =
    STRIPE + 56 + 76 + labelLines.length * LINE_LH + 44 + boxH + 48 + 56 + 28 + PAD;
  c.width = W;
  c.height = H;
  ctx.textBaseline = 'top';

  // bg + brand stripe (gradient reserved for the brand mark, echoing the app icon)
  ctx.fillStyle = '#101216';
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, '#0071e3');
  g.addColorStop(1, '#00c7ff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, STRIPE);

  let y = STRIPE + 56;
  ctx.fillStyle = '#6bb6ff';
  ctx.font = `600 30px ${sys}`;
  ctx.fillText('TOOLKIT · PASSWORD', PAD, y);
  y += 40 + 36;

  ctx.fillStyle = '#f5f5f7';
  ctx.font = `700 60px ${sys}`;
  for (const line of labelLines) {
    ctx.fillText(line, PAD, y);
    y += LINE_LH;
  }
  y += 44;

  // password block
  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.beginPath();
  ctx.roundRect(PAD, y, W - PAD * 2, boxH, 28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = `600 48px ${mono}`;
  let py = y + 56;
  for (const line of pwLines) {
    ctx.fillText(line, PAD + 40, py);
    py += LINE_PWH;
  }
  y += boxH + 48;

  ctx.fillStyle = '#98989e';
  ctx.font = `400 34px ${sys}`;
  ctx.fillText(`Saved ${new Date(item.ts).toLocaleDateString()} · where used: ${item.label}`, PAD, y);
  y += 44 + 12;

  ctx.fillStyle = '#6e6e73';
  ctx.font = `400 28px ${sys}`;
  ctx.fillText('Created on-device with ToolKit — nothing was uploaded.', PAD, y);

  const url = c.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  const slug =
    item.label
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'password';
  a.download = `${slug}-toolkit.png`;
  document.body.append(a);
  a.click();
  a.remove();
  haptic(10);
  toast('Photo saved');
}

export function render(root: HTMLElement): void {
  const lengthInput = el('input', {
    type: 'range',
    min: '6',
    max: '64',
    value: '16',
  }) as HTMLInputElement;
  const lengthVal = el('span', { class: 'opt-hint' }, '16 characters');

  const output = el('input', {
    type: 'text',
    readonly: '',
    spellcheck: 'false',
    autocomplete: 'off',
  }) as HTMLInputElement;

  const strengthBar = el('div', {}, el('div', { style: 'width:0%' }));
  strengthBar.classList.add('strength-bar');
  const strengthLabel = el('div', { class: 'hint' }, '');

  function activePool(): string {
    let pool = '';
    for (const set of SETS.slice(0, 4)) {
      if (root.querySelector<HTMLInputElement>(`#pw-${set.id}`)?.checked) {
        pool += set.chars;
      }
    }
    if (root.querySelector<HTMLInputElement>('#pw-excludeAmbiguous')?.checked) {
      pool = pool
        .split('')
        .filter((ch) => !AMBIGUOUS.includes(ch))
        .join('');
    }
    return pool;
  }

  function updateStrength(pw: string): void {
    if (!pw) {
      strengthBar.firstElementChild!.setAttribute('style', 'width:0%');
      strengthLabel.textContent = '';
      return;
    }
    const poolSize = activePool().length;
    const bits = pw.length * Math.log2(Math.max(poolSize, 2));
    let pct = 0;
    let label = '';
    let color = 'var(--red)';
    if (bits < 40) {
      pct = 25;
      label = 'Weak';
      color = 'var(--red)';
    } else if (bits < 60) {
      pct = 50;
      label = 'Fair';
      color = 'var(--orange)';
    } else if (bits < 90) {
      pct = 75;
      label = 'Strong';
      color = 'var(--green)';
    } else {
      pct = 100;
      label = 'Very strong';
      color = 'var(--green)';
    }
    strengthBar.firstElementChild!.setAttribute('style', `width:${pct}%;background:${color}`);
    strengthLabel.textContent = `${label} · ~${Math.round(bits)} bits of entropy`;
  }

  function generate(): void {
    const pool = activePool();
    if (!pool) {
      toast('Select at least one character set');
      return;
    }
    const len = parseInt(lengthInput.value, 10);
    let pw = '';
    for (let i = 0; i < len; i++) {
      pw += pool[secureRandom(pool.length)];
    }
    output.value = pw;
    updateStrength(pw);
  }

  lengthInput.addEventListener('input', () => {
    lengthVal.textContent = `${lengthInput.value} characters`;
    generate();
  });

  const checks = el('div', {});
  for (const set of SETS) {
    const cb = el('input', { type: 'checkbox', id: 'pw-' + set.id }) as HTMLInputElement;
    cb.checked = set.on;
    cb.addEventListener('change', generate);
    const row = el(
      'div',
      { class: 'check-row' },
      cb,
      el('label', { for: 'pw-' + set.id }, set.label),
      set.hint ? el('span', { class: 'opt-hint' }, set.hint) : el('span')
    );
    checks.append(row);
  }

  const copyBtn = el('button', { class: 'btn', type: 'button' }, 'Copy');
  copyBtn.addEventListener('click', () => output.value && copyText(output.value));

  const genBtn = el('button', { class: 'btn btn-primary', type: 'button' }, 'Generate password');
  genBtn.addEventListener('click', () => {
    generate();
    haptic(8);
  });

  // ---------- Save where it's used ----------
  const labelInput = el('input', {
    type: 'text',
    placeholder: 'e.g. netflix.com, gmail, home Wi-Fi',
    autocomplete: 'off',
  }) as HTMLInputElement;
  const saveErr = el('p', { class: 'inline-error' });
  saveErr.hidden = true;
  const saveBtn = el(
    'button',
    { class: 'btn btn-primary inline-btn', type: 'button' },
    'Save password'
  );

  const savedEmpty = el(
    'p',
    { class: 'list-empty' },
    'Nothing saved yet — label a password with where you use it, then hit Save. Entries stay on this device.'
  );
  const savedList = el('div', {});

  function renderSaved(): void {
    const items = load<SavedPw[]>(KEY, []);
    savedEmpty.hidden = items.length > 0;
    savedList.replaceChildren();
    for (const item of items) {
      let revealed = false;
      const sub = el('span', { class: 'list-sub mono' }, DOTS);
      const row = el(
        'div',
        { class: 'list-row' },
        el(
          'div',
          { class: 'list-main' },
          el('span', { class: 'list-title', title: item.label }, item.label),
          sub,
          el('span', { class: 'list-sub' }, new Date(item.ts).toLocaleDateString())
        )
      );
      const actions = el('div', { class: 'list-actions' });

      const eye = iconBtn(ICONS.eye, 'Show password');
      eye.addEventListener('click', () => {
        revealed = !revealed;
        sub.textContent = revealed ? item.pw : DOTS;
        setIcon(eye, revealed ? ICONS.eyeOff : ICONS.eye);
        eye.setAttribute('aria-label', revealed ? 'Hide password' : 'Show password');
      });

      const copy = iconBtn(ICONS.copy, 'Copy password');
      copy.addEventListener('click', () => copyText(item.pw));

      const photo = iconBtn(ICONS.image, 'Save this record as a photo');
      photo.addEventListener('click', () => exportPhoto(item));

      const del = iconBtn(ICONS.trash, 'Delete saved password', true);
      del.addEventListener('click', () => {
        store(
          KEY,
          load<SavedPw[]>(KEY, []).filter(
            (s) => !(s.label === item.label && s.pw === item.pw && s.ts === item.ts)
          )
        );
        renderSaved();
        haptic(6);
      });

      actions.append(eye, copy, photo, del);
      row.append(actions);
      savedList.append(row);
    }
  }

  saveBtn.addEventListener('click', () => {
    const label = labelInput.value.trim();
    const pw = output.value;
    if (!label) {
      saveErr.textContent = 'Say where it’s used first — e.g. “netflix.com”.';
      saveErr.hidden = false;
      labelInput.focus();
      return;
    }
    if (!pw) {
      saveErr.textContent = 'Generate a password first.';
      saveErr.hidden = false;
      return;
    }
    saveErr.hidden = true;
    const list = load<SavedPw[]>(KEY, []).filter(
      (s) => !(s.label.toLowerCase() === label.toLowerCase() && s.pw === pw)
    );
    list.unshift({ label, pw, ts: Date.now() });
    store(KEY, list.slice(0, 50));
    labelInput.value = '';
    renderSaved();
    haptic(8);
    toast('Saved on this device');
  });

  const panel = el(
    'div',
    { class: 'panel' },
    // Label first: the user names WHERE the password lives before generating.
    el('label', { class: 'field-label' }, 'Where do you use it?'),
    el('div', { class: 'input-row' }, labelInput, saveBtn),
    saveErr,
    el(
      'p',
      { class: 'hint' },
      'Generated on your device with the browser crypto RNG. Saved entries live in this browser only — nothing is uploaded.'
    ),
    el('label', { class: 'field-label' }, 'Password'),
    el('div', { class: 'pw-output' }, output, copyBtn),
    strengthBar,
    strengthLabel,
    // Generate sits directly under the result — reachable without scrolling,
    // works with the default selection (16 chars, A–Z a–z 0–9).
    genBtn,
    el('label', { class: 'field-label' }, 'Length'),
    lengthInput,
    lengthVal,
    el('label', { class: 'field-label' }, 'Character sets'),
    checks
  );

  const savedPanel = el(
    'div',
    { class: 'panel panel-gap' },
    el('label', { class: 'field-label' }, 'Saved passwords'),
    savedEmpty,
    savedList
  );

  root.append(
    h('<a class="back-link" href="#/">‹ All tools</a>'),
    h('<h1 class="large-title">Password Generator</h1>'),
    h('<p class="subtitle">Strong passwords, remembered with where they belong.</p>'),
    panel,
    savedPanel
  );

  generate();
  renderSaved();
}
