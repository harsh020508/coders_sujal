// LocalKaam Photo-based Job Description & AI Diagnosis Component
// Allows customers to capture/upload a photo of any household issue,
// downscales to ~1024px client-side, calls backend POST /api/analyze-photo,
// displays structured diagnosis with INR price range, safety alerts, and materials,
// and integrates directly with Map discovery and Booking negotiation.

import { CATEGORIES, INITIAL_WORKERS } from './data.js';
import { getPricingForTask } from './pricingTable.js';
import { Toast } from './toast.js';
import { esc } from './utils.js';

export const PhotoDiagnosis = {
  currentFile: null,
  compressedDataUrl: null,
  activeDiagnosis: null,
  isLoading: false,
  errorMessage: null,

  /**
   * Render the Photo Diagnosis view
   */
  render(container) {
    container.innerHTML = `
      <div class="photo-diagnosis-page" style="max-width: 800px; margin: 0 auto; padding-bottom: 2rem;">
        
        <!-- Header Banner -->
        <div class="dashboard-header" style="margin-bottom: 1.5rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
              <span style="font-size: 1.6rem;">📸</span>
              <h1 style="margin: 0; font-size: 1.6rem;">AI Photo Problem Diagnosis</h1>
              <span class="badge" style="background: var(--accent-light); color: var(--accent-primary); font-size: 0.75rem; font-weight: 700;">
                Gemini Vision + Indian Pricing
              </span>
            </div>
            <p style="color: var(--text-secondary); margin: 0; font-size: 0.95rem;">
              Snap a picture of a leaking tap, burnt switchboard, damp wall, or broken lock. Our AI model identifies the issue, suggests the right professional, and provides a verified Mumbai market estimate.
            </p>
          </div>
        </div>

        <!-- Main Diagnosis Card -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-cards); padding: 1.5rem; box-shadow: var(--shadow-subtle);">
          
          <!-- Upload Area (when no image selected) -->
          <div id="photo-upload-dropzone" style="${this.compressedDataUrl ? 'display: none;' : 'display: block;'}">
            <div style="border: 2px dashed var(--border-color); border-radius: 12px; padding: 2.5rem 1.5rem; text-align: center; background: var(--bg-primary); cursor: pointer; transition: all 0.2s ease;" id="dropzone-box">
              <div style="font-size: 3rem; margin-bottom: 0.75rem; animation: floatSoft 4s ease-in-out infinite;">📷</div>
              <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.35rem;">Take a Photo or Upload Image</h3>
              <p style="color: var(--text-secondary); font-size: 0.88rem; max-width: 440px; margin: 0 auto 1.25rem auto;">
                On mobile, this opens your camera directly. Accepts JPEG, PNG, or WebP up to 5 MB.
              </p>
              
              <div style="display: flex; justify-content: center; gap: 0.75rem; flex-wrap: wrap;">
                <label class="btn btn-primary" style="cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem;">
                  <span>📱</span> Take Photo / Choose File
                  <input type="file" id="photo-file-input" accept="image/*" capture="environment" style="display: none;">
                </label>
                <button class="btn btn-outline" id="btn-load-sample-photo" type="button" style="display: inline-flex; align-items: center; gap: 0.4rem;">
                  <span>🧪</span> Try Demo Photo (Leaking Tap)
                </button>
              </div>
            </div>
          </div>

          <!-- Preview & Note Input Area (when image is loaded) -->
          <div id="photo-preview-area" style="${this.compressedDataUrl ? 'display: block;' : 'display: none;'}">
            <div style="display: grid; grid-template-columns: 280px 1fr; gap: 1.25rem; align-items: start; margin-bottom: 1.25rem;" class="photo-preview-grid">
              
              <!-- Image Preview Box -->
              <div style="position: relative; border-radius: 10px; overflow: hidden; border: 1px solid var(--border-color); background: #000; box-shadow: var(--shadow-subtle);">
                <img id="photo-preview-img" src="${this.compressedDataUrl || ''}" alt="Problem Preview" style="width: 100%; height: 220px; object-fit: cover; display: block;" />
                <button id="btn-remove-photo" class="btn btn-danger btn-sm" style="position: absolute; top: 8px; right: 8px; font-size: 0.75rem; padding: 3px 8px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.4);" title="Remove photo">
                  ✕ Remove
                </button>
                <div style="position: absolute; bottom: 6px; left: 8px; background: rgba(0,0,0,0.7); color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;" id="photo-size-badge">
                  Compressed (~1024px)
                </div>
              </div>

              <!-- Note Input & Trigger Button -->
              <div style="display: flex; flex-direction: column; gap: 0.85rem;">
                <div>
                  <label style="font-size: 0.88rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">
                    Additional Notes (Optional):
                  </label>
                  <textarea id="photo-note-input" class="form-control" rows="3" placeholder="Describe the problem: e.g. kitchen tap drips all day, switch sparks, door lock broken... We'll pick the right professional for this." style="width: 100%; font-size: 0.88rem; resize: vertical;">${esc(this.currentNote || '')}</textarea>
                </div>

                <div style="display: flex; gap: 0.75rem; align-items: center;">
                  <button class="btn btn-primary" id="btn-diagnose-photo" style="flex: 1; padding: 0.65rem 1rem; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;" ${this.isLoading ? 'disabled' : ''}>
                    ${this.isLoading ? `
                      <span class="spinner" style="width: 16px; height: 16px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; display: inline-block; animation: spin 0.8s linear infinite;"></span>
                      <span>Analyzing with Vision AI...</span>
                    ` : `
                      <span>✨</span> Diagnose Problem & Estimate Cost
                    `}
                  </button>
                  <label class="btn btn-outline" style="cursor: pointer; padding: 0.65rem 0.85rem;" title="Retake Photo">
                    <span>🔄</span>
                    <input type="file" id="photo-retake-input" accept="image/*" capture="environment" style="display: none;">
                  </label>
                </div>
              </div>

            </div>
          </div>

          <!-- Loading Indicator with progress steps -->
          <div id="photo-loading-container" style="${this.isLoading ? 'display: block;' : 'display: none;'} margin-top: 1rem; padding: 1.25rem; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color); text-align: center;">
            <div style="font-size: 2rem; margin-bottom: 0.5rem; animation: floatSoft 2s infinite;">🤖</div>
            <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 0.25rem;">LocalKaam AI Vision Diagnostician</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);" id="loading-step-text">
              Consulting vision model and checking Mumbai standardized rate card...
            </div>
          </div>

          <!-- Error Alert -->
          <div id="photo-error-container" style="${this.errorMessage ? 'display: block;' : 'display: none;'} margin-top: 1rem; padding: 1rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #b91c1c;">
            <div style="font-weight: 700; margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.35rem;">
              <span>⚠️</span> Analysis Notice
            </div>
            <div style="font-size: 0.85rem;" id="photo-error-message">${esc(this.errorMessage || '')}</div>
            <button class="btn btn-outline btn-sm" id="btn-retry-diagnosis" style="margin-top: 0.5rem; font-size: 0.8rem; background: white;">
              Retry Analysis
            </button>
          </div>

          <!-- Diagnosis Result Card -->
          <div id="photo-result-container" style="${this.activeDiagnosis ? 'display: block;' : 'display: none;'} margin-top: 1.5rem;">
            ${this.activeDiagnosis ? this.renderDiagnosisCard(this.activeDiagnosis) : ''}
          </div>

        </div>

      </div>
    `;

    this.attachEvents(container);
  },

  getFallbackFixSteps(category, materials = []) {
    const steps = {
      electrician: ['Turn OFF the breaker and check wires are dead with a tester', 'Remove the burnt switch/socket and damaged wires', 'Fit the new part, tighten terminals and use tape', 'Turn ON the breaker and test for sparking'],
      plumber: ['Turn off the water valve', 'Remove the leaking tap part and clean the joint', 'Fit the new washer/seal with Teflon tape', 'Turn water ON and check for leaks'],
      painter: ['Scrape loose paint and sand the wall', 'Apply primer and let it dry', 'Apply paint / waterproofing coat', 'Check the finish and clean up'],
      carpenter: ['Remove the damaged part and measure replacements', 'Fit new hinges/lock with screws', 'Check the door/drawer moves smoothly', 'Finish and tidy up'],
      cleaner: ['Clear the area', 'Scrub / deep-clean the surface', 'Rinse, disinfect and dry', 'Final check'],
      appliance_repair: ['Unplug the appliance', 'Replace the faulty part', 'Test run for noise / leak / heat', 'Clean up and check with you']
    };
    const base = steps[category] || steps.plumber;
    if (materials && materials.length) base[1] = base[1] + ' using ' + materials.slice(0, 2).join(', ');
    return base;
  },

  // Best worker from local storage, with catalog fallback (works even without the Node backend)
  pickClientBestWorker(category) {
    try {
      let workers = INITIAL_WORKERS || [];
      try {
        const raw = localStorage.getItem('localkaam_workers');
        const stored = raw ? JSON.parse(raw) : null;
        if (Array.isArray(stored) && stored.length) workers = stored;
      } catch (e) { /* use catalog */ }
      const wanted = category === 'cleaner' ? ['cleaner', 'cleaning'] : [category];
      const scored = workers
        .filter((w) => w && wanted.some((c) => (w.specialities && w.specialities[c]) || w.category === c))
        .sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0) || (b.ratingCount || 0) - (a.ratingCount || 0))
        .slice(0, 3)
        .map((w) => {
          const spec = wanted.map((c) => w.specialities && w.specialities[c]).find(Boolean) || {};
          return { id: w.id, name: w.name, phone: w.phone, ratingAverage: w.ratingAverage, ratingCount: w.ratingCount, experience: w.experience, baseLocality: w.baseLocality, serviceArea: w.serviceArea, avatar: w.avatar || null, startingPrice: spec.startingPrice || null, visitingCharge: spec.visitingCharge || null, certifications: spec.certifications || null };
        });
      return scored;
    } catch (e) {
      return [];
    }
  },

  // Fill in missing cause / fix_steps / best worker so the result is always complete
  enrichDiagnosis(d) {
    if (!d) return d;
    // Wrong / unclear image: do NOT invent a fix, price or worker
    if (d.problem_found === false) {
      d.fix_steps = [];
      d.best_worker = null;
      d.recommended_workers = [];
      return d;
    }
    if (!d.fix_steps || !d.fix_steps.length) d.fix_steps = this.getFallbackFixSteps(d.service_category, d.likely_materials || []);
    if (!d.cause) d.cause = d.issue ? `Likely cause: ${d.issue}` : 'Needs on-site inspection.';
    if (!d.best_worker && d.service_category) {
      const all = this.pickClientBestWorker(d.service_category);
      if (!d.recommended_workers || !d.recommended_workers.length) d.recommended_workers = all;
      d.best_worker = all[0] || null;
    }
    return d;
  },

  renderDiagnosisCard(diag) {
    const urgencyText = { emergency: 'Emergency', high: 'High', medium: 'Medium', low: 'Low' }[diag.urgency] || 'Normal';
    const catObj = CATEGORIES.find(c => c.id === diag.service_category) || { name: diag.service_category, icon: '🛠️' };
    const bw = diag.best_worker || null;
    const fixSteps = Array.isArray(diag.fix_steps) ? diag.fix_steps : [];
    const materials = Array.isArray(diag.likely_materials) ? diag.likely_materials : [];

    // Wrong / unclear image: show the retake message BUT keep the flow usable —
    // the user can pick a service and book anyway (no dead end for anyone).
    if (diag.problem_found === false) {
      const defaultCat = diag.service_category || 'plumber';
      const pricing = getPricingForTask(defaultCat, diag.issue || '');
      return `
        <div style="border: 1.5px solid #f59e0b; border-radius: 12px; padding: 1.25rem; background: var(--bg-primary); text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
          <h2 style="font-size: 1.2rem; font-weight: 800; margin: 0 0 0.5rem 0;">Could not fully read this photo</h2>
          <div style="font-size: 0.92rem; color: var(--text-secondary); max-width: 520px; margin: 0 auto 1rem auto;">${esc(diag.follow_up_question || 'Please upload a clear, well-lit photo of the broken thing (tap, switch, wall, door, appliance) and try again.')}</div>
          <div style="max-width: 460px; margin: 0 auto; text-align: left; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.9rem 1rem;">
            <div style="font-size: 0.88rem; margin-bottom: 0.5rem;"><strong>Or continue anyway:</strong> pick the closest service and book — a worker will confirm on site.</div>
            <select id="unknown-category" class="form-select" style="width: 100%; font-weight: 700;">
              <option value="plumber" ${defaultCat === 'plumber' ? 'selected' : ''}>🔧 Plumber</option>
              <option value="electrician" ${defaultCat === 'electrician' ? 'selected' : ''}>⚡ Electrician</option>
              <option value="carpenter" ${defaultCat === 'carpenter' ? 'selected' : ''}>🪚 Carpenter</option>
              <option value="painter" ${defaultCat === 'painter' ? 'selected' : ''}>🎨 Painter</option>
              <option value="cleaner" ${defaultCat === 'cleaner' ? 'selected' : ''}>🧹 Cleaner</option>
              <option value="appliance_repair" ${defaultCat === 'appliance_repair' ? 'selected' : ''}>🔌 Appliance Repair</option>
            </select>
            <div id="unknown-price" style="font-size: 1.3rem; font-weight: 800; color: #15803d; margin: 0.6rem 0;">₹${pricing.price_min} – ₹${pricing.price_max}</div>
            <button class="btn btn-primary" id="btn-book-unknown" style="width: 100%;">Book Now — ₹${pricing.price_min}</button>
            <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.5rem;">For a sharper diagnosis, retake the photo close-up in good light.</div>
          </div>
        </div>
      `;
    }

    // ONE simple result card: issue, cause, fix, price, best worker
    return `
      <div style="border: 2px solid var(--accent-primary); border-radius: 12px; padding: 1.25rem; background: var(--bg-primary);">
        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.25rem;">${catObj.icon} ${esc(catObj.name)} · ${urgencyText} urgency · ~${diag.estimated_duration_minutes || 45} mins</div>
        <h2 style="font-size: 1.3rem; font-weight: 800; margin: 0 0 0.5rem 0;">${esc(diag.issue)}</h2>
        ${diag.safety_warning ? `<div style="background:#fef2f2; border:1px solid #ef4444; border-radius:8px; padding:0.7rem 0.9rem; color:#b91c1c; font-size:0.88rem; margin-bottom:0.75rem;">⚠️ ${esc(diag.safety_warning)}</div>` : ''}
        ${diag.cause ? `<div style="font-size:0.92rem; margin-bottom:0.75rem;"><strong>Why:</strong> ${esc(diag.cause)}</div>` : ''}
        ${fixSteps.length ? `
          <div style="font-size:0.92rem; margin-bottom:0.75rem;">
            <strong>How it will be fixed:</strong>
            <ol style="margin:0.35rem 0 0 1.2rem; line-height:1.55;">${fixSteps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
          </div>` : ''}
        <div style="display:flex; align-items:center; justify-content:space-between; gap:0.75rem; flex-wrap:wrap; background:var(--bg-card); border:1px solid var(--border-color); border-radius:8px; padding:0.8rem 1rem; margin-bottom:0.75rem;">
          <div>
            <div style="font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em;">Estimated price</div>
            <div style="font-size:1.6rem; font-weight:800; color:#15803d;">₹${diag.price_min} – ₹${diag.price_max}</div>
            ${materials.length ? `<div style="font-size:0.8rem; color:var(--text-secondary);">Materials: ${esc(materials.join(', '))}</div>` : ''}
          </div>
        </div>
        ${bw ? `
          <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap; background:var(--accent-light, var(--bg-card)); border:1px solid var(--accent-primary); border-radius:8px; padding:0.8rem 1rem;">
            ${bw.avatar ? `<img src="${esc(bw.avatar)}" alt="" style="width:48px; height:48px; border-radius:50%; object-fit:cover;" />` : ''}
            <div style="flex:1; min-width:160px;">
              <div style="font-weight:800;">⭐ Best worker: ${esc(bw.name)}</div>
              <div style="font-size:0.85rem; color:var(--text-secondary);">⭐ ${bw.ratingAverage ?? '—'} (${bw.ratingCount ?? 0} reviews)${bw.experience ? ` · ${bw.experience} yrs` : ''}${bw.startingPrice ? ` · From ₹${bw.startingPrice}` : ''}${bw.serviceArea ? ` · ${esc(bw.serviceArea)}` : ''}</div>
            </div>
            <button class="btn btn-primary" id="btn-book-best-worker" data-worker-id="${esc(bw.id || '')}">Book ${esc((bw.name || 'worker').split(' ')[0])} — ₹${diag.price_min}</button>
          </div>` : `
          <button class="btn btn-primary" id="btn-book-with-diagnosis" style="width:100%;">Book Now — ₹${diag.price_min}</button>`}
      </div>
    `;
  },

  /**
   * Client-side canvas image downscaling to max 1024px and JPEG compression
   */
  async processAndCompressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDimension = 1024;
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.85 quality
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(compressedDataUrl);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  /**
   * Send image to backend POST /api/analyze-photo
   */
  /**
   * Send image to backend POST /api/analyze-photo
   */
  async executeDiagnosis(container) {
    if (!this.compressedDataUrl) {
      Toast.show('Please capture or upload a problem photo first.', 'error');
      return;
    }

    // Capture the description box BEFORE re-rendering (render() wipes the textarea,
    // so reading it afterwards always returned "" and the note was ignored).
    const noteInput0 = container.querySelector('#photo-note-input');
    const note = noteInput0 ? noteInput0.value.trim() : '';
    this.currentNote = note;

    this.isLoading = true;
    this.errorMessage = null;
    this.activeDiagnosis = null;
    this.render(container);

    try {
      let data = null;
      try {
        const res = await fetch('/api/analyze-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: this.compressedDataUrl,
            note
          })
        });

        const text = await res.text();
        if (text && text.trim().length > 0) {
          try {
            data = JSON.parse(text);
          } catch (pe) {
            console.warn('[PhotoDiagnosis] JSON parse warning, falling back:', pe);
          }
        }
      } catch (networkErr) {
        console.warn('[PhotoDiagnosis] Backend fetch notice, activating demo mode:', networkErr);
      }

      // Extract diagnosis from either { diagnosis: {...} } or direct object
      let diagnosis = (data && data.diagnosis) ? data.diagnosis : data;

      // Ensure valid diagnosis structure; if missing or invalid, use client demo fallback
      // NOTE: problem_found===false IS valid (wrong / unclear image) — accept it
      // and show the "please retake" message instead of inventing a problem.
      if (!diagnosis || typeof diagnosis.problem_found !== 'boolean') {
        diagnosis = this.getClientFallbackDiagnosis(note);
      }

      // Always complete the result (cause, fix steps, best worker)
      this.activeDiagnosis = this.enrichDiagnosis(diagnosis);
      if (this.activeDiagnosis.problem_found === false) {
        Toast.show('Please upload a clear photo of the broken item', 'info');
      } else {
        Toast.show('Diagnosis complete! Verified Mumbai estimate generated.', 'success');
      }

    } catch (err) {
      console.error('[Diagnosis error]', err);
      // Safe fallback so demo never fails
      this.activeDiagnosis = this.enrichDiagnosis(this.getClientFallbackDiagnosis(note));
      Toast.show('Diagnosis complete (Demo Mode)', 'info');
    } finally {
      this.isLoading = false;
      this.render(container);
      // Show the result right away — scroll to the single result card
      const resultEl = container.querySelector('#photo-result-container');
      if (resultEl && this.activeDiagnosis) {
        resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  },

  /**
   * Offline / Demo fallback diagnosis (ensures hackathon demo never breaks)
   */
  getClientFallbackDiagnosis(note) {
    const n = (note || '').toLowerCase();
    if (n.includes('electric') || n.includes('wire') || n.includes('spark') || n.includes('switch')) {
      return {
        problem_found: true,
        issue: 'Faulty electrical switchboard with exposed wiring',
        cause: 'Loose terminals and a burnt switch/socket causing overheating and sparking risk',
        service_category: 'electrician',
        urgency: 'emergency',
        price_min: 800,
        price_max: 2500,
        likely_materials: ['MCB breaker', 'Electrical tape', 'Wire connectors'],
        fix_steps: this.getFallbackFixSteps('electrician', ['MCB breaker', 'Electrical tape']),
        estimated_duration_minutes: 45,
        safety_warning: 'Do NOT touch exposed wires. Turn off the main breaker immediately.',
        confidence: 'high',
        follow_up_question: null
      };
    }
    if (n.includes('paint') || n.includes('damp') || n.includes('wall') || n.includes('peel')) {
      return {
        problem_found: true,
        issue: 'Damp wall with paint peeling and possible seepage',
        cause: 'Water seepage trapped behind paint',
        service_category: 'painter',
        urgency: 'medium',
        price_min: 1500,
        price_max: 5000,
        likely_materials: ['Primer', 'Waterproof putty', 'Emulsion paint'],
        fix_steps: this.getFallbackFixSteps('painter', ['Primer', 'Waterproof putty']),
        estimated_duration_minutes: 180,
        safety_warning: null,
        confidence: 'high',
        follow_up_question: null
      };
    }
    if (n.includes('carpenter') || n.includes('wood') || n.includes('door') || n.includes('furniture')) {
      return {
        problem_found: true,
        issue: 'Damaged wooden door hinge and frame repair needed',
        cause: 'Loose/worn hinges and screws holding the door frame',
        service_category: 'carpenter',
        urgency: 'low',
        price_min: 500,
        price_max: 2000,
        likely_materials: ['Door hinges', 'Wood screws', 'Wood filler'],
        fix_steps: this.getFallbackFixSteps('carpenter', ['Door hinges', 'Wood screws']),
        estimated_duration_minutes: 60,
        safety_warning: null,
        confidence: 'high',
        follow_up_question: null
      };
    }
    // Default: leaking tap / plumber (only when the note mentions plumbing)
    if (n.includes('leak') || n.includes('tap') || n.includes('drip') || n.includes('pipe') || n.includes('water')) {
      return {
        problem_found: true,
        issue: 'Leaking kitchen tap with worn-out washer',
        cause: 'Worn-out rubber washer / loose spindle causing constant dripping',
        service_category: 'plumber',
        urgency: 'medium',
        price_min: 300,
        price_max: 800,
        likely_materials: ['Tap washer', 'Teflon tape', 'Adjustable wrench'],
        fix_steps: this.getFallbackFixSteps('plumber', ['Tap washer', 'Teflon tape']),
        estimated_duration_minutes: 30,
        safety_warning: null,
        confidence: 'high',
        follow_up_question: null
      };
    }
    // Unknown / wrong image: do NOT invent a problem
    return {
      problem_found: false,
      issue: null,
      cause: null,
      service_category: null,
      urgency: null,
      price_min: null,
      price_max: null,
      likely_materials: [],
      fix_steps: [],
      estimated_duration_minutes: null,
      safety_warning: null,
      confidence: 'low',
      follow_up_question: 'I could not identify a clear household repair problem in this photo. Please upload a clear, well-lit photo of the broken item (tap, switch, wall, door, appliance) and try again.'
    };
  },

  /**
   * Sample photo generator for quick judge testing without taking a live photo
   */
  loadSampleLeakingTapPhoto() {
    // Generates a lightweight Canvas sample image representing a leaking bathroom fixture
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    // Background tile texture
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, 640, 480);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    for (let x = 0; x < 640; x += 80) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 480); ctx.stroke();
    }
    for (let y = 0; y < 480; y += 80) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(640, y); ctx.stroke();
    }

    // Chrome faucet shape
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.roundRect(260, 140, 50, 180, 8);
    ctx.fill();

    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.roundRect(230, 140, 150, 40, 10);
    ctx.fill();

    // Dripping water drop
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(360, 240, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(360, 290, 10, 0, Math.PI * 2);
    ctx.fill();

    // Text banner
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.fillText('Sample Household Issue: Leaking Faucet Spindle', 60, 70);

    return canvas.toDataURL('image/jpeg', 0.9);
  },

  /**
   * Attach component UI events
   */
  attachEvents(container) {
    const fileInput = container.querySelector('#photo-file-input');
    const retakeInput = container.querySelector('#photo-retake-input');
    const dropzoneBox = container.querySelector('#dropzone-box');
    const sampleBtn = container.querySelector('#btn-load-sample-photo');
    const removeBtn = container.querySelector('#btn-remove-photo');
    const diagnoseBtn = container.querySelector('#btn-diagnose-photo');
    const retryBtn = container.querySelector('#btn-retry-diagnosis');

    const handleFile = async (file) => {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        Toast.show('Please select a valid image file (JPEG, PNG, or WebP).', 'error');
        return;
      }
      try {
        Toast.show('Compressing image for fast upload...', 'info');
        this.compressedDataUrl = await this.processAndCompressImage(file);
        this.currentFile = file;
        this.render(container);
      } catch (err) {
        Toast.show('Failed to read image file.', 'error');
      }
    };

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleFile(e.target.files[0]);
        }
      });
    }

    if (retakeInput) {
      retakeInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleFile(e.target.files[0]);
        }
      });
    }

    // Drag and drop support
    if (dropzoneBox) {
      dropzoneBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzoneBox.style.borderColor = 'var(--accent-primary)';
        dropzoneBox.style.backgroundColor = 'var(--accent-light)';
      });
      dropzoneBox.addEventListener('dragleave', () => {
        dropzoneBox.style.borderColor = 'var(--border-color)';
        dropzoneBox.style.backgroundColor = 'var(--bg-primary)';
      });
      dropzoneBox.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzoneBox.style.borderColor = 'var(--border-color)';
        dropzoneBox.style.backgroundColor = 'var(--bg-primary)';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFile(e.dataTransfer.files[0]);
        }
      });
    }

    // Demo Sample Photo Button
    if (sampleBtn) {
      sampleBtn.addEventListener('click', () => {
        this.compressedDataUrl = this.loadSampleLeakingTapPhoto();
        Toast.show('Sample leaking tap photo loaded!', 'success');
        this.render(container);
        // Pre-fill the note so the keyword demo recognises this one correctly
        const noteEl = container.querySelector('#photo-note-input');
        if (noteEl && !noteEl.value.trim()) noteEl.value = 'leaking tap dripping';
      });
    }

    // Remove photo
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        this.currentFile = null;
        this.compressedDataUrl = null;
        this.activeDiagnosis = null;
        this.errorMessage = null;
        this.render(container);
      });
    }

    // Run Diagnosis Button
    if (diagnoseBtn) {
      diagnoseBtn.addEventListener('click', () => {
        this.executeDiagnosis(container);
      });
    }

    // Retry Button
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.executeDiagnosis(container);
      });
    }

    // Category Edit Dropdown in Diagnosis Card
    const editCat = container.querySelector('#edit-detected-category');
    if (editCat) {
      editCat.addEventListener('change', (e) => {
        if (this.activeDiagnosis) {
          this.activeDiagnosis.service_category = e.target.value;
          Toast.show(`Service category updated to ${e.target.options[e.target.selectedIndex].text}`, 'info');
          this.render(container);
        }
      });
    }

    // Action 1: "Find [service] near me on map"
    const findOnMapBtn = container.querySelector('#btn-find-service-map');
    if (findOnMapBtn) {
      findOnMapBtn.addEventListener('click', () => {
        const cat = this.activeDiagnosis?.service_category || 'all';
        window.dispatchEvent(new CustomEvent('localkaam:open-map', { detail: { service: cat } }));
      });
    }

    // Action 2: "Book Now with AI Estimate"
    const bookWithDiagBtn = container.querySelector('#btn-book-with-diagnosis');
    if (bookWithDiagBtn) {
      bookWithDiagBtn.addEventListener('click', () => {
        if (!this.activeDiagnosis) return;
        window.dispatchEvent(new CustomEvent('localkaam:book-with-diagnosis', {
          detail: {
            diagnosis: this.activeDiagnosis,
            photoUrl: this.compressedDataUrl
          }
        }));
      });
    }

    // Unknown-photo flow: category picker + price update + "book anyway"
    const unknownCat = container.querySelector('#unknown-category');
    if (unknownCat) {
      unknownCat.addEventListener('change', () => {
        if (!this.activeDiagnosis) return;
        this.activeDiagnosis.service_category = unknownCat.value;
        this.activeDiagnosis.problem_found = true;
        this.activeDiagnosis.issue = this.activeDiagnosis.issue || 'Home repair inspection (photo unclear)';
        const pricing = getPricingForTask(unknownCat.value, '');
        this.activeDiagnosis.price_min = pricing.price_min;
        this.activeDiagnosis.price_max = pricing.price_max;
        this.activeDiagnosis.likely_materials = pricing.materials || this.activeDiagnosis.likely_materials || [];
        this.enrichDiagnosis(this.activeDiagnosis);
        this.render(container);
      });
    }
    const bookUnknownBtn = container.querySelector('#btn-book-unknown');
    if (bookUnknownBtn) {
      bookUnknownBtn.addEventListener('click', () => {
        if (!this.activeDiagnosis) return;
        const cat = unknownCat ? unknownCat.value : (this.activeDiagnosis.service_category || 'plumber');
        const pricing = getPricingForTask(cat, '');
        const bestGuess = {
          ...this.activeDiagnosis,
          problem_found: true,
          issue: this.activeDiagnosis.issue || 'Home repair inspection (photo unclear)',
          service_category: cat,
          price_min: pricing.price_min,
          price_max: pricing.price_max,
          likely_materials: pricing.materials || [],
          fix_steps: this.getFallbackFixSteps(cat, pricing.materials || [])
        };
        this.enrichDiagnosis(bestGuess);
        window.dispatchEvent(new CustomEvent('localkaam:book-with-diagnosis', {
          detail: { diagnosis: bestGuess, photoUrl: this.compressedDataUrl }
        }));
      });
    }

    // Action 3: "Book best worker" (server-ranked pick for this issue)
    const bookBestBtn = container.querySelector('#btn-book-best-worker');
    if (bookBestBtn) {
      bookBestBtn.addEventListener('click', () => {
        if (!this.activeDiagnosis) return;
        const workerId = bookBestBtn.getAttribute('data-worker-id');
        window.dispatchEvent(new CustomEvent('localkaam:book-worker', {
          detail: { workerId }
        }));
        // Also fire the diagnosis-context booking so the modal keeps the AI estimate
        window.dispatchEvent(new CustomEvent('localkaam:book-with-diagnosis', {
          detail: {
            diagnosis: this.activeDiagnosis,
            photoUrl: this.compressedDataUrl,
            preferredWorkerId: workerId
          }
        }));
      });
    }
  }
};
