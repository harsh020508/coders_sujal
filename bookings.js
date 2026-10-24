export const BookingService = {
  createBooking(worker, customerData, bookingDetails) {
    const originalEstimate = worker.hourlyRate * bookingDetails.estimatedHours;
    const customerOffer = bookingDetails.customerOffer ? parseFloat(bookingDetails.customerOffer) : null;
    
    const newBooking = {
      id: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
      workerId: worker.id,
      customerName: customerData.name || 'Aarav Mehta',
      customerPhone: customerData.phone || '+91 98765 43210',
      service: bookingDetails.service || worker.skills[0] || 'General Service',
      locality: customerData.locality || worker.baseLocality,
      address: customerData.address || 'Standard Address, Mumbai',
      jobDescription: bookingDetails.jobDescription || 'Service required',
      bookingType: bookingDetails.bookingType || 'instant',
      dateTime: bookingDetails.dateTime || new Date().toISOString(),
      estimatedHours: parseFloat(bookingDetails.estimatedHours) || 1,
      originalEstimate,
      customerOffer,
      counterOfferHistory: customerOffer ? [
        { sender: 'customer', amount: customerOffer, note: bookingDetails.offerNote || 'Initial customer offer' }
      ] : [],
      agreedPrice: customerOffer || originalEstimate,
      status: 'Pending',
      reviewId: null,
      complaintId: null,
      createdAt: new Date().toISOString(),
      completedAt: null
    };
    return newBooking;
  },

  acceptBooking(booking, workerAcceptsOffer = true) {
    if (!booking || booking.status !== 'Pending') return booking;
    // Prevent worker accept if worker has already counter-offered and is awaiting customer response
    if (Array.isArray(booking.counterOfferHistory) && booking.counterOfferHistory.length > 0) {
      const last = booking.counterOfferHistory[booking.counterOfferHistory.length - 1];
      if (last && last.sender === 'worker') return booking;
    }
    // If there's a customer offer and worker accepts it, agreed price is customerOffer, else originalEstimate
    const agreed = (booking.customerOffer && workerAcceptsOffer) ? booking.customerOffer : booking.originalEstimate;
    return {
      ...booking,
      status: 'Accepted',
      agreedPrice: agreed
    };
  },

  rejectBooking(booking) {
    if (!booking || booking.status !== 'Pending') return booking;
    return {
      ...booking,
      status: 'Rejected'
    };
  },

  cancelBooking(booking) {
    if (!booking || (booking.status !== 'Pending' && booking.status !== 'Accepted')) return booking;
    return {
      ...booking,
      status: 'Cancelled'
    };
  },

  workerCounterOffer(booking, amount, note) {
    if (!booking || booking.status !== 'Pending') return booking;
    const newAmount = parseFloat(amount);
    if (isNaN(newAmount) || newAmount <= 0) return booking;
    // Prevent duplicate counter-offer if already awaiting customer response
    if (Array.isArray(booking.counterOfferHistory) && booking.counterOfferHistory.length > 0) {
      const last = booking.counterOfferHistory[booking.counterOfferHistory.length - 1];
      if (last && last.sender === 'worker') return booking;
    }
    const history = [...(booking.counterOfferHistory || []), { sender: 'worker', amount: newAmount, note: note || 'Worker counter-offer' }];
    return {
      ...booking,
      counterOfferHistory: history,
      agreedPrice: newAmount // proposed agreed price awaiting customer acceptance
    };
  },

  customerAcceptCounter(booking) {
    const lastCounter = booking.counterOfferHistory[booking.counterOfferHistory.length - 1];
    const agreed = lastCounter ? lastCounter.amount : booking.agreedPrice;
    const history = [...booking.counterOfferHistory, { sender: 'customer', amount: agreed, note: 'Customer accepted counter-offer' }];
    return {
      ...booking,
      status: 'Accepted',
      agreedPrice: agreed,
      counterOfferHistory: history
    };
  },

  customerDeclineCounter(booking) {
    const history = [...booking.counterOfferHistory, { sender: 'customer', amount: 0, note: 'Customer declined counter-offer' }];
    return {
      ...booking,
      status: 'Cancelled',
      counterOfferHistory: history
    };
  },

  startJob(booking) {
    if (booking.status !== 'Accepted') return booking;
    return {
      ...booking,
      status: 'In Progress'
    };
  },

  completeJob(booking) {
    if (booking.status !== 'In Progress') return booking;
    return {
      ...booking,
      status: 'Completed',
      completedAt: new Date().toISOString()
    };
  }
};
