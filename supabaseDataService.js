import { SupabaseService } from './supabaseClient.js';

export const DataMapper = {
  // Workers
  workerToDb(w) {
    const specs = w.specialities || {};
    const firstSpec = Object.keys(specs)[0];
    const firstSpecInfo = firstSpec ? specs[firstSpec] : null;

    return {
      id: w.id,
      user_id: w.userId || w.user_id || null,
      name: w.name,
      category: w.category || firstSpec || 'plumber',
      skills: w.skills || [],
      experience: Number(w.experience) || 1,
      hourly_rate: Number(w.hourlyRate || w.hourly_rate || firstSpecInfo?.startingPrice) || 300,
      base_locality: w.baseLocality || w.base_locality || 'andheri',
      service_radius: Number(w.serviceRadius || w.service_radius) || 10,
      service_area: w.serviceArea || w.service_area || 'Mumbai Suburbs',
      working_days: w.workingDays || w.working_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      working_hours: w.workingHours || w.working_hours || { start: '08:00', end: '20:00' },
      available: w.available !== undefined ? Boolean(w.available) : true,
      pause_new_bookings: Boolean(w.pauseNewBookings || w.pause_new_bookings),
      profile_completed: w.profileCompleted !== undefined ? Boolean(w.profileCompleted) : true,
      verification_status: w.verificationStatus || w.verification_status || 'Verified',
      rating_average: Number(w.ratingAverage || w.rating_average) || 4.8,
      rating_count: Number(w.ratingCount || w.rating_count) || 0,
      avatar: w.avatar || '',
      phone: w.phone || '',
      bio: w.bio || '',
      specialities: specs,
      languages: w.languages || ['Hindi', 'English'],
      past_experience: w.pastExperience || w.past_experience || '',
      certifications: w.certifications || ''
    };
  },

  dbToWorker(row) {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      category: row.category,
      skills: Array.isArray(row.skills) ? row.skills : (row.skills ? JSON.parse(row.skills) : []),
      experience: Number(row.experience) || 1,
      hourlyRate: Number(row.hourly_rate) || 300,
      baseLocality: row.base_locality || 'andheri',
      serviceRadius: Number(row.service_radius) || 10,
      serviceArea: row.service_area || 'Mumbai Suburbs',
      workingDays: Array.isArray(row.working_days) ? row.working_days : (row.working_days ? JSON.parse(row.working_days) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']),
      workingHours: typeof row.working_hours === 'object' && row.working_hours !== null ? row.working_hours : (row.working_hours ? JSON.parse(row.working_hours) : { start: '08:00', end: '20:00' }),
      available: Boolean(row.available),
      pauseNewBookings: Boolean(row.pause_new_bookings),
      profileCompleted: row.profile_completed !== undefined ? Boolean(row.profile_completed) : true,
      verificationStatus: row.verification_status || 'Verified',
      ratingAverage: Number(row.rating_average) || 4.8,
      ratingCount: Number(row.rating_count) || 0,
      avatar: row.avatar || '',
      phone: row.phone || '',
      bio: row.bio || '',
      specialities: typeof row.specialities === 'object' && row.specialities !== null ? row.specialities : (row.specialities ? JSON.parse(row.specialities) : {}),
      languages: Array.isArray(row.languages) ? row.languages : (row.languages ? JSON.parse(row.languages) : ['Hindi', 'English']),
      pastExperience: row.past_experience || '',
      certifications: row.certifications || ''
    };
  },

  // Worker Services (pricing catalog per category)
  workerServiceToDb(ws) {
    return {
      id: ws.id,
      worker_id: ws.workerId || ws.worker_id,
      category: ws.category,
      starting_price: Number(ws.startingPrice || ws.starting_price) || 300,
      visiting_charge: Number(ws.visitingCharge || ws.visiting_charge) || 100,
      pricing_method: ws.pricingMethod || ws.pricing_method || 'hourly',
      est_duration: ws.estDuration || ws.est_duration || '1-2 hours',
      tasks: ws.tasks || [],
      certifications: ws.certifications || ''
    };
  },

  dbToWorkerService(row) {
    return {
      id: row.id,
      workerId: row.worker_id,
      category: row.category,
      startingPrice: Number(row.starting_price) || 300,
      visitingCharge: Number(row.visiting_charge) || 100,
      pricingMethod: row.pricing_method || 'hourly',
      estDuration: row.est_duration || '1-2 hours',
      tasks: Array.isArray(row.tasks) ? row.tasks : (row.tasks ? JSON.parse(row.tasks) : []),
      certifications: row.certifications || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  },

  // Bookings
  bookingToDb(b) {
    return {
      id: b.id,
      customer_id: b.customerId || b.customer_id || null,
      worker_id: b.workerId || b.worker_id,
      customer_name: b.customerName || b.customer_name || 'Customer',
      customer_phone: b.customerPhone || b.customer_phone || '+91 98765 43210',
      service_category: b.serviceCategory || b.service_category || 'plumber',
      service_task: b.serviceTask || b.service_task || 'General Service',
      locality: b.locality || 'andheri',
      address: b.address || 'Mumbai Address',
      job_description: b.jobDescription || b.job_description || '',
      booking_type: b.bookingType || b.booking_type || 'scheduled',
      appointment_date: b.appointmentDate || b.appointment_date || new Date().toISOString().split('T')[0],
      appointment_time: b.appointmentTime || b.appointment_time || '10:00 AM',
      date_time: b.dateTime || b.date_time || new Date().toISOString(),
      estimated_hours: Number(b.estimatedHours || b.estimated_hours) || 1,
      base_price: Number(b.basePrice || b.base_price) || 0,
      visiting_charge: Number(b.visitingCharge || b.visiting_charge) || 0,
      original_estimate: Number(b.originalEstimate || b.original_estimate) || 0,
      customer_offer: b.customerOffer !== null && b.customerOffer !== undefined ? Number(b.customerOffer) : null,
      counter_offer_history: b.counterOfferHistory || b.counter_offer_history || [],
      agreed_price: Number(b.agreedPrice || b.agreed_price) || 0,
      status: b.status || 'Pending confirmation',
      review_id: b.reviewId || b.review_id || null,
      complaint_id: b.complaintId || b.complaint_id || null,
      created_at: b.createdAt || b.created_at || new Date().toISOString(),
      completed_at: b.completedAt || b.completed_at || null
    };
  },

  dbToBooking(row) {
    return {
      id: row.id,
      customerId: row.customer_id,
      workerId: row.worker_id,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      serviceCategory: row.service_category,
      serviceTask: row.service_task || 'General Service',
      locality: row.locality,
      address: row.address,
      jobDescription: row.job_description || '',
      bookingType: row.booking_type || 'scheduled',
      appointmentDate: row.appointment_date || (row.date_time ? row.date_time.split('T')[0] : new Date().toISOString().split('T')[0]),
      appointmentTime: row.appointment_time || '10:00 AM',
      dateTime: row.date_time || row.created_at,
      estimatedHours: Number(row.estimated_hours) || 1,
      basePrice: Number(row.base_price) || 0,
      visitingCharge: Number(row.visiting_charge) || 0,
      originalEstimate: Number(row.original_estimate) || 0,
      customerOffer: row.customer_offer !== null && row.customer_offer !== undefined ? Number(row.customer_offer) : null,
      counterOfferHistory: Array.isArray(row.counter_offer_history) ? row.counter_offer_history : (row.counter_offer_history ? JSON.parse(row.counter_offer_history) : []),
      agreedPrice: Number(row.agreed_price) || 0,
      status: row.status,
      reviewId: row.review_id,
      complaintId: row.complaint_id,
      createdAt: row.created_at,
      completedAt: row.completed_at
    };
  },

  // Reviews
  reviewToDb(r) {
    const overall = Number(r.overallRating || r.rating) || 5;
    return {
      id: r.id,
      booking_id: r.bookingId || r.booking_id,
      worker_id: r.workerId || r.worker_id,
      customer_id: r.customerId || r.customer_id || null,
      customer_name: r.customerName || r.customer_name || 'Customer',
      rating: overall,
      overall_rating: overall,
      quality_rating: Number(r.qualityRating || overall) || 5,
      behaviour_rating: Number(r.behaviourRating || overall) || 5,
      punctuality_rating: Number(r.punctualityRating || overall) || 5,
      communication_rating: Number(r.communicationRating || overall) || 5,
      feedback_tags: r.feedbackTags || [],
      comment: r.comment || '',
      created_at: r.createdAt || r.created_at || new Date().toISOString()
    };
  },

  dbToReview(row) {
    const overall = Number(row.overall_rating || row.rating) || 5;
    return {
      id: row.id,
      bookingId: row.booking_id,
      workerId: row.worker_id,
      customerId: row.customer_id,
      customerName: row.customer_name,
      rating: overall,
      overallRating: overall,
      qualityRating: Number(row.quality_rating) || overall,
      behaviourRating: Number(row.behaviour_rating) || overall,
      punctualityRating: Number(row.punctuality_rating) || overall,
      communicationRating: Number(row.communication_rating) || overall,
      comment: row.comment,
      feedbackTags: Array.isArray(row.feedback_tags) ? row.feedback_tags : (row.feedback_tags ? JSON.parse(row.feedback_tags) : []),
      createdAt: row.created_at
    };
  },

  // Complaints
  complaintToDb(c) {
    return {
      id: c.id,
      booking_id: c.bookingId || c.booking_id,
      worker_id: c.workerId || c.worker_id || null,
      customer_id: c.customerId || c.customer_id || null,
      customer_name: c.customerName || c.customer_name || 'Customer',
      issue: c.issue,
      details: c.details || '',
      status: c.status || 'Open',
      created_at: c.createdAt || c.created_at || new Date().toISOString()
    };
  },

  dbToComplaint(row) {
    return {
      id: row.id,
      bookingId: row.booking_id,
      workerId: row.worker_id,
      customerId: row.customer_id,
      customerName: row.customer_name,
      issue: row.issue,
      details: row.details,
      status: row.status,
      createdAt: row.created_at
    };
  },

  // Support Tickets
  supportTicketToDb(t) {
    return {
      id: t.id,
      booking_id: t.bookingId || null,
      worker_id: t.workerId || null,
      customer_id: t.customerId || null,
      customer_name: t.customerName || 'Customer',
      category: t.category,
      subject: t.subject,
      description: t.description,
      status: t.status || 'Open',
      priority: t.priority || 'Medium',
      response: t.response || '',
      created_at: t.createdAt || new Date().toISOString(),
      updated_at: t.updatedAt || new Date().toISOString()
    };
  },

  dbToSupportTicket(row) {
    return {
      id: row.id,
      bookingId: row.booking_id,
      workerId: row.worker_id,
      customerId: row.customer_id,
      customerName: row.customer_name,
      category: row.category,
      subject: row.subject,
      description: row.description,
      status: row.status,
      priority: row.priority,
      response: row.response,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  },

  // Notifications
  notificationToDb(n) {
    return {
      id: n.id,
      user_id: n.userId || n.user_id,
      booking_id: n.bookingId || n.booking_id,
      notification_type: n.notificationType || n.notification_type,
      title: n.title,
      message: n.message,
      is_read: Boolean(n.isRead !== undefined ? n.isRead : n.is_read),
      created_at: n.createdAt || n.created_at || new Date().toISOString()
    };
  },

  dbToNotification(row) {
    return {
      id: row.id,
      userId: row.user_id,
      bookingId: row.booking_id,
      notificationType: row.notification_type,
      title: row.title,
      message: row.message,
      isRead: Boolean(row.is_read),
      createdAt: row.created_at
    };
  }
};

export const SupabaseDataService = {
  // WORKERS
  async fetchWorkers() {
    const client = await SupabaseService.getClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('workers')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.warn('[Supabase] fetchWorkers error:', error.message);
        return null;
      }
      return (data || []).map(DataMapper.dbToWorker);
    } catch (e) {
      console.warn('[Supabase] fetchWorkers exception:', e);
      return null;
    }
  },

  async upsertWorker(worker) {
    const client = await SupabaseService.getClient();
    if (!client) return null;

    try {
      const dbRow = DataMapper.workerToDb(worker);
      const { data, error } = await client
        .from('workers')
        .upsert(dbRow, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('[Supabase] upsertWorker error:', error.message);
        return { data: null, error };
      }
      return { data: data ? DataMapper.dbToWorker(data) : null, error: null };
    } catch (e) {
      console.error('[Supabase] upsertWorker exception:', e);
      return { data: null, error: e };
    }
  },

  // BOOKINGS
  async fetchBookings() {
    const client = await SupabaseService.getClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[Supabase] fetchBookings error:', error.message);
        return null;
      }
      return (data || []).map(DataMapper.dbToBooking);
    } catch (e) {
      console.warn('[Supabase] fetchBookings exception:', e);
      return null;
    }
  },

  async upsertBooking(booking) {
    const client = await SupabaseService.getClient();
    if (!client) return { data: null, error: { message: 'Supabase client not initialized' } };

    try {
      const dbRow = DataMapper.bookingToDb(booking);
      const { data, error } = await client
        .from('bookings')
        .upsert(dbRow, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('[Supabase] upsertBooking error:', error.message);
        return { data: null, error };
      }
      return { data: data ? DataMapper.dbToBooking(data) : null, error: null };
    } catch (e) {
      console.error('[Supabase] upsertBooking exception:', e);
      return { data: null, error: e };
    }
  },

  // REVIEWS
  async fetchReviews() {
    const client = await SupabaseService.getClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return null;
      return (data || []).map(DataMapper.dbToReview);
    } catch (e) {
      return null;
    }
  },

  async upsertReview(review) {
    const client = await SupabaseService.getClient();
    if (!client) return null;

    try {
      const dbRow = DataMapper.reviewToDb(review);
      const { data, error } = await client
        .from('reviews')
        .upsert(dbRow, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('[Supabase] upsertReview error:', error.message);
        return null;
      }
      return data ? DataMapper.dbToReview(data) : null;
    } catch (e) {
      return null;
    }
  },

  // COMPLAINTS
  async fetchComplaints() {
    const client = await SupabaseService.getClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return null;
      return (data || []).map(DataMapper.dbToComplaint);
    } catch (e) {
      return null;
    }
  },

  async upsertComplaint(complaint) {
    const client = await SupabaseService.getClient();
    if (!client) return null;

    try {
      const dbRow = DataMapper.complaintToDb(complaint);
      const { data, error } = await client
        .from('complaints')
        .upsert(dbRow, { onConflict: 'id' })
        .select()
        .single();

      if (error) return null;
      return data ? DataMapper.dbToComplaint(data) : null;
    } catch (e) {
      return null;
    }
  },

  // SUPPORT TICKETS
  async fetchSupportTickets() {
    const client = await SupabaseService.getClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return null;
      return (data || []).map(DataMapper.dbToSupportTicket);
    } catch (e) {
      return null;
    }
  },

  async upsertSupportTicket(ticket) {
    const client = await SupabaseService.getClient();
    if (!client) return null;

    try {
      const dbRow = DataMapper.supportTicketToDb(ticket);
      const { data, error } = await client
        .from('support_tickets')
        .upsert(dbRow, { onConflict: 'id' })
        .select()
        .single();

      if (error) return null;
      return data ? DataMapper.dbToSupportTicket(data) : null;
    } catch (e) {
      return null;
    }
  },

  // NOTIFICATIONS
  async fetchNotifications(userId) {
    const client = await SupabaseService.getClient();
    if (!client) return [];

    try {
      let query = client
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[Supabase] fetchNotifications warning:', error.message);
        return [];
      }
      return (data || []).map(r => DataMapper.dbToNotification(r));
    } catch (e) {
      console.warn('[Supabase] fetchNotifications exception:', e);
      return [];
    }
  },

  async markNotificationRead(notificationId, userId) {
    const client = await SupabaseService.getClient();
    if (!client) return false;

    try {
      let query = client
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { error } = await query;
      return !error;
    } catch (e) {
      return false;
    }
  },

  async markAllNotificationsRead(userId) {
    const client = await SupabaseService.getClient();
    if (!client || !userId) return false;

    try {
      const { error } = await client
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId);

      return !error;
    } catch (e) {
      return false;
    }
  },

  async upsertNotification(notification) {
    const client = await SupabaseService.getClient();
    if (!client) return { error: new Error('Supabase client unavailable') };

    const payload = DataMapper.notificationToDb(notification);
    try {
      const { data, error } = await client
        .from('notifications')
        .upsert(payload, { onConflict: 'booking_id,notification_type' })
        .select()
        .single();

      return { data: data ? DataMapper.dbToNotification(data) : null, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  // REALTIME SUBSCRIPTIONS
  subscribeRealtime(onUpdate) {
    SupabaseService.getClient().then(client => {
      if (!client) return;

      try {
        const channel = client.channel('localkaam-realtime-sync')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, payload => {
            console.log('[Realtime] Bookings change received:', payload.eventType, payload.new?.id, payload.new?.status);
            if (onUpdate) onUpdate('bookings', payload);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'workers' }, payload => {
            console.log('[Realtime] Workers change received:', payload.eventType, payload.new?.id, 'available:', payload.new?.available);
            if (onUpdate) onUpdate('workers', payload);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, payload => {
            if (onUpdate) onUpdate('reviews', payload);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, payload => {
            if (onUpdate) onUpdate('complaints', payload);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, payload => {
            console.log('[Realtime] Notification received:', payload.eventType, payload.new?.notification_type);
            if (onUpdate) onUpdate('notifications', payload);
          })
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
              console.log('[Realtime] Cross-device sync channel active!');
            } else if (err) {
              console.warn('[Realtime] Subscription warning:', status, err);
            }
          });

        return () => {
          client.removeChannel(channel);
        };
      } catch (e) {
        console.warn('[Realtime] Subscription exception:', e);
      }
    });
  }
};