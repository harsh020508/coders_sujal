// LocalKaam — Feature 14: Multilingual Voice Booking
// Customer speaks in English/Hindi/Marathi → AI parses intent → auto-fills booking form

import { CATEGORIES, LOCALITIES } from './data.js';
import { StorageService } from './storage.js';
import { Toast } from './toast.js';
import { esc } from './utils.js';

// ─── Voice intent patterns ──────────────────────────────────────────────────

const VOICE_PATTERNS = {
  services: [
    { keywords: ['plumber', 'plumbing', 'pipe', 'tap', 'leak', 'water', 'नल', 'पाइप', 'पाणी', 'गळती', 'प्लंबर', 'नळ'],            category: 'plumber' },
    { keywords: ['electrician', 'electric', 'wire', 'switch', 'light', 'wiring', 'bijli', 'बिजली', 'वायर', 'स्विच', 'विजेरी', 'वीज'], category: 'electrician' },
    { keywords: ['carpenter', 'wood', 'door', 'furniture', 'lock', 'hinge', 'सुतार', 'दरवाजा', 'लाकूड', 'कारपेंटर', 'दरवाज़ा'],     category: 'carpenter' },
    { keywords: ['painter', 'paint', 'wall', 'colour', 'color', 'रंगारी', 'रंग', 'दीवार', 'पेंटर', 'भिंत'],                        category: 'painter' },
    { keywords: ['ac', 'air condition', 'ac repair', 'cooling', 'एसी', 'ठंडक', 'वातानुकूलन'],                                       category: 'ac_repair' },
    { keywords: ['cleaning', 'clean', 'sweep', 'mop', 'सफाई', 'झाडू', 'साफ', 'स्वच्छता'],                                           category: 'cleaning' },
    { keywords: ['appliance', 'fridge', 'washing machine', 'microwave', 'repair', 'उपकरण', 'दुरुस्ती', 'फ्रिज'],                    category: 'appliance_repair' },
    { keywords: ['pest', 'cockroach', 'termite', 'rat', 'कीड', 'झुरळ', 'उंदीर', 'pest control'],                                   category: 'pest_control' },
    { keywords: ['shifting', 'move', 'packers', 'movers', 'transport', 'स्थलांतर', 'हलणे'],                                         category: 'shifting' },
  ],
  urgency: [
    { keywords: ['now', 'immediately', 'urgent', 'emergency', 'asap', 'तुरंत', 'आत्ता', 'लवकर', 'अभी', 'जल्दी'], urgency: 'high' },
    { keywords: ['today', 'this morning', 'this evening', 'आज', 'आज सकाळी', 'आज संध्याकाळी'],                      urgency: 'medium' },
    { keywords: ['tomorrow', 'next week', 'schedule', 'उद्या', 'पुढच्या आठवड्यात'],                                urgency: 'low' },
  ],
  problems: [
    { keywords: ['leaking', 'drip', 'flood', 'burst', 'गळत', 'टपकत'],     hint: 'Leaking / Water issue' },
    { keywords: ['no power', 'tripped', 'short circuit', 'fuse', 'ट्रिप'],  hint: 'No power / Electrical fault' },
    { keywords: ['stuck', 'broken', 'not working', 'काम नाही', 'खराब'],    hint: 'Not working / Broken' },
    { keywords: ['install', 'fit', 'new', 'लावणे', 'नवीन'],                 hint: 'Installation / New fitting' },
  ],
  localities: LOCALITIES.map(l => {
    const regionalAliases = {
      andheri: ['अंधेरी', 'अंधेरीत'],
      bandra: ['बांद्रा', 'वांद्रे', 'वांद्रा'],
      powai: ['पवई', 'पवईत'],
      juhu: ['जुहू', 'जुहूत'],
      malad: ['मलाड', 'मालाड'],
      colaba: ['कुलाबा', 'कोलाबा'],
      dadar: ['दादर', 'दादरला'],
      thane: ['ठाणे', 'ठाण्यात'],
    }[l.id] || [];

    return {
      keywords: [l.name.toLowerCase(), l.id, ...l.name.split(' ').map(w => w.toLowerCase()), ...regionalAliases],
      localityId: l.id,
      localityName: l.name,
    };
  }),
};

