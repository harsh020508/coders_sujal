import { LOCALITIES } from './data.js';

export const EnhancedMatchingService = {
  // Basic compatibility check
  isWorkerAvailable(worker) {
    return !!(worker?.profileCompleted && worker?.available && !worker?.pauseNewBookings);
  },

  // Calculate Haversine distance between two lat/lng points
  calculateDistance(lat1, lng1, lat2, lng2) {
    const toRad = (val) => (val * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  // Calculate ETA based on distance
  calculateETA(distance, workerExperience, avgTraffic) {
    let baseSpeed = 40; // km/h
    if (workerExperience > 10) baseSpeed += 10;
    const avgTime = distance / baseSpeed * 60;
    return Math.ceil(avgTime * avgTraffic);
  },

  // Get customer locality coordinates
  getLocalityCoordinates(localityId) {
    return LOCALITIES.find(l => l.id === localityId);
  },

  // Calculate match score based on price and distance
  calculateMatchScore(worker, category) {
    let score = 100;
    const distances = {
      andheri: 0,
      bandra: 3,
      powai: 6,
      juhu: 4,
      malad: 2,
      colaba: 7,
      dadar: 5,
      thane: 10
    };

    // Price-based score
    const workerSpecialities = worker.specialities || {};
    const specialInfo = workerSpecialities[category] || { startingPrice: 350 };
    const workerPrice = specialInfo.startingPrice || 350;
    const estimatedPrice = 300 + Math.random() * 200;
    const priceDifference = Math.abs(workerPrice - estimatedPrice);
    const priceScore = Math.max(0, 100 - priceDifference / 10);
    score += priceScore * 0.3;

    // Distance-based score
    const workerDistance = distances[worker.baseLocality] || 5;
    const distanceScore = Math.max(0, 100 - workerDistance * 8);
    score += distanceScore * 0.4;

    // Experience score
    const experienceScore = Math.min(100, worker.experience * 2);
    score += experienceScore * 0.2;

    // Proximity score (worker location)
    const minPrice = Math.min(...Object.values(workerSpecialities).map(s => s.startingPrice || 350));
    const maxPrice = Math.max(...Object.values(workerSpecialities).map(s => s.startingPrice || 350));
    score += Math.min(100, (200 - Math.abs(350 - minPrice)) / 2) * 0.1;

    return Math.min(100, Math.round(score * 10) / 10);
  },

  getEligibleWorkers(workers, customerLocality, category, searchQuery) {
    const customerCoords = this.getLocalityCoordinates(customerLocality);
    if (!customerCoords) return [];

    return workers.filter(w => {
      if (!this.isWorkerAvailable(w)) return false;

      const workerSpecialities = w.specialities || {};
      const hasSpeciality = Object.keys(workerSpecialities).some(sk => {
        const catKey = sk.replace(/_/g, '');
        const matchesCategory = category === 'all' || catKey === category;
        const queryMatch = !searchQuery || 
          w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          w.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          Object.keys(workerSpecialities).some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && queryMatch;
      });

      if (!hasSpeciality) return false;

      const distance = this.calculateDistance(
        customerCoords.lat,
        customerCoords.lng,
        w.baseLatitude || customerCoords.lat + Math.random() * 2 - 1,
        w.baseLongitude || customerCoords.lng + Math.random() * 2 - 1
      );

      const matchScore = this.calculateMatchScore(w, category);
      const eta = this.calculateETA(distance, w.experience || 0, 1.2);

      return {
        ...w,
        distance: Number(distance.toFixed(1)),
        eta: Math.round(eta),
        matchScore,
        info: w.specialities[category] || Object.values(w.specialities)[0] || { startingPrice: 350 }
      };
    });
  },

  getDistanceCategory(distance) {
    if (distance <= 2) return 'Nearby';
    if (distance <= 5) return 'Local';
    if (distance <= 10) return 'Regional';
    return 'Distant';
  }
};