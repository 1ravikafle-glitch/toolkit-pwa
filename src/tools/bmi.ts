import { el, fmtNum, h, haptic } from '../ui';

type Mode = 'metric' | 'imperial' | 'hybrid';
type Sex = 'woman' | 'man';

/** Commonly cited healthy BMI ranges by sex (guidance, not diagnosis). */
const RANGES: Record<Sex, { min: number; max: number; label: string }> = {
  woman: { min: 18.5, max: 24.9, label: 'women' },
  man: { min: 20, max: 25, label: 'men' },
};

type Advice = { tips: string[]; note: string };

const DISCLAIMER =
  'BMI is a screening number, not a diagnosis. It can’t tell muscle from fat and doesn’t apply to children, pregnancy, or highly muscular builds. For personal advice, talk to a healthcare professional.';

const ADVICE: Record<string, Advice> = {
  under: {
    tips: [
      'Try frequent, nutrient-dense meals — nuts, whole grains, dairy and eggs add up quickly.',
      'Pair light strength training with protein at each meal to build healthy weight.',
      'Losing weight without trying is worth a doctor’s visit.',
    ],
    note: 'Below the healthy range for most adults.',
  },
  normal: {
    tips: [
      'Keep your routine: about 150 minutes of moderate activity a week maintains it.',
      'Strength training twice a week protects muscle and bone as you age.',
      'Sleep 7–9 hours — it quietly drives weight, hunger and mood.',
    ],
    note: 'Within the healthy range for your height.',
  },
  over: {
    tips: [
      'Small, steady changes beat crash diets — aim for about 0.5 kg a week.',
      'A daily 30-minute walk is the simplest habit that actually sticks.',
      'Cut liquid calories first — sodas, juices and fancy coffees add up fast.',
    ],
    note: 'Above the healthy range for most adults.',
  },
  obese: {
    tips: [
      'Consider talking with a healthcare professional for a plan that fits you.',
      'Start with low-impact movement — walking, swimming or chair exercises.',
      'Set small weekly goals; measurable progress beats big resolutions.',
    ],
    note: 'Well above the healthy range for most adults.',
  },
};

function category(bmi: number): { key: keyof typeof ADVICE; text: string; color: string } {
  if (bmi < 18.5) return { key: 'under', text: 'Underweight', color: 'var(--accent)' };
  if (bmi < 25) return { key: 'normal', text: 'Normal weight', color: 'var(--green)' };
  if (bmi < 30) return { key: 'over', text: 'Overweight', color: 'var(--orange)' };
  return { key: 'obese', text: 'Obese', color: 'var(--red-text)' };
}

