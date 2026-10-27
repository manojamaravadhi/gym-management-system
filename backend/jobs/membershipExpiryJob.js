const cron = require('node-cron');
const { query, getClient } = require('../config/db');

/**
 * Executes the membership expiry check:
 * 1. Identifies active memberships where end_date < CURRENT_DATE
 * 2. Transitions them to 'expired' in a batched transactional update
 * 3. Updates member profile statuses if no remaining active plan exists
 * 4. Logs an immutable audit record in audit_logs
 */
async function runMembershipExpiryCheck() {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Batch update memberships where end_date < CURRENT_DATE and status = 'active'
    const updatedMemberships = await client.query(
      `UPDATE memberships
       SET status = 'expired', updated_at = NOW()
       WHERE status = 'active' AND end_date < CURRENT_DATE
       RETURNING id, member_id, plan_name, end_date`
    );

    const count = updatedMemberships.rows.length;

    // 2. Update member status to 'expired' if they have no other active subscription
    if (count > 0) {
      const memberIds = [...new Set(updatedMemberships.rows.map((r) => r.member_id))];
      await client.query(
        `UPDATE members m
         SET status = 'expired', updated_at = NOW()
         WHERE id = ANY($1::int[])
           AND NOT EXISTS (
             SELECT 1 FROM memberships ms
             WHERE ms.member_id = m.id AND ms.status = 'active'
           )`,
        [memberIds]
      );
    }

    // 3. Write structured audit record
    const auditRes = await client.query(
      `INSERT INTO audit_logs (event_type, description, metadata, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [
        'MEMBERSHIP_EXPIRY_CHECK',
        `Membership expiry job transitioned ${count} membership(s) to expired status.`,
        JSON.stringify({
          affected_count: count,
          membership_ids: updatedMemberships.rows.map((r) => r.id),
          executed_at: new Date().toISOString(),
        }),
      ]
    );

    await client.query('COMMIT');

    return {
      success: true,
      affectedCount: count,
      affectedMemberships: updatedMemberships.rows,
      auditLog: auditRes.rows[0],
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Background Worker] Error running membership expiry check:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Initializes the background cron worker.
 * Runs daily at midnight (00:00:00 server time).
 */
function initScheduler() {
  // Standard cron syntax: minute hour day-of-month month day-of-week
  cron.schedule('0 0 * * *', async () => {
    console.log('[Scheduler] Executing automated daily membership expiry check...');
    try {
      const result = await runMembershipExpiryCheck();
      console.log(`[Scheduler] Completed. Transferred ${result.affectedCount} membership(s) to expired.`);
    } catch (err) {
      console.error('[Scheduler] Failed scheduled job:', err.message);
    }
  });

  console.log('⏰ [Scheduler] Background cron worker started: daily midnight membership expiry check active.');
}

module.exports = { runMembershipExpiryCheck, initScheduler };