// ─── Core parser ────────────────────────────────────────────────────────────
export function parseVoiceIntent(transcript) {
  const text = (transcript || '').toLowerCase();
  const result = {
    raw: transcript,
    category: null,
    categoryName: null,
    urgency: 'medium',
    locality: null,
    localityName: null,
    problemHint: null,
    confidence: 0,
    suggestions: [],
  };

  for (const { keywords, category } of VOICE_PATTERNS.services) {
    if (keywords.some(kw => text.includes(kw))) {
      result.category = category;
      const cat = CATEGORIES.find(c => c.id === category);
      result.categoryName = cat?.name || category;
      result.confidence += 40;
      break;
    }
  }

  for (const { keywords, urgency } of VOICE_PATTERNS.urgency) {
    if (keywords.some(kw => text.includes(kw))) {
      result.urgency = urgency;
      result.confidence += 20;
      break;
    }
  }

  for (const { keywords, hint } of VOICE_PATTERNS.problems) {
    if (keywords.some(kw => text.includes(kw))) {
      result.problemHint = hint;
      result.confidence += 20;
      break;
    }
  }

  for (const { keywords, localityId, localityName } of VOICE_PATTERNS.localities) {
    if (keywords.some(kw => text.includes(kw))) {
      result.locality = localityId;
      result.localityName = localityName;
      result.confidence += 20;
      break;
    }
  }

  if (!result.category) result.suggestions.push('Try saying the service name, e.g. "plumber" or "electrician"');
  if (!result.locality) result.suggestions.push('Mention your area, e.g. "in Andheri" or "Bandra mein"');

  return result;
}

