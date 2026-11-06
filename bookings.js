// Uber/Ola-style arrival OTP, generated in-app when the customer books.
// The customer sees it in the app and shares it verbally when the worker
// reaches home; the worker types it in to verify arrival. No SMS/phone.
export function generateArrivalOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function arrivalOtpExpiry(appointmentDate) {
  const d = appointmentDate ? new Date(`${appointmentDate}T23:59:59`) : null;
  const appt = d && !isNaN(d) ? d.getTime() + 12 * 3600e3 : Date.now() + 24 * 3600e3;
  return Math.max(appt, Date.now() + 24 * 3600e3);
}

// Returns { ok: true } or { ok: false, error, attemptsRemaining? }.
// On success the booking's OTP is marked used (single-use).
export function verifyArrivalOtp(booking, otp) {
  if (!booking?.arrivalOtp) return { ok: false, error: 'No OTP generated for this booking yet.' };
  if (booking.arrivalOtpUsed) return { ok: false, error: 'This OTP has already been used.' };
  if (Date.now() > (booking.arrivalOtpExpiresAt || 0)) return { ok: false, error: 'OTP has expired. Please ask the customer for a new code.' };
  if ((booking.arrivalOtpAttempts || 0) >= 5) return { ok: false, error: 'Maximum OTP attempts exceeded. Please ask the customer for a new code.' };
  if (String(otp || '').trim() !== String(booking.arrivalOtp)) {
    booking.arrivalOtpAttempts = (booking.arrivalOtpAttempts || 0) + 1;
    return { ok: false, error: 'Incorrect OTP.', attemptsRemaining: Math.max(0, 5 - booking.arrivalOtpAttempts) };
  }
  booking.arrivalOtpUsed = true;
  return { ok: true };
}

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
      photoUrl: bookingDetails.photoUrl || null,
      aiDiagnosis: bookingDetails.aiDiagnosis || null,
      urgency: bookingDetails.urgency || 'medium',
      customerCoordinates: customerData.coordinates || null,
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
      customerId: customerData.id || customerData.customerId || null,
      customer_id: customerData.id || customerData.customerId || null,
      status: 'Pending confirmation',
      // Shown to the customer in-app at booking time (Uber/Ola-style).
      arrivalOtp: generateArrivalOtp(),
      arrivalOtpExpiresAt: arrivalOtpExpiry(bookingDetails.appointmentDate || new Date().toISOString().split('T')[0]),
      arrivalOtpAttempts: 0,
      arrivalOtpUsed: false,
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