export function render(root: HTMLElement): void {
  let mode: Mode = 'metric';
  let sex: Sex = 'woman';

  const unitSeg = el('div', { class: 'segmented' });

  const mkNum = (ph: string): HTMLInputElement =>
    el('input', { type: 'number', step: 'any', min: '0', inputmode: 'decimal', placeholder: ph }) as HTMLInputElement;

  const heightCm = mkNum('170');
  const weightKg = mkNum('65');
  const heightFt = mkNum('5');
  const heightIn = mkNum('7');
  const weightLb = mkNum('143');
  // Hybrid mode owns its own inputs (a DOM node can only live in one parent)
  const heightFt2 = mkNum('5');
  const heightIn2 = mkNum('7');
  const weightKg2 = mkNum('65');

  const field = (label: string, input: HTMLInputElement): HTMLElement =>
    el('div', { class: 'field' }, el('label', { class: 'field-label' }, label), input);

  const metricFields = el(
    'div',
    {},
    el(
      'div',
      { class: 'input-row' },
      field('Height (cm)', heightCm),
      field('Weight (kg)', weightKg)
    )
  );

  const imperialFields = el(
    'div',
    {},
    el(
      'div',
      { class: 'input-row' },
      field('Feet', heightFt),
      field('Inches', heightIn),
      field('Weight (lb)', weightLb)
    )
  );

  const hybridFields = el(
    'div',
    {},
    el(
      'div',
      { class: 'input-row' },
      field('Feet', heightFt2),
      field('Inches', heightIn2),
      field('Weight (kg)', weightKg2)
    )
  );

  const outValue = el('div', { class: 'result-value' }, '—');
  const outLabel = el('div', { class: 'result-label' }, 'Your BMI');
  const outCat = el('div', { class: 'result-sub' }, 'Enter your stats');

  const tipsTitle = el('div', { class: 'result-label' }, 'Your healthy range');
  const rangeEl = el('p', { class: 'hint range-line' }, '');
  const weightRangeEl = el('p', { class: 'hint range-line' }, '');
  weightRangeEl.hidden = true;
  const tipsNote = el('p', { class: 'hint tips-note' }, '');
  const tipsList = el('ul', { class: 'tips-list' });
  const tipsEmpty = el(
    'p',
    { class: 'list-empty' },
    'Enter your height and weight to see your BMI, your verdict and tailored tips.'
  );
  const disclaimerEl = el('p', { class: 'hint' }, DISCLAIMER);

  /** Height in cm from whichever field group is visible, or null. */
  function heightCmValue(): number | null {
    if (mode === 'metric') {
      const cm = parseFloat(heightCm.value);
      return cm > 0 ? cm : null;
    }
    const ftInput = mode === 'imperial' ? heightFt : heightFt2;
    const inInput = mode === 'imperial' ? heightIn : heightIn2;
    const ft = parseFloat(ftInput.value);
    const inch = parseFloat(inInput.value);
    if (isNaN(ft) && isNaN(inch)) return null;
    const totalIn = (isNaN(ft) ? 0 : ft) * 12 + (isNaN(inch) ? 0 : inch);
    return totalIn > 0 ? totalIn * 2.54 : null;
  }

  /** Range guidance shown BEFORE calculating — BMI band + weight band for height. */
  function updateRangeText(): void {
    const g = RANGES[sex];
    rangeEl.textContent = `Healthy BMI for ${g.label}: ${g.min} – ${g.max}`;
    const cm = heightCmValue();
    if (cm === null) {
      weightRangeEl.hidden = true;
      return;
    }
    const m = cm / 100;
    const kgMin = g.min * m * m;
    const kgMax = g.max * m * m;
    weightRangeEl.textContent = `Healthy weight at this height: ${fmtNum(kgMin, 1)}–${fmtNum(kgMax, 1)} kg (${Math.round(kgMin * 2.20462)}–${Math.round(kgMax * 2.20462)} lb)`;
    weightRangeEl.hidden = false;
  }

  function setTips(bmi: number | null): void {
    if (bmi === null) {
      tipsNote.textContent = '';
      tipsList.replaceChildren();
      tipsEmpty.hidden = false;
      return;
    }
    const c = category(bmi);
    const advice = ADVICE[c.key];
    tipsNote.textContent = `${c.text} — ${advice.note}`;
    tipsNote.style.color = c.color;
    tipsNote.style.fontWeight = '600';
    tipsList.replaceChildren(...advice.tips.map((t) => el('li', {}, t)));
    tipsEmpty.hidden = true;
  }

  function calc(): void {
    let bmi: number | null = null;
    if (mode === 'metric') {
      const cm = parseFloat(heightCm.value);
      const kg = parseFloat(weightKg.value);
      if (cm > 0 && kg > 0) bmi = kg / Math.pow(cm / 100, 2);
    } else if (mode === 'imperial') {
      const ft = parseFloat(heightFt.value);
      const inch = parseFloat(heightIn.value);
      const totalIn = (isNaN(ft) ? 0 : ft) * 12 + (isNaN(inch) ? 0 : inch);
      const lb = parseFloat(weightLb.value);
      if (totalIn > 0 && lb > 0) bmi = (703 * lb) / (totalIn * totalIn);
    } else {
      const ft = parseFloat(heightFt2.value);
      const inch = parseFloat(heightIn2.value);
      const totalIn = (isNaN(ft) ? 0 : ft) * 12 + (isNaN(inch) ? 0 : inch);
      const kg = parseFloat(weightKg2.value);
      if (totalIn > 0 && kg > 0) {
        const m = totalIn * 0.0254;
        bmi = kg / (m * m);
      }
    }

    if (bmi === null) {
      outValue.textContent = '—';
      outCat.textContent = 'Enter your stats';
      outCat.style.color = '';
      setTips(null);
      updateRangeText();
      return;
    }
    outValue.textContent = fmtNum(bmi, 1);
    const c = category(bmi);
    const g = RANGES[sex];
    // Verdict measured against the sex-specific healthy range.
    let note: string;
    if (bmi < g.min) {
      note = `${bmi < 18.5 ? c.text : 'Below your healthy range'} — ${fmtNum(g.min - bmi, 1)} below the floor (${fmtNum(g.min, 1)}).`;
      outCat.style.color = bmi < 18.5 ? c.color : 'var(--orange)';
    } else if (bmi > g.max) {
      note = `${c.text} — ${fmtNum(bmi - g.max, 1)} above the ceiling (${fmtNum(g.max, 1)}).`;
      outCat.style.color = c.color;
    } else {
      note = `${c.text} — within your healthy range (${fmtNum(g.min, 1)}–${fmtNum(g.max, 1)}).`;
      outCat.style.color = 'var(--green)';
    }
    outCat.textContent = note;
    outCat.style.fontWeight = '600';
    setTips(bmi);
    updateRangeText();
  }

  const MODES: [string, Mode][] = [
    ['cm · kg', 'metric'],
    ['ft · in · lb', 'imperial'],
    ['ft · in · kg', 'hybrid'],
  ];

  const sexSeg = el('div', { class: 'segmented' });
  for (const [label, id] of [
    ['Woman', 'woman'],
    ['Man', 'man'],
  ] as [string, Sex][]) {
    const btn = el('button', { 'data-sex': id, type: 'button' }, label);
    btn.addEventListener('click', () => {
      sex = id;
      sexSeg.querySelectorAll('button').forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-sex') === id);
      });
      haptic(5); // selection tick
      calc();
    });
    sexSeg.append(btn);
  }

  for (const [label, id] of MODES) {
    const btn = el('button', { 'data-mode': id, type: 'button' }, label);
    btn.addEventListener('click', () => {
      mode = id;
      unitSeg.querySelectorAll('button').forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-mode') === id);
      });
      metricFields.hidden = id !== 'metric';
      imperialFields.hidden = id !== 'imperial';
      hybridFields.hidden = id !== 'hybrid';
      calc();
    });
    unitSeg.append(btn);
  }

  for (const input of [heightCm, weightKg, heightFt, heightIn, weightLb, heightFt2, heightIn2, weightKg2]) {
    input.addEventListener('input', calc);
  }

  const tipsPanel = el(
    'div',
    { class: 'panel panel-gap' },
    tipsTitle,
    rangeEl,
    weightRangeEl,
    tipsEmpty,
    tipsNote,
    tipsList,
    disclaimerEl
  );

  const panel = el(
    'div',
    { class: 'panel' },
    el('label', { class: 'field-label' }, 'Units'),
    unitSeg,
    el('label', { class: 'field-label' }, 'Healthy range for'),
    sexSeg,
    el('label', { class: 'field-label' }, 'Your measurements'),
    metricFields,
    imperialFields,
    hybridFields,
    el('div', { class: 'result-card' }, outLabel, outValue, outCat)
  );

  root.append(
    h('<a class="back-link" href="#/">‹ All tools</a>'),
    h('<h1 class="large-title">BMI Calculator</h1>'),
    h('<p class="subtitle">Body mass index in the units you think in — plus what to do next.</p>'),
    panel,
    tipsPanel
  );

  // Default to the requested ft · in + kg combination, woman range.
  sexSeg.querySelector<HTMLButtonElement>('[data-sex="woman"]')?.classList.add('active');
  (unitSeg.querySelector('[data-mode="hybrid"]') as HTMLButtonElement).click();
  updateRangeText();
}
