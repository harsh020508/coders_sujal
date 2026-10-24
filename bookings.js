export const BookingService = {
  createBooking(worker, customerData, bookingDetails) {
    const selectedServiceKey = bookingDetails.serviceKey || Object.keys(worker.specialities || {})[0] || 'general';
    const specialtyInfo = worker.specialities?.[selectedServiceKey] || { startingPrice: worker.hourlyRate || 350, visitingCharge: 100 };
    
    const basePrice = bookingDetails.agreedPrice || specialtyInfo.startingPrice || 350;
    const visitingCharge = specialtyInfo.visitingCharge || 100;
    const finalAmount = basePrice + visitingCharge;

    const uniqueId = `BK-${(crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9)).toUpperCase()}`;

    const newBooking = {
      id: uniqueId,
      workerId: worker.id,
      customerName: customerData.name || 'Customer',
      customerPhone: customerData.phone || '+91 98765 43210',
      serviceCategory: selectedServiceKey,
      serviceTask: bookingDetails.serviceTask || bookingDetails.service || 'General Service',
      locality: customerData.locality || worker.baseLocality,
      address: customerData.address || 'Mumbai Address',
      jobDescription: bookingDetails.jobDescription || 'Service required',
      bookingType: bookingDetails.bookingType || 'scheduled',
      appointmentDate: bookingDetails.appointmentDate || new Date().toISOString().split('T')[0],
      appointmentTime: bookingDetails.appointmentTime || '10:00 AM',
      estimatedHours: parseFloat(bookingDetails.estimatedHours) || 2,
      basePrice,
      visitingCharge,
      customerOffer: bookingDetails.customerOffer ? parseFloat(bookingDetails.customerOffer) : null,
      counterOfferHistory: bookingDetails.customerOffer ? [
        { sender: 'customer', amount: bookingDetails.customerOffer, note: 'Initial customer offer' }
      ] : [],
      agreedPrice: bookingDetails.customerOffer || finalAmount,
      status: 'Pending confirmation',
      reviewId: null,
      complaintId: null,
      createdAt: new Date().toISOString(),
      completedAt: null
    };
    return newBooking;
  },

  acceptBooking(booking, workerAcceptsOffer = true) {
    if (!booking || !['Pending confirmation', 'Pending'].includes(booking.status)) return booking;
    if (Array.isArray(booking.counterOfferHistory) && booking.counterOfferHistory.length > 0) {
      const last = booking.counterOfferHistory[booking.counterOfferHistory.length - 1];
      if (last && last.sender === 'worker') return booking;
    }
    const agreed = (booking.customerOffer && workerAcceptsOffer) ? booking.customerOffer : (booking.basePrice + booking.visitingCharge || booking.originalEstimate || 350);
    return {
      ...booking,
      status: 'Confirmed',
      agreedPrice: agreed
    };
  },

  rejectBooking(booking) {
    if (!booking || !['Pending confirmation', 'Pending'].includes(booking.status)) return booking;
    return {
      ...booking,
      status: 'Cancelled'
    };
  },

  cancelBooking(booking) {
    if (!booking || ['Job completed', 'Cancelled', 'Disputed'].includes(booking.status)) return booking;
    return {
      ...booking,
      status: 'Cancelled'
    };
  },

  workerCounterOffer(booking, amount, note) {
    if (!booking || !['Pending confirmation', 'Pending'].includes(booking.status)) return booking;
    const newAmount = parseFloat(amount);
    if (isNaN(newAmount) || newAmount <= 0) return booking;
    if (Array.isArray(booking.counterOfferHistory) && booking.counterOfferHistory.length > 0) {
      const last = booking.counterOfferHistory[booking.counterOfferHistory.length - 1];
      if (last && last.sender === 'worker') return booking;
    }
    const history = [...(booking.counterOfferHistory || []), { sender: 'worker', amount: newAmount, note: note || 'Worker counter-offer' }];
    return {
      ...booking,
      counterOfferHistory: history,
      agreedPrice: newAmount
    };
  },

  customerAcceptCounter(booking) {
    const lastCounter = booking.counterOfferHistory[booking.counterOfferHistory.length - 1];
    const agreed = lastCounter ? lastCounter.amount : booking.agreedPrice;
    const history = [...booking.counterOfferHistory, { sender: 'customer', amount: agreed, note: 'Customer accepted counter-offer' }];
    return {
      ...booking,
      status: 'Confirmed',
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

  setEnRoute(booking) {
    if (!['Confirmed', 'Accepted'].includes(booking.status)) return booking;
    return { ...booking, status: 'Worker en route' };
  },

  setArrived(booking) {
    if (booking.status !== 'Worker en route') return booking;
    return { ...booking, status: 'Worker arrived' };
  },

  startJob(booking) {
    if (!['Confirmed', 'Accepted', 'Worker arrived'].includes(booking.status)) return booking;
    return { ...booking, status: 'Job in progress' };
  },

  completeJob(booking) {
    if (booking.status !== 'Job in progress') return booking;
    return {
      ...booking,
      status: 'Job completed',
      completedAt: new Date().toISOString()
    };
  }
};
