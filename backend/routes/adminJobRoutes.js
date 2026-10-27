const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const { runMembershipExpiryCheck } = require('../jobs/membershipExpiryJob');
const { query } = require('../config/db');
const { ok } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/admin/jobs/trigger-expiry-check
 * Protected by admin authentication; manually triggers the membership expiration worker.
 */
router.post('/trigger-expiry-check', requireAdmin, asyncHandler(async (req, res) => {
  const result = await runMembershipExpiryCheck();
  return ok(
    res,
    result,
    `Membership expiry check completed. ${result.affectedCount} membership(s) transitioned to expired.`
  );
}));

/**
 * GET /api/admin/jobs/audit-logs
 * Protected by admin authentication; retrieves system audit records.
 */
router.get('/audit-logs', requireAdmin, asyncHandler(async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
  const { rows } = await query(
    `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return ok(res, rows);
}));

module.exports = router;
