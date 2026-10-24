import { LOCALITIES } from './data.js';

export const MatchingService = {
  getLocality(id) {
    return LOCALITIES.find(l => l.id === id) || LOCALITIES[0];
  },

  calculateDistance(loc1Id, loc2Id) {
    const l1 = this.getLocality(loc1Id);
    const l2 = this.getLocality(loc2Id);
    if (!l1 || !l2) return 5; // default 5km

    // Haversine formula
    const R = 6371; // Earth radius in km
    const dLat = (l2.lat - l1.lat) * Math.PI / 180;
    const dLon = (l2.lng - l1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(l1.lat * Math.PI / 180) * Math.cos(l2.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return Math.max(1.0, Math.round(distance * 10) / 10); // minimum 1 km
  },

  calculateETA(distanceKm) {
    return Math.round(distanceKm * 4 + 10);
  },

  calculateMatchScore(worker, customerLocalityId) {
    const distance = this.calculateDistance(worker.baseLocality, customerLocalityId);
    const availableFactor = worker.available ? 0 : 60;
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
      .map(worker => {
        const distance = this.calculateDistance(worker.baseLocality, customerLocalityId);
        const matchData = this.calculateMatchScore(worker, customerLocalityId);
        return {
          ...worker,
          distance: matchData.distance,
          eta: matchData.eta,
          matchScore: matchData.score
        };
      })
      .filter(worker => {
        // Service radius check
        if (worker.distance > worker.serviceRadius) return false;
        // Category check
        if (category && category !== 'all' && worker.category !== category) return false;
        // Search query check
        if (searchQuery && searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          const nameMatch = worker.name.toLowerCase().includes(q);
          const catMatch = worker.category.toLowerCase().includes(q);
          const skillMatch = worker.skills.some(s => s.toLowerCase().includes(q));
          const bioMatch = worker.bio && worker.bio.toLowerCase().includes(q);
          if (!nameMatch && !catMatch && !skillMatch && !bioMatch) return false;
        }
        return true;
      })
      .sort((a, b) => a.matchScore - b.matchScore);
  }
};
