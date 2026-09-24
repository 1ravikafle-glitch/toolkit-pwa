import { copyText, el, fmtNum, h, haptic } from '../ui';

const PRESETS = [0, 10, 15, 18, 20, 25];

export function render(root: HTMLElement): void {
  const bill = el('input', {
    type: 'number',
    step: 'any',
    min: '0',
    inputmode: 'decimal',
    placeholder: '0.00',
    value: '',
  }) as HTMLInputElement;

  const people = el('input', {
    type: 'number',
    step: '1',
    min: '1',
    inputmode: 'numeric',
    value: '2',
  }) as HTMLInputElement;

  const seg = el('div', { class: 'segmented' });
  let tipPct = 0;

  const customPct = el('input', {
    type: 'number',
    step: 'any',
    min: '0',
    max: '100',
    inputmode: 'decimal',
    placeholder: 'Custom %',
  }) as HTMLInputElement;

  const outTip = el('div', { class: 'result-value' }, '—');
  const outTotal = el('div', { class: 'result-value' }, '—');
  const outEach = el('div', { class: 'result-value' }, '—');
  const emptyHint = el(
    'p',
    { class: 'hint' },
    'Enter a bill amount to see the tip and split.'
  );

  function currentPct(): number {
    if (customPct.value !== '') {
      const c = parseFloat(customPct.value);
      if (!isNaN(c) && c >= 0) return c;
    }
    return tipPct;
  }

  function setPct(pct: number): void {
    tipPct = pct;
    seg.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('active', Number(b.getAttribute('data-pct')) === pct);
    });
  }

  function calc(): void {
    const billVal = parseFloat(bill.value);
    const n = Math.max(1, Math.floor(parseFloat(people.value) || 1));
    if (isNaN(billVal) || billVal < 0) {
      outTip.textContent = '—';
      outTotal.textContent = '—';
      outEach.textContent = '—';
      emptyHint.style.display = '';
      return;
    }
    emptyHint.style.display = 'none';
    const pct = currentPct();
    const tip = (billVal * pct) / 100;
    const total = billVal + tip;
    outTip.textContent = `${fmtNum(tip)} (${fmtNum(pct, 2)}%)`;
    outTotal.textContent = fmtNum(total);
    outEach.textContent = fmtNum(total / n);
  }

  for (const pct of PRESETS) {
    const btn = el('button', { 'data-pct': String(pct), type: 'button' }, `${pct}%`);
    btn.addEventListener('click', () => {
      customPct.value = '';
      setPct(pct);
      haptic(5); // selection tick, same frame as the visual (matches drawer/BMI)
      calc();
    });
    seg.append(btn);
  }

  customPct.addEventListener('input', () => {
    // Honest selected state: a custom value means no preset is active.
    seg.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    calc();
  });
  bill.addEventListener('input', calc);
  people.addEventListener('input', calc);

  const stats = el(
    'div',
    { class: 'panel panel-gap' },
    el('div', { class: 'stat-row' }, el('span', { class: 'k' }, 'Tip amount'), outTip),
    el('div', { class: 'stat-row' }, el('span', { class: 'k' }, 'Total'), outTotal),
    el('div', { class: 'stat-row' }, el('span', { class: 'k' }, 'Per person'), outEach)
  );

  const copyBtn = el('button', { class: 'btn btn-secondary', type: 'button' }, 'Copy');
  copyBtn.addEventListener('click', () => {
    const billVal = parseFloat(bill.value);
    if (isNaN(billVal)) return;
    const pct = currentPct();
    const tip = (billVal * pct) / 100;
    const total = billVal + tip;
    const n = Math.max(1, Math.floor(parseFloat(people.value) || 1));
    copyText(
      `Bill: ${fmtNum(billVal)} | Tip ${fmtNum(pct, 2)}%: ${fmtNum(tip)} | Total: ${fmtNum(total)} | ${n} people → ${fmtNum(total / n)} each`
    );
  });

  const panel = el(
    'div',
    { class: 'panel' },
    el('label', { class: 'field-label' }, 'Bill amount'),
    bill,
    el('label', { class: 'field-label' }, 'Tip %'),
    seg,
    el('label', { class: 'field-label' }, 'Or custom tip %'),
    customPct,
    el('label', { class: 'field-label' }, 'Split between (people)'),
    people,
    stats,
    emptyHint,
    copyBtn
  );

  root.append(
    h('<a class="back-link" href="#/">‹ All tools</a>'),
    h('<h1 class="large-title">Tip & Bill Split</h1>'),
    h('<p class="subtitle">Calculate tip and split the bill — no ads, fully offline.</p>'),
    panel
  );

  setPct(0);
  calc();
}
