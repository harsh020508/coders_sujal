import { LOCALITIES } from './data.js';

export const MatchingService = {
  getLocality(id) {
    return LOCALITIES.find(l => l.id === id) || LOCALITIES[0];
  },

  // Match a typed city/locality name ("andheri", "Andheri West", …)
  // to a known locality. Returns null for unknown cities (e.g. Delhi).
  findLocalityByName(query, localities = LOCALITIES) {
    if (!query || String(query).trim().length < 3) return null;
    const q = String(query).trim().toLowerCase();
    return localities.find(l =>
      l.id === q ||
      l.name.toLowerCase() === q ||
      l.name.toLowerCase().startsWith(q) ||
      l.id.startsWith(q)
    ) || null;
  },

  // Only the localities where at least one available worker is based,
  // each annotated with how many workers are there.
  getAvailableLocalities(workers, localities = LOCALITIES) {
    const counts = {};
    for (const w of workers || []) {
      if (w.available && !w.pauseNewBookings && w.baseLocality) {
        counts[w.baseLocality] = (counts[w.baseLocality] || 0) + 1;
      }
    }
    return localities
      .filter(l => counts[l.id])
      .map(l => ({ ...l, workerCount: counts[l.id] }))
      .sort((a, b) => b.workerCount - a.workerCount);
  },

  // True when the worker can serve the customer's location (within
  // their service radius from their base locality).
  isWorkerAvailableIn(worker, customerLocalityId) {
    if (!worker || !worker.available || worker.pauseNewBookings) return false;
    return this.calculateDistance(worker.baseLocality, customerLocalityId) <= (worker.serviceRadius || 10);
  },

  calculateDistance(loc1Id, loc2Id) {
    const l1 = this.getLocality(loc1Id);
    const l2 = this.getLocality(loc2Id);
    if (!l1 || !l2) return 5;

    const R = 6371;
    const dLat = (l2.lat - l1.lat) * Math.PI / 180;
    const dLon = (l2.lng - l1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(l1.lat * Math.PI / 180) * Math.cos(l2.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return Math.max(1.0, Math.round(distance * 10) / 10);
  },

  calculateETA(distanceKm) {
    return Math.round(distanceKm * 4 + 10);
  },

  calculateMatchScore(worker, customerLocalityId) {
    const distance = this.calculateDistance(worker.baseLocality, customerLocalityId);
    const distanceFactor = distance * 4;
    const ratingVal = worker.ratingCount > 0 ? worker.ratingAverage : 4.0;
    const ratingFactor = (5 - ratingVal) * 10;
    // Updated verification check - only verified workers get positive score
    const verifiedFactor = worker.verificationStatus === 'Verified' ? 0 : 10; // Penalize unverified

    return {
      score: distanceFactor + ratingFactor + verifiedFactor,
      distance,
      eta: this.calculateETA(distance)
    };
  },

  getEligibleWorkers(workers, customerLocalityId, category = 'all', searchQuery = '') {
    return workers
      .filter(worker => {
        // Must have completed profile and MUST BE ONLINE & NOT PAUSED
        if (!worker.profileCompleted) return false;
        if (!worker.available || worker.pauseNewBookings) return false;

        // Service radius check
        const distance = this.calculateDistance(worker.baseLocality, customerLocalityId);
        if (distance > worker.serviceRadius) return false;

        // Category check: worker must have this category in their specialities
        if (category && category !== 'all') {
          if (!worker.specialities || !worker.specialities[category]) return false;
        }

        // Search query check
        if (searchQuery && searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          const nameMatch = worker.name.toLowerCase().includes(q);
          const bioMatch = worker.bio && worker.bio.toLowerCase().includes(q);
          const specMatch = worker.specialities && Object.keys(worker.specialities).some(sk => {
            if (sk.toLowerCase().includes(q)) return true;
            const tasks = worker.specialities[sk].tasks || [];
            return tasks.some(t => t.toLowerCase().includes(q));
          });
          const skillMatch = worker.skills && worker.skills.some(s => s.toLowerCase().includes(q));
          if (!nameMatch && !bioMatch && !specMatch && !skillMatch) return false;
        }
        return true;
      })
      .map(worker => {
        const matchData = this.calculateMatchScore(worker, customerLocalityId);
        return {
          ...worker,
          distance: matchData.distance,
          eta: matchData.eta,
          matchScore: matchData.score
        };
      })
      .sort((a, b) => a.matchScore - b.matchScore);
  }
};
