const { query, getClient } = require('../config/db');
const { ok, created, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/appointments/slots
 * Returns available timetable slots for public or member booking
 */
const listSlots = asyncHandler(async (req, res) => {
  const { trainer_id, date } = req.query;
  const where = ['ts.is_active = TRUE'];
  const params = [];

  if (trainer_id) {
    params.push(trainer_id);
    where.push(`ts.trainer_id = $${params.length}`);
  }
  if (date) {
    params.push(date);
    where.push(`ts.slot_date = $${params.length}`);
  } else {
    where.push(`ts.slot_date >= CURRENT_DATE`);
  }

  const { rows } = await query(
    `SELECT ts.*,
            t.name AS trainer_name,
            t.specialization AS trainer_specialization,
            s.title AS service_title,
            (ts.capacity - ts.booked_count) AS available_seats
     FROM timetable_slots ts
     LEFT JOIN trainers t ON t.id = ts.trainer_id
     LEFT JOIN services s ON s.id = ts.service_id
     WHERE ${where.join(' AND ')}
     ORDER BY ts.slot_date ASC, ts.start_time ASC`,
    params
  );

  return ok(res, rows);
});

/**
 * POST /api/appointments/slots (admin only)
 * Creates a new timetable slot with specific capacity
 */
const createSlot = asyncHandler(async (req, res) => {
  const { trainer_id, service_id, slot_date, start_time, end_time, capacity } = req.body;
  if (!trainer_id || !slot_date || !start_time || !end_time) {
    return fail(res, 'Trainer, slot date, start time, and end time are required', 400);
  }

  const { rows } = await query(
    `INSERT INTO timetable_slots (trainer_id, service_id, slot_date, start_time, end_time, capacity, booked_count, is_active)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, 10), 0, TRUE)
     RETURNING *`,
    [trainer_id, service_id || null, slot_date, start_time, end_time, capacity || 10]
  );

  return created(res, rows[0], 'Timetable slot created');
});

/**
 * POST /api/appointments (public/member booking)
 * Wraps booking in a PostgreSQL TRANSACTION with row-level locking (FOR UPDATE)
 * to eliminate race conditions and enforce slot capacity atomically.
 */
const create = asyncHandler(async (req, res) => {
  const {
    slot_id,
    customer_name,
    email,
    phone,
    trainer_id,
    service_id,
    appointment_date,
    appointment_time,
    notes,
  } = req.body;

  // Reject past dates if specified directly
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (appointment_date) {
    const parsedDate = new Date(appointment_date);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate < today) {
      return fail(res, 'Please choose a valid future date', 400);
    }
  }

  // Acquire dedicated client from connection pool for explicit transaction management
  const client = await getClient();

  try {
    // 1. Begin atomic transaction block
    await client.query('BEGIN');

    let targetSlotId = slot_id ? parseInt(slot_id, 10) : null;
    let trainerVal = trainer_id ? parseInt(trainer_id, 10) : null;
    let serviceVal = service_id ? parseInt(service_id, 10) : null;
    let dateVal = appointment_date;
    let timeVal = appointment_time;

    if (targetSlotId) {
      // 2. Concurrency Control: Acquire pessimistic row lock on the timetable slot
      const slotResult = await client.query(
        `SELECT id, trainer_id, service_id, slot_date, start_time, capacity, booked_count, is_active
         FROM timetable_slots
         WHERE id = $1
         FOR UPDATE`,
        [targetSlotId]
      );

      if (!slotResult.rows.length || !slotResult.rows[0].is_active) {
        await client.query('ROLLBACK');
        return fail(res, 'Selected slot is invalid or no longer active', 404);
      }

      const slot = slotResult.rows[0];

      // Check capacity boundary
      if (slot.booked_count >= slot.capacity) {
        await client.query('ROLLBACK');
        return fail(res, `Selected slot is fully booked (${slot.booked_count}/${slot.capacity} seats taken)`, 409);
      }

      // Inherit slot trainer and schedule attributes if not overridden
      trainerVal = slot.trainer_id;
      serviceVal = slot.service_id || serviceVal;
      dateVal = slot.slot_date;
      timeVal = slot.start_time;

      // 3. Atomic increment of booked count
      await client.query(
        `UPDATE timetable_slots
         SET booked_count = booked_count + 1, updated_at = NOW()
         WHERE id = $1`,
        [targetSlotId]
      );
    } else if (trainerVal && dateVal && timeVal) {
      // Check for an existing matching timetable slot or dynamically allocate one under lock
      const existingSlot = await client.query(
        `SELECT id, capacity, booked_count, is_active
         FROM timetable_slots
         WHERE trainer_id = $1 AND slot_date = $2 AND start_time = $3
         FOR UPDATE`,
        [trainerVal, dateVal, timeVal]
      );

      if (existingSlot.rows.length > 0) {
        const slot = existingSlot.rows[0];
        if (slot.booked_count >= slot.capacity) {
          await client.query('ROLLBACK');
          return fail(res, `This session slot is fully booked (${slot.booked_count}/${slot.capacity})`, 409);
        }
        targetSlotId = slot.id;
        await client.query(
          `UPDATE timetable_slots
           SET booked_count = booked_count + 1, updated_at = NOW()
           WHERE id = $1`,
          [targetSlotId]
        );
      } else {
        // Automatically allocate slot with default capacity 8 and 1 seat booked
        const newSlot = await client.query(
          `INSERT INTO timetable_slots (trainer_id, service_id, slot_date, start_time, end_time, capacity, booked_count)
           VALUES ($1, $2, $3, $4, ($4::time + interval '1 hour'), 8, 1)
           RETURNING id`,
          [trainerVal, serviceVal, dateVal, timeVal]
        );
        targetSlotId = newSlot.rows[0].id;
      }
    }

    // Optional member linkage by email
    const memberRes = await client.query('SELECT id FROM members WHERE email = $1 LIMIT 1', [email]);
    const memberId = memberRes.rows[0]?.id || null;

    // 4. Create appointment record
    const insertRes = await client.query(
      `INSERT INTO appointments
         (slot_id, member_id, trainer_id, service_id, customer_name, email, phone, appointment_date, appointment_time, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
       RETURNING *`,
      [
        targetSlotId,
        memberId,
        trainerVal || null,
        serviceVal || null,
        customer_name,
        email,
        phone || null,
        dateVal,
        timeVal,
        notes || null,
      ]
    );

    // 5. Commit atomic transaction
    await client.query('COMMIT');

    return created(res, insertRes.rows[0], 'Appointment booked successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

/** GET /api/appointments (admin) */
const list = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const where = [];
  const params = [];
  if (status) {
    params.push(status);
    where.push(`a.status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    where.push(`(a.customer_name ILIKE $${params.length} OR a.email ILIKE $${params.length})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const countRes = await query(`SELECT COUNT(*)::int AS total FROM appointments a ${whereSql}`, params);
  const rowsRes = await query(
    `SELECT a.*,
            t.name AS trainer_name,
            s.title AS service_title,
            ts.start_time AS slot_start,
            ts.end_time AS slot_end,
            ts.capacity AS slot_capacity,
            ts.booked_count AS slot_booked
     FROM appointments a
     LEFT JOIN trainers t ON t.id = a.trainer_id
     LEFT JOIN services s ON s.id = a.service_id
     LEFT JOIN timetable_slots ts ON ts.id = a.slot_id
     ${whereSql}
     ORDER BY a.appointment_date DESC, a.appointment_time DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return ok(res, {
    items: rowsRes.rows,
    pagination: { page, limit, total: countRes.rows[0].total, pages: Math.ceil(countRes.rows[0].total / limit) || 1 },
  });
});

/** PATCH /api/appointments/:id/status */
const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const valid = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!valid.includes(status)) return fail(res, 'Invalid status', 400);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const prevRes = await client.query(
      'SELECT id, slot_id, status FROM appointments WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );
    if (!prevRes.rows.length) {
      await client.query('ROLLBACK');
      return fail(res, 'Appointment not found', 404);
    }

    const prev = prevRes.rows[0];

    // If transitioning to cancelled from active/pending, release the seat
    if (status === 'cancelled' && prev.status !== 'cancelled' && prev.slot_id) {
      await client.query(
        `UPDATE timetable_slots
         SET booked_count = GREATEST(booked_count - 1, 0), updated_at = NOW()
         WHERE id = $1`,
        [prev.slot_id]
      );
    }
    // If reactivating a previously cancelled appointment, increment if capacity permits
    else if (prev.status === 'cancelled' && status !== 'cancelled' && prev.slot_id) {
      const slot = await client.query(
        'SELECT capacity, booked_count FROM timetable_slots WHERE id = $1 FOR UPDATE',
        [prev.slot_id]
      );
      if (slot.rows.length && slot.rows[0].booked_count < slot.rows[0].capacity) {
        await client.query(
          `UPDATE timetable_slots
           SET booked_count = booked_count + 1, updated_at = NOW()
           WHERE id = $1`,
          [prev.slot_id]
        );
      }
    }

    const { rows } = await client.query(
      'UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    await client.query('COMMIT');
    return ok(res, rows[0], 'Appointment status updated');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

/** DELETE /api/appointments/:id */
const remove = asyncHandler(async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const appt = await client.query(
      'SELECT id, slot_id, status FROM appointments WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );

    if (!appt.rows.length) {
      await client.query('ROLLBACK');
      return fail(res, 'Appointment not found', 404);
    }

    const row = appt.rows[0];
    if (row.slot_id && row.status !== 'cancelled') {
      await client.query(
        `UPDATE timetable_slots
         SET booked_count = GREATEST(booked_count - 1, 0), updated_at = NOW()
         WHERE id = $1`,
        [row.slot_id]
      );
    }

    await client.query('DELETE FROM appointments WHERE id = $1', [req.params.id]);

    await client.query('COMMIT');
    return ok(res, {}, 'Appointment deleted');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

module.exports = { listSlots, createSlot, create, list, updateStatus, remove };
