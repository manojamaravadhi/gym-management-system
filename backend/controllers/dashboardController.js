const { query } = require('../config/db');
const { ok } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/dashboard (admin)
 * Comprehensive analytics engine utilizing advanced PostgreSQL window functions,
 * time-series aggregations, and capacity metrics.
 */
const stats = asyncHandler(async (req, res) => {
  const [
    members,
    membersByStatus,
    orders,
    ordersPending,
    revenue,
    upcoming,
    recentMembers,
    recentOrders,
    productsLow,
    mrrQuery,
    salesTrend6Months,
    overallUtilizationQuery,
    trainerUtilizationQuery,
    churnRetentionQuery,
    cohortTrendQuery,
  ] = await Promise.all([
    // Basic counts
    query('SELECT COUNT(*)::int AS c FROM members'),
    query("SELECT status, COUNT(*)::int AS c FROM members GROUP BY status"),
    query('SELECT COUNT(*)::int AS c FROM orders'),
    query("SELECT COUNT(*)::int AS c FROM orders WHERE status = 'pending'"),
    query(`SELECT COALESCE(SUM(amount), 0)::float AS total
           FROM payments
           WHERE status = 'paid'
             AND date_trunc('month', COALESCE(paid_at::timestamptz, created_at)) = date_trunc('month', CURRENT_DATE)`),
    query(`SELECT COUNT(*)::int AS c FROM appointments
           WHERE appointment_date >= CURRENT_DATE AND status IN ('pending', 'confirmed')`),
    query('SELECT id, full_name, email, member_code, status, created_at FROM members ORDER BY created_at DESC LIMIT 5'),
    query('SELECT id, order_code, customer_name, total_amount, status, created_at FROM orders ORDER BY created_at DESC LIMIT 5'),
    query('SELECT COUNT(*)::int AS c FROM products WHERE stock < 10 AND is_active = TRUE'),

    // 1. Monthly Recurring Revenue (MRR) normalized per month across active subscriptions
    query(`SELECT 
             COALESCE(ROUND(SUM(mp.price / GREATEST(mp.duration_months, 1)), 2), 0)::float AS mrr,
             COUNT(m.id)::int AS active_subscriptions
           FROM memberships m
           JOIN membership_plans mp ON mp.id = m.plan_id
           WHERE m.status = 'active' AND m.end_date >= CURRENT_DATE`),

    // Sales and Revenue trend over last 6 months (Time-Series aggregation via generate_series)
    query(`SELECT 
             to_char(date_trunc('month', d.month), 'Mon YYYY') AS month_label,
             COALESCE(SUM(p.amount), 0)::float AS revenue,
             COUNT(p.id)::int AS transaction_count
           FROM generate_series(
             date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
             date_trunc('month', CURRENT_DATE),
             '1 month'
           ) AS d(month)
           LEFT JOIN payments p ON date_trunc('month', COALESCE(p.paid_at::timestamptz, p.created_at)) = d.month
             AND p.status = 'paid'
           GROUP BY d.month
           ORDER BY d.month ASC`),

    // 2. Capacity Utilization Rate overall
    query(`SELECT 
             COALESCE(SUM(capacity), 0)::int AS total_capacity,
             COALESCE(SUM(booked_count), 0)::int AS total_booked,
             CASE 
               WHEN COALESCE(SUM(capacity), 0) > 0 
               THEN ROUND((SUM(booked_count)::numeric / SUM(capacity)::numeric) * 100, 2)::float
               ELSE 0.0 
             END AS utilization_pct
           FROM timetable_slots
           WHERE is_active = TRUE`),

    // Capacity Utilization per trainer
    query(`SELECT 
             t.id AS trainer_id,
             t.name AS trainer_name,
             t.specialization,
             COALESCE(SUM(ts.capacity), 0)::int AS total_capacity,
             COALESCE(SUM(ts.booked_count), 0)::int AS total_booked,
             CASE 
               WHEN COALESCE(SUM(ts.capacity), 0) > 0 
               THEN ROUND((SUM(ts.booked_count)::numeric / SUM(ts.capacity)::numeric) * 100, 2)::float
               ELSE 0.0 
             END AS utilization_pct
           FROM trainers t
           LEFT JOIN timetable_slots ts ON ts.trainer_id = t.id AND ts.is_active = TRUE
           WHERE t.is_active = TRUE
           GROUP BY t.id, t.name, t.specialization
           ORDER BY utilization_pct DESC
           LIMIT 8`),

    // 3. Member Churn & Retention calculated with SQL Window Functions
    query(`WITH member_cohorts AS (
             SELECT 
               id,
               status,
               COUNT(*) OVER () AS total_pool,
               COUNT(CASE WHEN status = 'active' THEN 1 END) OVER () AS active_pool,
               COUNT(CASE WHEN status IN ('expired', 'cancelled') THEN 1 END) OVER () AS churned_pool
             FROM members
           )
           SELECT 
             COALESCE(MAX(total_pool), 0)::int AS total_members,
             COALESCE(MAX(active_pool), 0)::int AS active_members,
             COALESCE(MAX(churned_pool), 0)::int AS churned_members,
             CASE 
               WHEN COALESCE(MAX(total_pool), 0) > 0 
               THEN ROUND((MAX(active_pool)::numeric / MAX(total_pool)::numeric) * 100, 2)::float
               ELSE 0.0 
             END AS retention_rate_pct,
             CASE 
               WHEN COALESCE(MAX(total_pool), 0) > 0 
               THEN ROUND((MAX(churned_pool)::numeric / MAX(total_pool)::numeric) * 100, 2)::float
               ELSE 0.0 
             END AS churn_rate_pct
           FROM member_cohorts`),

    // Monthly Cohort Retention Trend with cumulative growth window function
    query(`WITH monthly_cohorts AS (
             SELECT 
               date_trunc('month', created_at) AS cohort_month,
               COUNT(*)::int AS new_members,
               COUNT(CASE WHEN status = 'active' THEN 1 END)::int AS retained_members
             FROM members
             GROUP BY date_trunc('month', created_at)
           )
           SELECT 
             to_char(cohort_month, 'Mon YYYY') AS month_label,
             new_members,
             retained_members,
             CASE 
               WHEN new_members > 0 THEN ROUND((retained_members::numeric / new_members::numeric) * 100, 2)::float
               ELSE 0.0 
             END AS retention_pct,
             SUM(new_members) OVER (ORDER BY cohort_month ASC)::int AS cumulative_growth
           FROM monthly_cohorts
           ORDER BY cohort_month ASC
           LIMIT 6`)
  ]);

  const statusMap = { active: 0, expired: 0, pending: 0, cancelled: 0 };
  membersByStatus.rows.forEach((r) => {
    statusMap[r.status] = r.c;
  });

  // Last 7 days orders mini-trend
  const trend = await query(`
    SELECT to_char(d.day, 'Mon DD') AS label,
           COALESCE(o.c, 0)::int AS value
    FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') AS d(day)
    LEFT JOIN (
      SELECT date_trunc('day', created_at) AS day, COUNT(*) AS c
      FROM orders GROUP BY 1
    ) o ON o.day = d.day
    ORDER BY d.day`);

  const churnData = churnRetentionQuery.rows[0] || {
    total_members: members.rows[0].c,
    active_members: statusMap.active,
    churned_members: statusMap.expired,
    retention_rate_pct: 0,
    churn_rate_pct: 0,
  };

  return ok(res, {
    totals: {
      members: members.rows[0].c,
      active_members: statusMap.active,
      expired_memberships: statusMap.expired,
      pending_memberships: statusMap.pending,
      total_orders: orders.rows[0].c,
      pending_orders: ordersPending.rows[0].c,
      monthly_revenue: revenue.rows[0].total,
      upcoming_appointments: upcoming.rows[0].c,
      low_stock_products: productsLow.rows[0].c,
    },
    analytics: {
      mrr: {
        current: mrrQuery.rows[0]?.mrr || 0,
        active_subscriptions: mrrQuery.rows[0]?.active_subscriptions || 0,
        trend_6_months: salesTrend6Months.rows,
      },
      capacity: {
        overall: overallUtilizationQuery.rows[0] || { total_capacity: 0, total_booked: 0, utilization_pct: 0 },
        by_trainer: trainerUtilizationQuery.rows,
      },
      retention_and_churn: {
        metrics: churnData,
        cohorts: cohortTrendQuery.rows,
      },
    },
    recent_members: recentMembers.rows,
    recent_orders: recentOrders.rows,
    order_trend: trend.rows,
  });
});

module.exports = { stats };