// ─── Voice Booking UI Component ──────────────────────────────────────────────
export const VoiceBooking = {
  recognition: null,
  isListening: false,
  currentLang: 'en-IN',

  LANG_OPTIONS: [
    { code: 'en-IN', label: 'EN', fullLabel: 'English',  hint: 'e.g. "I need a plumber in Andheri"' },
    { code: 'hi-IN', label: 'हि', fullLabel: 'हिंदी',    hint: 'e.g. "मुझे अंधेरी में प्लंबर चाहिए"' },
    { code: 'mr-IN', label: 'म',  fullLabel: 'मराठी',   hint: 'e.g. "मला अंधेरीत प्लंबर हवा आहे"' },
  ],

  isSupported() {
    return typeof window !== 'undefined' &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  },

  renderButton(onBookingIntent) {
    const existing = document.getElementById('voice-booking-fab');
    if (existing) existing.remove();

    const wrap = document.createElement('div');
    wrap.id = 'voice-booking-fab';
    document.body.appendChild(wrap);

    // Inject shadow-DOM-safe styles once
    if (!document.getElementById('vb-styles')) {
      const s = document.createElement('style');
      s.id = 'vb-styles';
      s.textContent = `
        @keyframes vb-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.35); }
          50%       { box-shadow: 0 0 0 14px rgba(220,38,38,0); }
        }
        @keyframes vb-fadein {
          from { opacity:0; transform:translateY(10px) scale(.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        #vb-fab {
          position:fixed; bottom:88px; right:24px; z-index:1000;
          width:52px; height:52px; border-radius:50%;
          background:var(--accent-primary); color:#fff;
          border:none; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 4px 16px rgba(0,0,0,0.2);
          transition:transform .2s, box-shadow .2s;
          font-size:20px;
        }
        #vb-fab:hover { transform:scale(1.08); box-shadow:0 6px 24px rgba(0,0,0,0.26); }
        #vb-fab[data-active="true"] { background:#dc2626; animation:vb-pulse 1.4s ease-in-out infinite; }
        #vb-panel {
          position:fixed; bottom:152px; right:24px; z-index:1001;
          width:min(360px, calc(100vw - 32px));
          background:var(--bg-card); border:1px solid var(--border-color);
          border-radius:16px; box-shadow:0 12px 48px rgba(0,0,0,0.18);
          animation:vb-fadein .2s ease;
          display:flex; flex-direction:column;
          overflow:hidden;
        }
        .vb-lang-btn {
          padding:5px 12px; border-radius:20px; font-size:0.78rem; font-weight:600;
          border:1px solid var(--border-color); background:var(--bg-secondary);
          color:var(--text-secondary); cursor:pointer; transition:all .15s;
        }
        .vb-lang-btn.active {
          background:var(--accent-primary); color:#fff; border-color:transparent;
        }
        .vb-mic-ring {
          width:72px; height:72px; border-radius:50%; border:2px solid var(--border-color);
          background:var(--bg-secondary); display:flex; align-items:center; justify-content:center;
          margin:0 auto; cursor:pointer; font-size:28px; transition:all .25s;
          user-select:none;
        }
        .vb-mic-ring:hover { border-color:var(--accent-primary); background:var(--bg-card); }
        .vb-mic-ring.listening {
          border-color:#dc2626; background:#fef2f2;
          animation:vb-pulse 1.2s ease-in-out infinite;
        }
        .vb-transcript {
          margin:10px 0 0;
          padding:10px 14px;
          border-radius:10px;
          background:var(--bg-secondary);
          border:1px solid var(--border-color);
          font-size:0.84rem; color:var(--text-primary);
          font-style:italic; line-height:1.5; min-height:42px;
        }
        .vb-intent-row {
          display:flex; align-items:center; gap:10px;
          padding:9px 12px; border-radius:10px;
          background:var(--bg-secondary); margin-bottom:6px;
        }
        .vb-intent-icon { font-size:18px; flex-shrink:0; }
        .vb-intent-label { font-size:0.72rem; color:var(--text-muted); margin-bottom:1px; }
        .vb-intent-value { font-size:0.9rem; font-weight:700; color:var(--text-primary); }
        .vb-error-box {
          padding:10px 14px; border-radius:10px;
          background:#fef2f2; border:1px solid #fecaca;
          font-size:0.83rem; color:#b91c1c; line-height:1.5;
        }
        .vb-confirm-btn {
          width:100%; padding:11px; border-radius:10px; border:none;
          background:var(--accent-primary); color:#fff;
          font-size:0.9rem; font-weight:700; cursor:pointer;
          transition:opacity .15s;
        }
        .vb-confirm-btn:hover { opacity:.88; }
        .vb-retry-btn {
          width:100%; padding:9px; border-radius:10px; margin-top:8px;
          border:1px solid var(--border-color); background:var(--bg-secondary);
          color:var(--text-secondary); font-size:0.85rem; cursor:pointer;
          transition:all .15s;
        }
        .vb-retry-btn:hover { border-color:var(--accent-primary); color:var(--accent-primary); }
      `;
      document.head.appendChild(s);
    }

    // Build FAB button
    const fab = document.createElement('button');
    fab.id = 'vb-fab';
    fab.setAttribute('aria-label', 'Book a service with voice');
    fab.setAttribute('title', 'Voice booking');
    fab.textContent = '🎤';
    wrap.appendChild(fab);

    let panel = null;
    let parsedIntent = null;

    const closePanel = () => {
      if (panel) {
        panel.remove();
        panel = null;
      }
      this.stop();
      fab.dataset.active = 'false';
      fab.textContent = '🎤';
    };

    const openPanel = () => {
      if (panel) { closePanel(); return; }
      panel = this._buildPanel({
        onClose: closePanel,
        onLangChange: (code) => {
          this.currentLang = code;
          if (panel) { panel.remove(); panel = null; }
          this.stop();
          openPanel();
        },
        onIntent: (intent) => {
          parsedIntent = intent;
          closePanel();
          if (onBookingIntent) onBookingIntent(intent);
        },
      });
      document.body.appendChild(panel);
    };

    fab.addEventListener('click', (e) => { e.stopPropagation(); openPanel(); });

    document.addEventListener('click', (e) => {
      if (panel && !panel.contains(e.target) && e.target !== fab) closePanel();
    }, { capture: true });
  },

  _buildPanel({ onClose, onLangChange, onIntent }) {
    const currentLangObj = this.LANG_OPTIONS.find(l => l.code === this.currentLang) || this.LANG_OPTIONS[0];
    const supported = this.isSupported();

    const panel = document.createElement('div');
    panel.id = 'vb-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Voice booking');

    panel.innerHTML = `
      <!-- Header -->
      <div style="padding:14px 18px 12px;border-bottom:1px solid var(--border-color);display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <div>
          <div style="font-weight:800;font-size:0.95rem;color:var(--text-primary);">Voice Booking</div>
          <div style="font-size:0.72rem;color:var(--text-muted);margin-top:1px;">${esc(currentLangObj.hint)}</div>
        </div>
        <button id="vb-close" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:20px;line-height:1;padding:2px 6px;" aria-label="Close">×</button>
      </div>

      <!-- Language tabs -->
      <div style="padding:10px 18px;border-bottom:1px solid var(--border-color);display:flex;gap:6px;">
        ${this.LANG_OPTIONS.map(l => `
          <button class="vb-lang-btn${this.currentLang === l.code ? ' active' : ''}" data-lang="${esc(l.code)}" title="${esc(l.fullLabel)}">
            ${esc(l.label)}
          </button>
        `).join('')}
      </div>

      <!-- Mic area -->
      <div id="vb-mic-area" style="padding:20px 18px 16px;text-align:center;">
        <div class="vb-mic-ring" id="vb-mic-ring" role="button" tabindex="0" aria-label="Start voice recognition">
          🎤
        </div>
        <div id="vb-status" style="margin-top:12px;font-size:0.83rem;color:var(--text-muted);line-height:1.5;">
          ${supported ? 'Tap the mic and speak your request' : 'Voice recognition not supported in this browser.<br>Please type your request below.'}
        </div>
        <div id="vb-transcript" class="vb-transcript" style="display:none;"></div>
      </div>

      <!-- Text input (always shown as a clean alternative) -->
      <div style="padding:0 18px 16px;">
        <div style="font-size:0.72rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Or type your request</div>
        <div style="display:flex;gap:8px;">
          <input id="vb-text-input" type="text"
            placeholder="${esc(currentLangObj.hint.replace(/^e\.g\.\s*"|"$/g, ''))}"
            style="flex:1;padding:8px 12px;border:1px solid var(--border-color);border-radius:8px;font-size:0.84rem;background:var(--bg-secondary);color:var(--text-primary);outline:none;min-width:0;"
          />
          <button id="vb-text-submit" style="padding:8px 14px;border-radius:8px;border:none;background:var(--accent-primary);color:#fff;font-size:0.84rem;font-weight:600;cursor:pointer;white-space:nowrap;">
            Go
          </button>
        </div>
      </div>

      <!-- Intent result (hidden until parsed) -->
      <div id="vb-result" style="display:none;padding:0 18px 4px;border-top:1px solid var(--border-color);padding-top:14px;"></div>

      <!-- Action buttons (hidden until intent ready) -->
      <div id="vb-actions" style="display:none;padding:12px 18px 16px;">
        <button class="vb-confirm-btn" id="vb-confirm">Book This Service</button>
        <button class="vb-retry-btn" id="vb-retry">Start Over</button>
      </div>
    `;

    // ── Wire events ──
    panel.querySelector('#vb-close').addEventListener('click', onClose);

    panel.querySelectorAll('.vb-lang-btn').forEach(btn => {
      btn.addEventListener('click', () => onLangChange(btn.dataset.lang));
    });

    const micRing     = panel.querySelector('#vb-mic-ring');
    const statusEl    = panel.querySelector('#vb-status');
    const transcriptEl = panel.querySelector('#vb-transcript');
    const resultEl    = panel.querySelector('#vb-result');
    const actionsEl   = panel.querySelector('#vb-actions');
    const textInput   = panel.querySelector('#vb-text-input');
    const textSubmit  = panel.querySelector('#vb-text-submit');
    let intent        = null;

    const setStatus = (msg, color = 'var(--text-muted)') => {
      statusEl.innerHTML = msg;
      statusEl.style.color = color;
    };

    const showResult = (parsed) => {
      intent = parsed;
      resultEl.style.display = 'block';
      actionsEl.style.display = 'block';
      resultEl.innerHTML = this._renderIntent(parsed);
      if (typeof window.refreshIcons === 'function') window.refreshIcons();
    };

    const handleText = (text) => {
      transcriptEl.style.display = 'block';
      transcriptEl.textContent = `"${text}"`;
      setStatus('Understood. Review below:', '#059669');
      showResult(parseVoiceIntent(text));
    };

    const resetState = () => {
      micRing.classList.remove('listening');
      micRing.textContent = '🎤';
      transcriptEl.style.display = 'none';
      transcriptEl.textContent = '';
      resultEl.style.display = 'none';
      actionsEl.style.display = 'none';
      intent = null;
      textInput.value = '';
      setStatus(supported ? 'Tap the mic and speak your request' : 'Voice recognition not supported in this browser.<br>Please type your request below.');
    };

    // Mic button
    const toggleMic = () => {
      if (!supported) {
        setStatus('Voice recognition is not supported in this browser. Please use the text input below.', '#d97706');
        textInput.focus();
        return;
      }

      if (this.isListening) {
        this.stop();
        micRing.classList.remove('listening');
        micRing.textContent = '🎤';
        setStatus('Tap the mic and speak your request');
        return;
      }

      micRing.classList.add('listening');
      micRing.textContent = '🔴';
      setStatus('Listening… speak now', '#dc2626');
      transcriptEl.style.display = 'block';
      transcriptEl.textContent = '…';
      resultEl.style.display = 'none';
      actionsEl.style.display = 'none';

      this.start(
        this.currentLang,
        (interim) => { transcriptEl.textContent = `"${interim}"`; },
        (final)   => {
          micRing.classList.remove('listening');
          micRing.textContent = '🎤';
          handleText(final);
        },
        (msg, code) => {
          micRing.classList.remove('listening');
          micRing.textContent = '🎤';
          transcriptEl.style.display = 'none';
          const friendlyMsg = {
            'no-speech':   'No speech detected. Please try again.',
            'not-allowed': 'Microphone access denied.<br>Allow microphone access in your browser settings and try again.',
            'network':     'Could not connect to speech service.<br>Check your internet connection or use the text input below.',
          }[code] || `Speech error: ${msg}`;
          setStatus(friendlyMsg, '#dc2626');
        }
      );
    };

    micRing.addEventListener('click', toggleMic);
    micRing.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMic(); } });

    // Text submit
    const submitText = () => {
      const val = textInput.value.trim();
      if (!val) { textInput.focus(); return; }
      this.stop();
      micRing.classList.remove('listening');
      micRing.textContent = '🎤';
      handleText(val);
    };
    textSubmit.addEventListener('click', submitText);
    textInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submitText(); } });

    // Confirm
    panel.querySelector('#vb-confirm').addEventListener('click', () => {
      if (!intent) return;
      if (onIntent) onIntent(intent);
    });

    // Retry
    panel.querySelector('#vb-retry').addEventListener('click', resetState);

    return panel;
  },

  _renderIntent(intent) {
    const confidenceColor = intent.confidence >= 60 ? '#059669' : intent.confidence >= 40 ? '#d97706' : '#dc2626';
    const confidenceLabel = intent.confidence >= 60 ? 'High confidence' : intent.confidence >= 40 ? 'Partial match' : 'Low confidence';

    const rows = [];

    if (intent.category) {
      rows.push(`
        <div class="vb-intent-row">
          <span class="vb-intent-icon">🔧</span>
          <div>
            <div class="vb-intent-label">Service</div>
            <div class="vb-intent-value">${esc(intent.categoryName)}</div>
          </div>
        </div>
      `);
    } else {
      rows.push(`<div class="vb-error-box">⚠ Could not detect service type. ${intent.suggestions[0] ? esc(intent.suggestions[0]) : ''}</div>`);
    }

    if (intent.locality) {
      rows.push(`
        <div class="vb-intent-row">
          <span class="vb-intent-icon">📍</span>
          <div>
            <div class="vb-intent-label">Location</div>
            <div class="vb-intent-value">${esc(intent.localityName)}</div>
          </div>
        </div>
      `);
    }

    if (intent.urgency && intent.urgency !== 'medium') {
      const icon = intent.urgency === 'high' ? '🚨' : '📅';
      rows.push(`
        <div class="vb-intent-row">
          <span class="vb-intent-icon">${icon}</span>
          <div>
            <div class="vb-intent-label">Urgency</div>
            <div class="vb-intent-value" style="text-transform:capitalize;">${esc(intent.urgency)}</div>
          </div>
        </div>
      `);
    }

    if (intent.problemHint) {
      rows.push(`
        <div class="vb-intent-row">
          <span class="vb-intent-icon">💬</span>
          <div>
            <div class="vb-intent-label">Issue</div>
            <div class="vb-intent-value">${esc(intent.problemHint)}</div>
          </div>
        </div>
      `);
    }

    return `
      <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:10px;">Detected Intent</div>
      ${rows.join('')}
      <div style="display:flex;align-items:center;gap:8px;margin-top:10px;">
        <div style="flex:1;height:4px;border-radius:999px;background:var(--border-color);overflow:hidden;">
          <div style="width:${intent.confidence}%;height:100%;background:${confidenceColor};border-radius:999px;transition:width .4s;"></div>
        </div>
        <span style="font-size:0.72rem;color:${confidenceColor};font-weight:600;white-space:nowrap;">${confidenceLabel}</span>
      </div>
      ${!intent.category && intent.suggestions.length > 1 ? `
        <div style="margin-top:8px;font-size:0.76rem;color:var(--text-muted);">
          ${intent.suggestions.slice(1).map(s => `<div>💡 ${esc(s)}</div>`).join('')}
        </div>
      ` : ''}
    `;
  },

  start(lang, onInterim, onFinal, onError) {
    if (!this.isSupported()) {
      if (onError) onError('Voice recognition not supported', 'not-supported');
      return;
    }
    this.stop();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = lang || 'en-IN';
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;
    this.recognition.continuous = false;

    this.recognition.onresult = (e) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      if (interim && onInterim) onInterim(interim);
      if (final) {
        this.transcript = final;
        if (onFinal) onFinal(final);
      }
    };

    this.recognition.onerror = (e) => {
      const msgMap = {
        'no-speech':   'No speech detected.',
        'not-allowed': 'Microphone access denied. Please allow mic access in your browser settings.',
        'network':     'Could not connect to speech service.',
      };
      if (onError) onError(msgMap[e.error] || `Error: ${e.error}`, e.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (err) {
      if (onError) onError('Could not start microphone. Please try again.', 'start-failed');
    }
  },

  stop() {
    if (this.recognition) {
      try { this.recognition.stop(); } catch (_) {}
      this.recognition = null;
    }
    this.isListening = false;
  },
};
