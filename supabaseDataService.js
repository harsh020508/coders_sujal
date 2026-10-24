// LocalKaam - Supabase Data Layer & Realtime Synchronizer
import { SupabaseService } from './supabaseClient.js';

export const DataMapper = {
  // Workers
  workerToDb(w) {
    return {
      id: w.id,
      name: w.name,
      category: w.category,
      skills: w.skills || [],
      experience: w.experience || 0,
      hourly_rate: w.hourlyRate || 0,
      base_locality: w.baseLocality || 'andheri',
      service_radius: w.serviceRadius || 10,
      working_days: w.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      working_hours: w.workingHours || { start: '09:00', end: '18:00' },
      available: w.available !== undefined ? w.available : true,
      verification_status: w.verificationStatus || 'Verified',
      rating_average: w.ratingAverage || 5.0,
      rating_count: w.ratingCount || 0,
      avatar: w.avatar || '',
      phone: w.phone || '',
      bio: w.bio || ''
    };
  },

  dbToWorker(row) {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      skills: Array.isArray(row.skills) ? row.skills : (row.skills ? JSON.parse(row.skills) : []),
      experience: Number(row.experience) || 0,
      hourlyRate: Number(row.hourly_rate) || 0,
      baseLocality: row.base_locality,
      serviceRadius: Number(row.service_radius) || 10,
      workingDays: Array.isArray(row.working_days) ? row.working_days : (row.working_days ? JSON.parse(row.working_days) : []),
      workingHours: typeof row.working_hours === 'object' ? row.working_hours : (row.working_hours ? JSON.parse(row.working_hours) : { start: '09:00', end: '18:00' }),
      available: Boolean(row.available),
      verificationStatus: row.verification_status || 'Verified',
      ratingAverage: Number(row.rating_average) || 5.0,
      ratingCount: Number(row.rating_count) || 0,
      avatar: row.avatar || '',
      phone: row.phone || '',
      bio: row.bio || ''
    };
  },

  // Bookings
  bookingToDb(b) {
    return {
      id: b.id,
      customer_id: b.customerId || null,
      worker_id: b.workerId,
      customer_name: b.customerName,
      customer_phone: b.customerPhone,
      service: b.service,
      locality: b.locality,
      address: b.address,
      job_description: b.jobDescription || '',
      booking_type: b.bookingType || 'instant',
      date_time: b.dateTime || new Date().toISOString(),
      estimated_hours: Number(b.estimatedHours) || 1,
      original_estimate: Number(b.originalEstimate) || 0,
      customer_offer: b.customerOffer ? Number(b.customerOffer) : null,
      counter_offer_history: b.counterOfferHistory || [],
      agreed_price: Number(b.agreedPrice) || 0,
      status: b.status || 'Pending',
      review_id: b.reviewId || null,
      complaint_id: b.complaintId || null,
      created_at: b.createdAt || new Date().toISOString(),
      completed_at: b.completedAt || null
    };
  },

  dbToBooking(row) {
    return {
      id: row.id,
      customerId: row.customer_id,
      workerId: row.worker_id,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      service: row.service,
      locality: row.locality,
      address: row.address,
      jobDescription: row.job_description,
      bookingType: row.booking_type,
      dateTime: row.date_time,
      estimatedHours: Number(row.estimated_hours) || 1,
      originalEstimate: Number(row.original_estimate) || 0,
      customerOffer: row.customer_offer ? Number(row.customer_offer) : null,
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
    return {
      id: r.id,
      booking_id: r.bookingId,
      worker_id: r.workerId,
      customer_id: r.customerId || null,
      customer_name: r.customerName || 'Anonymous',
      rating: Number(r.rating) || 5,
      comment: r.comment || '',
      created_at: r.createdAt || new Date().toISOString()
    };
  },

  dbToReview(row) {
    return {
      id: row.id,
      bookingId: row.booking_id,
      workerId: row.worker_id,
      customerId: row.customer_id,
      customerName: row.customer_name,
      rating: Number(row.rating) || 5,
      comment: row.comment,
      createdAt: row.created_at
    };
  },

  // Complaints
  complaintToDb(c) {
    return {
      id: c.id,
      booking_id: c.bookingId,
      worker_id: c.workerId || null,
      customer_id: c.customerId || null,
      customer_name: c.customerName || 'Customer',
      issue: c.issue,
      details: c.details || '',
      status: c.status || 'Open',
      created_at: c.createdAt || new Date().toISOString()
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
        console.warn('Supabase fetchWorkers error:', error.message);
        return null;
      }
      return (data || []).map(DataMapper.dbToWorker);
    } catch (e) {
      console.warn('Error fetching workers from Supabase:', e);
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
        console.error('Supabase upsertWorker error:', error);
        return null;
      }
      return data ? DataMapper.dbToWorker(data) : null;
    } catch (e) {
      console.error('Error saving worker to Supabase:', e);
      return null;
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
        console.warn('Supabase fetchBookings error:', error.message);
        return null;
      }
      return (data || []).map(DataMapper.dbToBooking);
    } catch (e) {
      console.warn('Error fetching bookings from Supabase:', e);
      return null;
    }
  },

  async upsertBooking(booking) {
    const client = await SupabaseService.getClient();
    if (!client) return null;

    try {
      const dbRow = DataMapper.bookingToDb(booking);
      const { data, error } = await client
        .from('bookings')
        .upsert(dbRow, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('Supabase upsertBooking error:', error);
        return null;
      }
      return data ? DataMapper.dbToBooking(data) : null;
    } catch (e) {
      console.error('Error saving booking to Supabase:', e);
      return null;
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

      if (error) return null;
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

  // REALTIME SUBSCRIPTIONS
  subscribeRealtime(onUpdate) {
    SupabaseService.getClient().then(client => {
      if (!client) return;

      try {
        const channel = client.channel('localkaam-db-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, payload => {
            console.log('Realtime bookings update received:', payload);
            if (onUpdate) onUpdate('bookings', payload);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'workers' }, payload => {
            console.log('Realtime workers update received:', payload);
            if (onUpdate) onUpdate('workers', payload);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, payload => {
            if (onUpdate) onUpdate('reviews', payload);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, payload => {
            if (onUpdate) onUpdate('complaints', payload);
          })
          .subscribe();

        return () => {
          client.removeChannel(channel);
        };
      } catch (e) {
        console.warn('Realtime subscription error:', e);
      }
    });
  }
};
