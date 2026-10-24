import { LOCALITIES } from './data.js';

export const MatchingService = {
  getLocality(id) {
    return LOCALITIES.find(l => l.id === id) || LOCALITIES[0];
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
    const availableFactor = (worker.available && !worker.pauseNewBookings) ? 0 : 60;
    const distanceFactor = distance * 4;
    const ratingVal = worker.ratingCount > 0 ? worker.ratingAverage : 4.0;
    const ratingFactor = (5 - ratingVal) * 10;
    const verifiedFactor = worker.verificationStatus === 'Verified' ? 0 : 5;

    return {
      score: availableFactor + distanceFactor + ratingFactor + verifiedFactor,
      distance,
      eta: this.calculateETA(distance)
    };
  },

  getEligibleWorkers(workers, customerLocalityId, category = 'all', searchQuery = '') {
    return workers
      .filter(worker => {
        // Must have completed profile and not paused new bookings entirely
        if (!worker.profileCompleted) return false;
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
