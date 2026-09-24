import QRCode from 'qrcode';
import { copyText, el, h, haptic, ICONS, setIcon, toast } from '../ui';
import { load, store } from '../store';

type QrItem = { v: string; ts: number };
type WifiNet = { ssid: string; pass: string; sec: string; ts: number };

const KEY_HIST = 'tk-qr-history';
const KEY_WIFI = 'tk-wifi';
const SCAN_IDLE = 'Scanning uses your camera. Generation works fully offline.';
const SCAN_LOOKING = 'Point the camera at a QR code…';
const DOTS = '••••••••';

const iconBtn = (icon: string, label: string, danger = false): HTMLButtonElement =>
  el(
    'button',
    { class: danger ? 'icon-btn danger' : 'icon-btn', type: 'button', 'aria-label': label, title: label },
    h(icon)
  );

/** Escape WIFI: payload reserved characters (\ ; , : "). */
const esc = (s: string): string => s.replace(/([\\;,:"])/g, '\\$1');

const wifiString = (sec: string, ssid: string, pass: string): string =>
  `WIFI:T:${sec};S:${esc(ssid)};${sec !== 'nopass' && pass ? `P:${esc(pass)};` : ''};`;

const dateStr = (ts: number): string => new Date(ts).toLocaleDateString();

export function render(root: HTMLElement): void {
  // ---------- Create section ----------
  const input = el('textarea', {
    rows: '3',
    placeholder: 'Enter text or a URL, e.g. https://example.com',
  }) as HTMLTextAreaElement;

  const canvas = document.createElement('canvas');
  const canvasWrap = el('div', { class: 'qr-canvas-wrap' }, canvas);
  canvasWrap.style.display = 'none';

  const emptyHint = el(
    'p',
    { class: 'hint panel-gap', style: 'text-align:center' },
    'Your QR code will appear here.'
  );

  const genErr = el('p', { class: 'inline-error' });
  genErr.hidden = true;
  const showErr = (node: HTMLElement, msg: string): void => {
    node.textContent = msg;
    node.hidden = false;
  };
  const clearErr = (node: HTMLElement): void => {
    node.hidden = true;
  };

  // ---------- History (saved generations, this device only) ----------
  const historyEmpty = el(
    'p',
    { class: 'list-empty' },
    'Nothing saved yet — QR codes you create are remembered here, on this device only.'
  );
  const historyList = el('div', {});

  function renderHistory(): void {
    const items = load<QrItem[]>(KEY_HIST, []);
    historyEmpty.hidden = items.length > 0;
    historyList.replaceChildren();
    for (const item of items) {
      const row = el(
        'div',
        { class: 'list-row' },
        el(
          'div',
          { class: 'list-main' },
          el('span', { class: 'list-title', title: item.v }, item.v),
          el('span', { class: 'list-sub' }, dateStr(item.ts))
        )
      );
      const actions = el('div', { class: 'list-actions' });
      const reuse = iconBtn(ICONS.reload, 'Show this code again');
      reuse.addEventListener('click', () => {
        input.value = item.v;
        generate();
        input.scrollIntoView({ block: 'nearest' });
      });
      const copy = iconBtn(ICONS.copy, 'Copy text');
      copy.addEventListener('click', () => copyText(item.v));
      const del = iconBtn(ICONS.trash, 'Delete from history', true);
      del.addEventListener('click', () => {
        store(
          KEY_HIST,
          load<QrItem[]>(KEY_HIST, []).filter((i) => i.v !== item.v)
        );
        renderHistory();
        haptic(6);
      });
      actions.append(reuse, copy, del);
      row.append(actions);
      historyList.append(row);
    }
  }

  let histTimer = 0;
  function scheduleHistorySave(v: string): void {
    window.clearTimeout(histTimer);
    histTimer = window.setTimeout(() => {
      const items = load<QrItem[]>(KEY_HIST, []).filter((i) => i.v !== v);
      items.unshift({ v, ts: Date.now() });
      store(KEY_HIST, items.slice(0, 30));
      renderHistory();
    }, 1200);
  }

  function generate(): void {
    const text = input.value.trim();
    if (!text) {
      canvasWrap.style.display = 'none';
      emptyHint.style.display = '';
      clearErr(genErr);
      return;
    }
    QRCode.toCanvas(canvas, text, {
      width: 320,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then(() => {
        canvasWrap.style.display = '';
        emptyHint.style.display = 'none';
        clearErr(genErr);
        scheduleHistorySave(text);
      })
      .catch(() => {
        canvasWrap.style.display = 'none';
        emptyHint.style.display = '';
        showErr(genErr, 'That text is too long for one QR code — try a shorter link.');
      });
  }

  const setText = (v: string): void => {
    input.value = v;
    generate();
  };

  input.addEventListener('input', generate);

  // ---------- Wi-Fi section ----------
  const ssidInput = el('input', {
    type: 'text',
    placeholder: 'Network name (SSID)',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
  }) as HTMLInputElement;

  const wifiPassInput = el('input', {
    type: 'password',
    placeholder: 'Network password',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
  }) as HTMLInputElement;

  const wifiEye = iconBtn(ICONS.eye, 'Show password');
  wifiEye.addEventListener('click', () => {
    const show = wifiPassInput.type === 'password';
    wifiPassInput.type = show ? 'text' : 'password';
    setIcon(wifiEye, show ? ICONS.eyeOff : ICONS.eye);
    wifiEye.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });
  const passWrap = el('div', { class: 'reveal-field' }, wifiPassInput, wifiEye);

  type Sec = 'WPA' | 'WEP' | 'nopass';
  let sec: Sec = 'WPA';
  const secSeg = el('div', { class: 'segmented' });
  const SEC_OPTIONS: [string, Sec][] = [
    ['WPA/WPA2', 'WPA'],
    ['WEP', 'WEP'],
    ['None (open)', 'nopass'],
  ];
  for (const [label, id] of SEC_OPTIONS) {
    const btn = el('button', { 'data-sec': id, type: 'button' }, label);
    btn.addEventListener('click', () => {
      sec = id;
      secSeg.querySelectorAll('button').forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-sec') === id);
      });
      passWrap.hidden = id === 'nopass';
      if (id === 'nopass') wifiPassInput.value = '';
    });
    secSeg.append(btn);
  }

  const wifiErr = el('p', { class: 'inline-error' });
  wifiErr.hidden = true;

  const wifiEmpty = el(
    'p',
    { class: 'list-empty' },
    'Networks you create are saved here. Tap the eye to show a password — this device only.'
  );
  const wifiList = el('div', {});

  function renderWifi(): void {
    const nets = load<WifiNet[]>(KEY_WIFI, []);
    wifiEmpty.hidden = nets.length > 0;
    wifiList.replaceChildren();
    for (const net of nets) {
      let revealed = false;
      const sub = el('span', { class: 'list-sub mono' }, DOTS);
      const row = el(
        'div',
        { class: 'list-row' },
        el(
          'div',
          { class: 'list-main' },
          el('span', { class: 'list-title', title: net.ssid }, net.ssid),
          sub,
          el('span', { class: 'list-sub' }, `${net.sec === 'nopass' ? 'Open network' : 'Saved'} · ${dateStr(net.ts)}`)
        )
      );
      const actions = el('div', { class: 'list-actions' });

      const eye = iconBtn(ICONS.eye, 'Show password');
      eye.addEventListener('click', () => {
        revealed = !revealed;
        sub.textContent = revealed ? net.pass || '(no password)' : DOTS;
        setIcon(eye, revealed ? ICONS.eyeOff : ICONS.eye);
        eye.setAttribute('aria-label', revealed ? 'Hide password' : 'Show password');
      });

      const share = iconBtn(ICONS.wifi, 'Create join QR for this network');
      share.addEventListener('click', () => {
        setText(wifiString(net.sec, net.ssid, net.pass));
        input.scrollIntoView({ block: 'nearest' });
        toast('Wi-Fi QR ready');
      });

      const copy = iconBtn(ICONS.copy, 'Copy password');
      copy.addEventListener('click', () => {
        if (net.pass) copyText(net.pass);
        else toast('Open network — no password');
      });

      const del = iconBtn(ICONS.trash, 'Forget network', true);
      del.addEventListener('click', () => {
        store(
          KEY_WIFI,
          load<WifiNet[]>(KEY_WIFI, []).filter(
            (n) => !(n.ssid === net.ssid && n.pass === net.pass && n.ts === net.ts)
          )
        );
        renderWifi();
        haptic(6);
      });

      actions.append(eye, share, copy, del);
      row.append(actions);
      wifiList.append(row);
    }
  }

  const createWifiBtn = el(
    'button',
    { class: 'btn btn-primary', type: 'button' },
    h(ICONS.wifi),
    ' Create Wi-Fi QR'
  );

  createWifiBtn.addEventListener('click', () => {
    const ssid = ssidInput.value.trim();
    if (!ssid) {
      showErr(wifiErr, 'Enter the network name (SSID) first.');
      ssidInput.focus();
      return;
    }
    clearErr(wifiErr);
    const pass = sec === 'nopass' ? '' : wifiPassInput.value;
    setText(wifiString(sec, ssid, pass));

    const nets = load<WifiNet[]>(KEY_WIFI, []).filter(
      (n) => !(n.ssid === ssid && n.pass === pass)
    );
    nets.unshift({ ssid, pass, sec, ts: Date.now() });
    store(KEY_WIFI, nets.slice(0, 20));
    renderWifi();
    wifiPassInput.value = ''; // don't linger in the field
    toast('Wi-Fi QR ready — scan with your phone camera to join');
    haptic(8);
  });

  // ---------- Scan section ----------
  const video = document.createElement('video');
  video.setAttribute('playsinline', '');
  const videoWrap = el('div', { class: 'qr-video-wrap' }, video);
  const scanResult = el('input', {
    type: 'text',
    readonly: '',
    placeholder: 'Scanned result appears here',
  }) as HTMLInputElement;
  const scanNote = el('p', { class: 'hint' }, SCAN_IDLE);
  const scanErr = el('p', { class: 'inline-error' });
  scanErr.hidden = true;
  const scanBtn = el(
    'button',
    { class: 'btn btn-primary', type: 'button' },
    h(ICONS.camera),
    ' Start scanner'
  );

  const supported = 'BarcodeDetector' in window;
  if (!supported) {
    scanBtn.hidden = true;
    scanNote.textContent =
      "QR scanning isn't available in this browser — try Chrome on Android. Generation still works offline.";
  }

  let stream: MediaStream | null = null;
  let raf = 0;
  let detector: { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } | null = null;

  function stopScanner(): void {
    cancelAnimationFrame(raf);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    videoWrap.style.display = 'none';
    scanBtn.replaceChildren(h(ICONS.camera), ' Start scanner');
    if (supported) scanNote.textContent = SCAN_IDLE;
  }

  async function startScanner(): Promise<void> {
    clearErr(scanErr);
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      video.srcObject = stream;
      await video.play();
      videoWrap.style.display = 'block';
      scanBtn.replaceChildren(h(ICONS.stop), ' Stop scanner');
      scanNote.textContent = SCAN_LOOKING;

      const Det = (window as unknown as {
        BarcodeDetector: new (o: { formats: string[] }) => {
          detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
        };
      }).BarcodeDetector;
      detector = new Det({ formats: ['qr_code'] });

      const tick = async (): Promise<void> => {
        if (!stream || !detector) return;
        try {
          const codes = await detector.detect(video);
          if (codes.length > 0 && codes[0].rawValue) {
            scanResult.value = codes[0].rawValue;
            stopScanner();
            toast('QR code found');
            haptic(10);
            return;
          }
        } catch {
          // frame not ready; keep going
        }
        raf = requestAnimationFrame(() => void tick());
      };
      void tick();
    } catch (err) {
      const denied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      showErr(
        scanErr,
        denied
          ? 'Camera access was denied. Allow camera permission in your browser settings, then try again.'
          : "Couldn't start the camera on this device."
      );
      stopScanner();
    }
  }

  scanBtn.addEventListener('click', () => {
    if (stream) stopScanner();
    else void startScanner();
  });

  const copyScan = el('button', { class: 'btn btn-secondary', type: 'button' }, 'Copy');
  copyScan.addEventListener('click', () => scanResult.value && copyText(scanResult.value));

  // ---------- Assembly ----------
  const createPanel = el(
    'div',
    { class: 'panel' },
    el('label', { class: 'field-label' }, 'Create — text or URL'),
    input,
    genErr,
    el('div', { class: 'panel-gap' }, canvasWrap, emptyHint)
  );

  const historyPanel = el(
    'div',
    { class: 'panel panel-gap' },
    el('label', { class: 'field-label' }, 'History'),
    historyEmpty,
    historyList
  );

  const wifiPanel = el(
    'div',
    { class: 'panel panel-gap' },
    el('label', { class: 'field-label' }, 'Wi-Fi — create a join code'),
    ssidInput,
    el('label', { class: 'field-label' }, 'Password'),
    passWrap,
    el('label', { class: 'field-label' }, 'Security'),
    secSeg,
    wifiErr,
    createWifiBtn,
    el(
      'p',
      { class: 'hint' },
      'Open the code with your phone camera to join the network — no typing. Passwords are kept in this browser only; don’t save networks you don’t control.'
    ),
    el('label', { class: 'field-label' }, 'Saved Wi-Fi passwords'),
    wifiEmpty,
    wifiList
  );

  const scanPanel = el(
    'div',
    { class: 'panel panel-gap' },
    el('label', { class: 'field-label' }, 'Scan with camera'),
    scanBtn,
    scanNote,
    scanErr,
    videoWrap,
    el('label', { class: 'field-label' }, 'Scan result'),
    scanResult,
    copyScan
  );

  root.append(
    h('<a class="back-link" href="#/">‹ All tools</a>'),
    h('<h1 class="large-title">QR Codes</h1>'),
    h('<p class="subtitle">Scan first — or create and save your own codes. Private and offline.</p>'),
    // Scan gets top billing, connection (Wi-Fi) sits above generation:
    // scan → Wi-Fi → create → history
    scanPanel,
    wifiPanel,
    createPanel,
    historyPanel
  );

  renderHistory();
  renderWifi();
  secSeg.querySelector<HTMLButtonElement>('[data-sec="WPA"]')?.classList.add('active');
}
