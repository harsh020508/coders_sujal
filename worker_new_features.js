import { StorageService } from './storage.js';
import { Toast } from './toast.js';
import { AuthService } from './authService.js';
import { esc } from './utils.js';
import { COMPLAINT_CATEGORIES } from './data.js';

export const WorkerFeedback = {
  getWorkerReviews(workerId) {
    const reviews = StorageService.getReviews();
    return reviews.filter(r => r.workerId === workerId);
  },

  renderFeedbackSection(worker) {
    const reviews = this.getWorkerReviews(worker.id);
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + (r.overallRating || 0), 0) / reviews.length 
      : (worker.ratingAverage || 0);
    const totalReviews = reviews.length;
    
    const ratings = [5, 4, 3, 2, 1];
    const distribution = ratings.map(star => ({
      star,
      count: reviews.filter(r => Math.round(r.overallRating) === star).length
    }));
    const distTotal = distribution.reduce((sum, d) => sum + d.count, 0);
    const distPercent = (d) => distTotal > 0 ? Math.round((d.count / distTotal) * 100) : 0;

    const responseCount = reviews.filter(r => r.workerResponse).length;

    const needsImprovement = reviews.filter(r => r.overallRating <= 3);
    const satisfiedAreas = [...new Set(reviews.flatMap(r => r.feedbackTags || []))];

    return `
      <div class="feedback-section" style="margin-top: 2rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.25rem;">Customer Feedback</h3>
            <p style="color: var(--text-secondary); font-size: 0.9rem;">Understand how customers perceive your service</p>
          </div>
          <div style="display: flex; gap: 1rem; align-items: center;">
            <div style="text-align: center;">
              <div style="font-size: 2.5rem; font-weight: 800; color: var(--accent-primary);">${avgRating.toFixed(1)}</div>
              <div style="font-size: 0.8rem; color: var(--text-secondary);">${totalReviews} reviews</div>
            </div>
            <div style="flex: 1; min-width: 200px;">
              <div style="display: flex; height: 8px; border-radius: 4px; overflow: hidden; background: var(--bg-primary); border: 1px solid var(--border-color);">
                ${distribution.map(d => `
                  <div style="width: ${distPercent(d)}%; background: #f59e0b; height: 100%;"></div>
                `).join('')}
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.35rem;">
                ${ratings.map(d => `<span>${d.star}★: ${d.count}</span>`).join(' • ')}
              </div>
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
          <div style="background: var(--bg-primary); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); text-align: center;">
            <div style="font-size: 2rem; font-weight: 700; color: var(--accent-primary);">${avgRating.toFixed(1)}</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">Average Rating</div>
          </div>
          <div style="background: var(--bg-primary); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); text-align: center;">
            <div style="font-size: 2rem; font-weight: 700; color: var(--accent-primary);">${totalReviews}</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">Total Reviews</div>
          </div>
          <div style="background: var(--bg-primary); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); text-align: center;">
            <div style="font-size: 2rem; font-weight: 700; color: var(--accent-primary);">${responseCount}</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">Responded</div>
          </div>
          <div style="background: var(--bg-primary); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); text-align: center;">
            <div style="font-size: 2rem; font-weight: 700; color: var(--accent-primary);">${distPercent(distribution[2]) + distPercent(distribution[1]) + distPercent(distribution[0])}%</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">Positive Feedback</div>
          </div>
        </div>

        <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Recent Customer Reviews</h4>
        ${reviews.length === 0 ? `
          <p style="color: var(--text-secondary); padding: 1rem; text-align: center;">No customer reviews yet.</p>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 1rem; max-height: 400px; overflow-y: auto; margin-bottom: 1.5rem;">
            ${reviews.slice(0, 10).map(r => `
              <div key="${r.id}" style="background: var(--bg-primary); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
                  <div>
                    <strong>${esc(r.customerName || 'Customer')}</strong>
                    <span style="color: var(--text-secondary); font-size: 0.85rem; margin-left: 0.5rem;">${new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 1.25rem;">${'⭐'.repeat(Math.round(r.overallRating))}</span>
                    <strong>${r.overallRating}</strong>
                  </div>
                </div>
                <p style="font-size: 0.9rem; margin-bottom: 0.5rem;">${esc(r.comment || 'No written feedback provided.')}</p>
                ${r.feedbackTags && r.feedbackTags.length > 0 ? `
                  <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem;">
                    ${r.feedbackTags.map(tag => `<span class="skill-tag">${esc(tag)}</span>`).join('')}
                  </div>
                ` : ''}
                <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem; align-items: center; flex-wrap: wrap;">
                  <span style="font-size: 0.8rem; color: var(--text-secondary);">Quality: ${r.qualityRating} • Behaviour: ${r.behaviourRating} • Punctuality: ${r.punctualityRating} • Communication: ${r.communicationRating}</span>
                </div>
                ${r.workerResponse ? `
                  <div style="background: var(--bg-primary); padding: 0.75rem; border-radius: 6px; border-left: 3px solid var(--accent-primary); margin-top: 0.75rem;">
                    <strong style="font-size: 0.85rem;">Your Response:</strong>
                    <p style="font-size: 0.9rem; margin-top: 0.25rem;">${esc(r.workerResponse)}</p>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        `}

        ${needsImprovement.length > 0 ? `
          <div style="background: var(--bg-primary); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 1.5rem;">
            <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem;">Areas Needing Improvement</h4>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              ${needsImprovement.slice(0, 5).map(r => `
                <div key="${r.id}" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.75rem; background: var(--bg-card); border-radius: 6px; border: 1px solid var(--border-color);">
                  <div>
                    <strong style="font-size: 0.9rem;">${r.overallRating} ⭐</strong>
                    <span style="font-size: 0.85rem; color: var(--text-secondary); margin-left: 0.5rem;">${r.comment || 'No feedback'}</span>
                  </div>
                  <button class="btn btn-outline btn-sm respond-review-btn" data-review-id="${esc(r.id)}">Respond</button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${satisfiedAreas.length > 0 ? `
          <div style="background: var(--bg-primary); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border-color);">
            <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem;">Satisfaction Highlights</h4>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              ${satisfiedAreas.slice(0, 10).map(tag => `<span class="skill-tag">${esc(tag)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },

  respondToReview(reviewId, workerId) {
    const reviews = StorageService.getReviews();
    const review = reviews.find(r => r.id === reviewId);
    if (!review) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 500px;">
        <button class="modal-close" id="close-modal">✕</button>
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">Respond to Review</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1.5rem;">Write a professional response to this customer.</p>
        <form id="response-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Your Response</label>
            <textarea id="review-response" class="form-control" rows="4" required placeholder="Write your response..."></textarea>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 1rem;">
            <button type="button" class="btn btn-outline" id="close-response-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Submit Response</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-modal').onclick = () => modal.remove();
    modal.querySelector('#close-response-btn').onclick = () => modal.remove();

    modal.querySelector('#response-form').onsubmit = (e) => {
      e.preventDefault();
      const response = modal.querySelector('#review-response').value;
      const updatedReviews = StorageService.getReviews().map(r => {
        if (r.id === reviewId) {
          return { ...r, workerResponse: response };
        }
        return r;
      });
      StorageService.saveReviews(updatedReviews);
      modal.remove();
      Toast.show('Response submitted successfully!', 'success');
    };
  },

  getCompletedJobsForEarnings(workerId) {
    const bookings = StorageService.getBookings();
    return bookings.filter(b => b.workerId === workerId && b.status === 'Job completed');
  },

  getEarningsForWorker(workerId) {
    const completedJobs = this.getCompletedJobsForEarnings(workerId);
    const totalEarnings = completedJobs.reduce((sum, b) => sum + (b.agreedPrice || 0), 0);
    const platformFee = 0.15; // 15% platform fee (estimated)
    const netEarnings = totalEarnings - (totalEarnings * platformFee);
    const avgPerJob = completedJobs.length > 0 ? totalEarnings / completedJobs.length : 0;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), 0, 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEarnings = completedJobs
      .filter(b => {
        const completedDate = new Date(b.completedAt || b.createdAt);
        return completedDate >= today && completedDate < new Date(today.getFullYear(), today.getMonth() + 1, 1);
      })
      .reduce((sum, b) => sum + (b.agreedPrice || 0), 0);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEarnings = completedJobs
      .filter(b => {
        const completedDate = new Date(b.completedAt || b.createdAt);
        return completedDate >= weekStart && completedDate < now;
      })
      .reduce((sum, b) => sum + (b.agreedPrice || 0), 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEarnings = completedJobs
      .filter(b => {
        const completedDate = new Date(b.completedAt || b.createdAt);
        return completedDate >= monthStart && completedDate < new Date(now.getFullYear(), now.getMonth() + 1, 1);
      })
      .reduce((sum, b) => sum + (b.agreedPrice || 0), 0);

    return {
      totalEarnings,
      netEarnings,
      avgPerJob,
      todayEarnings,
      weekEarnings,
      monthEarnings,
      completedJobs,
      platformFee,
      pendingPayments: completedJobs.filter(b => !b.paymentConfirmed).length
    };
  },

  getTransactionsForWorker(workerId) {
    const completedJobs = this.getCompletedJobsForEarnings(workerId);
    const transactions = completedJobs.map(b => ({
      id: `TXN-${b.id}`,
      bookingId: b.id,
      date: b.completedAt || b.createdAt,
      service: b.serviceTask,
      amount: b.agreedPrice,
      status: b.paymentConfirmed ? 'Paid' : 'Pending',
      paymentMethod: b.paymentMethod || 'Card',
      platformFee: Math.round(b.agreedPrice * 0.15 * 100) / 100
    }));
    return transactions;
  },

  getMostProfitableCategory(workerId) {
    const completedJobs = this.getCompletedJobsForEarnings(workerId);
    const categoryMap = {};
    completedJobs.forEach(b => {
      const category = b.serviceCategory;
      if (!categoryMap[category]) {
        categoryMap[category] = { total: 0, count: 0 };
      }
      categoryMap[category].total += b.agreedPrice || 0;
      categoryMap[category].count += 1;
    });

    let mostProfitable = null;
    let maxValue = 0;
    Object.entries(categoryMap).forEach(([cat, data]) => {
      if (data.total > maxValue) {
        maxValue = data.total;
        mostProfitable = { category: cat, ...data };
      }
    });

    return mostProfitable;
  }
};

// ─────────────────────────────────────────────────────────────────────
// 30-day earnings trend helpers (pure, unit-testable, no DOM access)
// ─────────────────────────────────────────────────────────────────────

/**
 * Bucket completed jobs into `days` date-accurate day buckets ending today.
 * Each bucket: { date, label, total, count }. Jobs outside the window are
 * ignored (they still appear in the all-time metric cards).
 */
export function buildDailyEarningsBuckets(completedJobs, days = 30, now = new Date()) {
  const n = Number(days);
  const N = Math.max(1, Math.min(120, Number.isFinite(n) ? n : 30));
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const buckets = [];
  for (let i = N - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    buckets.push({
      date: d,
      label: `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`,
      total: 0,
      count: 0
    });
  }

  (completedJobs || []).forEach((job) => {
    const t = new Date(job.completedAt || job.createdAt || 0);
    if (isNaN(t.getTime())) return;
    const dayStart = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
    const bucket = buckets.find((b) => b.date.getTime() === dayStart);
    if (bucket) {
      bucket.total += Number(job.agreedPrice || 0);
      bucket.count += 1;
    }
  });

  return buckets;
}

/**
 * Static SVG area sparkline for the last-N-days trend. No animation (safe
 * under prefers-reduced-motion), title tooltips per data point, and an
 * accessible aria-label. Returns an SVG string sized via viewBox.
 */
export function buildEarningsSparklineSVG(buckets, opts = {}) {
  const width = opts.width || 520;
  const height = opts.height || 200;
  const padLeft = 46;
  const padRight = 14;
  const padTop = 26;
  const padBottom = 34;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const list = Array.isArray(buckets) ? buckets : [];
  const totals = list.map((b) => Number(b.total) || 0);
  const maxTotal = Math.max(...totals, 1);
  const grandTotal = totals.reduce((a, b) => a + b, 0);
  const activeDays = totals.filter((t) => t > 0).length;

  const x = (i) => padLeft + (list.length <= 1 ? innerW / 2 : (i / (list.length - 1)) * innerW);
  const y = (v) => padTop + innerH - (v / maxTotal) * innerH;

  const linePoints = totals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const areaPath = `M ${padLeft},${padTop + innerH} L ${linePoints.split(' ').join(' L ')} L ${padLeft + innerW},${padTop + innerH} Z`;

  const hasData = grandTotal > 0;

  // X labels: about every 7th day plus the last day
  const labelStep = Math.max(1, Math.round(list.length / 5));
  const xLabels = list
    .map((b, i) => ({ b, i }))
    .filter(({ b, i }) => i === list.length - 1 || i % labelStep === 0)
    .map(({ b, i }) =>
      `<text x="${x(i).toFixed(1)}" y="${height - 10}" font-size="10" font-family="Inter,sans-serif" fill="var(--text-muted)" text-anchor="middle">${b.label}</text>`
    )
    .join('');

  const dots = hasData
    ? totals
        .map((v, i) => ({ v, i }))
        .filter(({ v }) => v > 0)
        .map(({ v, i }) =>
          `<g><title>${list[i].label}: ₹${v.toFixed(0)} (${list[i].count} job${list[i].count === 1 ? '' : 's'})</title>` +
          `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3.5" fill="var(--accent-primary,#1a3300)" stroke="var(--bg-card,#fff)" stroke-width="1.5"/></g>`
        )
        .join('')
    : '';

  const todayLabel = list.length ? list[list.length - 1].label : '';

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="190" style="display:block;min-width:320px;" role="img"
         aria-label="Daily earnings over the last ${list.length} days: ₹${Math.round(grandTotal)} total across ${activeDays} active days">
      <defs>
        <linearGradient id="lkTrendArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1a3300" stop-opacity="0.16"/>
          <stop offset="100%" stop-color="#1a3300" stop-opacity="0.02"/>
        </linearGradient>
      </defs>

      <line x1="${padLeft}" y1="${padTop}" x2="${padLeft + innerW}" y2="${padTop}" stroke="var(--border-color)" stroke-dasharray="3,3" opacity="0.6"/>
      <text x="${padLeft - 6}" y="${padTop + 4}" font-size="10" font-family="Inter,sans-serif" fill="var(--text-muted)" text-anchor="end">₹${Math.round(maxTotal)}</text>

      <line x1="${padLeft}" y1="${padTop + innerH}" x2="${padLeft + innerW}" y2="${padTop + innerH}" stroke="var(--border-color)" stroke-width="1.5"/>
      <text x="${padLeft - 6}" y="${padTop + innerH + 4}" font-size="10" font-family="Inter,sans-serif" fill="var(--text-muted)" text-anchor="end">₹0</text>

      ${hasData
        ? `<path d="${areaPath}" fill="url(#lkTrendArea)"/>
           <polyline points="${linePoints}" fill="none" stroke="var(--accent-primary,#1a3300)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
           ${dots}
           <circle cx="${x(totals.length - 1).toFixed(1)}" cy="${y(totals[totals.length - 1]).toFixed(1)}" r="5" fill="var(--color-highlighter-yellow,#ffe95c)" stroke="var(--accent-primary,#1a3300)" stroke-width="2">
             <title>Latest day (${todayLabel}): ₹${(totals[totals.length - 1] || 0).toFixed(0)}</title>
           </circle>`
        : `<text x="${(width / 2)}" y="${(height / 2)}" font-size="13" font-family="Inter,sans-serif" fill="var(--text-muted)" text-anchor="middle">No completed jobs in the last ${list.length} days</text>`}

      ${xLabels}
    </svg>
  `;
}

export const WorkerEarnings = {
  renderEarningsDashboard(workerId) {
    const earnings = WorkerFeedback.getEarningsForWorker(workerId);
    const transactions = WorkerFeedback.getTransactionsForWorker(workerId);
    const mostProfitable = WorkerFeedback.getMostProfitableCategory(workerId);
    const worker = StorageService.getWorkers().find(w => w.id === workerId);
    const ratingData = WorkerFeedback.getWorkerReviews(workerId);

    const stats = [
      { label: "Today's Earnings", value: `₹${earnings.todayEarnings.toFixed(2)}`, icon: '📅' },
      { label: "This Week's Earnings", value: `₹${earnings.weekEarnings.toFixed(2)}`, icon: '📊' },
      { label: "This Month's Earnings", value: `₹${earnings.monthEarnings.toFixed(2)}`, icon: '📈' },
      { label: "Total Earnings", value: `₹${earnings.totalEarnings.toFixed(2)}`, icon: '💰' }
    ];

    const avgRating = ratingData.length > 0 
      ? ratingData.reduce((sum, r) => sum + (r.overallRating || 0), 0) / ratingData.length 
      : (worker?.ratingAverage || 0);

    const insights = [
      { label: 'Most Profitable Category', value: mostProfitable ? `${mostProfitable.category} (₹${mostProfitable.total})` : 'N/A' },
      { label: 'Average Job Value', value: `₹${earnings.avgPerJob.toFixed(2)}` },
      { label: 'Customer Rating', value: `${avgRating.toFixed(1)} ⭐` },
      { label: 'Completed Jobs', value: `${earnings.completedJobs.length}` }
    ];

    return { stats, insights, transactions, earnings, mostProfitable };
  },

  exportToCSV(transactions) {
    const headers = ['Transaction ID', 'Booking ID', 'Service', 'Date', 'Amount', 'Platform Fee', 'Net Amount', 'Status', 'Payment Method'];
    const rows = transactions.map(t => [
      t.id,
      t.bookingId,
      t.service,
      new Date(t.date).toLocaleDateString(),
      t.amount.toFixed(2),
      t.platformFee.toFixed(2),
      (t.amount - t.platformFee).toFixed(2),
      t.status,
      t.paymentMethod
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `earnings_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
};
