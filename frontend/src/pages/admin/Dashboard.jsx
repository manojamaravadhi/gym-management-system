import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, UserCheck, CalendarClock, ShoppingBag, Wallet,
  Clock, AlertTriangle, TrendingUp, Gauge, RefreshCw,
  PlayCircle, CheckCircle, Award, BarChart3,
} from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { dashboardService, jobsService } from '../../services/adminService';
import StatsCard from '../../components/cards/StatsCard';
import StatusBadge from '../../components/common/StatusBadge';
import Loader from '../../components/common/Loader';
import PageHeading from '../../components/admin/PageHeading';
import { rs, formatDate } from '../../utils/format';
import { toast } from '../../utils/toast';

export default function Dashboard() {
  const { data, loading, error, reload } = useFetch(() => dashboardService.stats(), []);
  const [triggeringJob, setTriggeringJob] = useState(false);

  const handleManualExpiryCheck = async () => {
    setTriggeringJob(true);
    try {
      const res = await jobsService.triggerExpiryCheck();
      toast.success(res.message || 'Expiry check worker executed successfully!');
      reload();
    } catch (err) {
      toast.error(err.message || 'Failed to trigger expiry check worker.');
    } finally {
      setTriggeringJob(false);
    }
  };

  if (loading) return <Loader label="Loading dashboard analytics…" />;
  if (error) return <p className="rounded-xl border border-rose-500/30 p-6 text-rose-300">{error}</p>;

  const t = data?.totals || {};
  const analytics = data?.analytics || {};
  const mrr = analytics.mrr || { current: 0, active_subscriptions: 0, trend_6_months: [] };
  const capacity = analytics.capacity || { overall: { utilization_pct: 0, total_capacity: 0, total_booked: 0 }, by_trainer: [] };
  const retention = analytics.retention_and_churn?.metrics || { retention_rate_pct: 0, churn_rate_pct: 0, active_members: 0, churned_members: 0 };

  const cards = [
    { icon: Users, label: 'Total Members', value: t.members ?? 0, tone: 'brand' },
    { icon: UserCheck, label: 'Active Members', value: t.active_members ?? 0, tone: 'emerald' },
    { icon: Clock, label: 'Pending Memberships', value: t.pending_memberships ?? 0, tone: 'amber' },
    { icon: AlertTriangle, label: 'Expired Memberships', value: t.expired_memberships ?? 0, tone: 'rose' },
    { icon: ShoppingBag, label: 'Total Orders', value: t.total_orders ?? 0, tone: 'sky' },
    { icon: Clock, label: 'Pending Orders', value: t.pending_orders ?? 0, tone: 'amber' },
    { icon: Wallet, label: 'Monthly Revenue', value: rs(t.monthly_revenue), tone: 'violet' },
    { icon: CalendarClock, label: 'Upcoming Appointments', value: t.upcoming_appointments ?? 0, tone: 'sky' },
  ];

  const trend = data?.order_trend || [];
  const maxTrend = Math.max(1, ...trend.map((d) => d.value));

  const maxRevenue6Mo = Math.max(1, ...(mrr.trend_6_months || []).map((m) => m.revenue));

  return (
    <div className="space-y-6">
      {/* Top Header with Manual Job Trigger */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeading
          title="Kurnool Fitness Operations & Analytics"
          subtitle="Real-time aggregation, windowed retention metrics, and transactional capacity tracking"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={reload}
            className="btn-outline flex items-center gap-1.5 px-3 py-2 text-xs"
            title="Refresh database aggregates"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={handleManualExpiryCheck}
            disabled={triggeringJob}
            className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-medium shadow-glow"
            title="Trigger scheduled cron job immediately"
          >
            {triggeringJob ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <PlayCircle className="h-3.5 w-3.5" />
            )}
            Run Expiry Check Job
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <StatsCard key={c.label} {...c} />
        ))}
      </div>

      {/* Advanced Engineering Analytics Row (MRR, Capacity, Churn/Retention) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 1. Monthly Recurring Revenue (MRR) & 6-Month Trend */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <h3 className="font-display text-base font-semibold uppercase tracking-wider text-white">
                  Monthly Recurring Revenue (MRR)
                </h3>
              </div>
              <p className="mt-1 text-2xl font-bold text-emerald-400">
                {rs(mrr.current)}
                <span className="ml-2 text-xs font-normal text-gray-400">
                  from {mrr.active_subscriptions} active subscriptions
                </span>
              </p>
            </div>
          </div>

          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
            6-Month Sales Trend
          </h4>
          <div className="flex h-32 items-end gap-2 border-b border-ink-700 pb-2">
            {(mrr.trend_6_months || []).map((m) => (
              <div key={m.month_label} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className="w-full rounded-t bg-emerald-500/80 transition-all hover:bg-emerald-400"
                  style={{
                    height: `${(m.revenue / maxRevenue6Mo) * 100}%`,
                    minHeight: m.revenue ? '6px' : '2px',
                  }}
                  title={`${m.month_label}: ${rs(m.revenue)} (${m.transaction_count} txns)`}
                />
                <span className="text-[10px] text-gray-400">{m.month_label.split(' ')[0]}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-right text-xs text-gray-500">
            Computed via PostgreSQL time-series series generator
          </p>
        </div>

        {/* 2. Slot Capacity & Utilization */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-sky-400" />
              <h3 className="font-display text-base font-semibold uppercase tracking-wider text-white">
                Slot Capacity Utilization
              </h3>
            </div>
            <span className="rounded bg-sky-500/20 px-2 py-0.5 text-xs font-semibold text-sky-300">
              {capacity.overall.utilization_pct}%
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-gray-400">Overall Facility Bookings</span>
                <span className="font-medium text-white">
                  {capacity.overall.total_booked} / {capacity.overall.total_capacity} seats
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-ink-800">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, capacity.overall.utilization_pct)}%` }}
                />
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Trainer Slot Utilization
              </p>
              <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
                {(capacity.by_trainer || []).slice(0, 4).map((tr) => (
                  <div key={tr.trainer_id} className="flex items-center justify-between text-xs">
                    <span className="truncate text-gray-300">{tr.trainer_name}</span>
                    <span className="font-mono text-gray-400">
                      {tr.total_booked}/{tr.total_capacity} ({tr.utilization_pct}%)
                    </span>
                  </div>
                ))}
                {(!capacity.by_trainer || capacity.by_trainer.length === 0) && (
                  <p className="text-xs text-gray-500">No active slots scheduled yet.</p>
                )}
              </div>
            </div>
          </div>
          <p className="mt-3 text-right text-xs text-gray-500">
            Protected with row-level locks (FOR UPDATE)
          </p>
        </div>

        {/* 3. Member Retention & Churn Rates (Window Functions) */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-violet-400" />
              <h3 className="font-display text-base font-semibold uppercase tracking-wider text-white">
                Retention & Churn Analysis
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-ink-700 bg-ink-850 p-3 text-center">
              <span className="text-xs uppercase text-gray-400">Retention Rate</span>
              <p className="mt-1 text-2xl font-bold text-violet-400">
                {retention.retention_rate_pct}%
              </p>
              <span className="text-[11px] text-gray-500">
                {retention.active_members} active members
              </span>
            </div>
            <div className="rounded-lg border border-ink-700 bg-ink-850 p-3 text-center">
              <span className="text-xs uppercase text-gray-400">Churn Rate</span>
              <p className="mt-1 text-2xl font-bold text-rose-400">
                {retention.churn_rate_pct}%
              </p>
              <span className="text-[11px] text-gray-500">
                {retention.churned_members} churned/expired
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-ink-850/60 p-3 text-xs text-gray-400">
            <div className="flex items-center justify-between">
              <span>SQL Windowing Method:</span>
              <span className="font-mono text-violet-300">COUNT(*) OVER ()</span>
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              Evaluates member longevity against rolling expiration thresholds in a single query pass.
            </p>
          </div>
        </div>
      </div>

      {/* Operational Trends & Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Order trend */}
        <div className="card p-5 lg:col-span-1">
          <h3 className="mb-1 font-display text-base font-semibold uppercase tracking-wider text-white">
            Daily Store Orders (7-day)
          </h3>
          <p className="mb-4 text-xs text-gray-500">
            {t.low_stock_products ?? 0} products currently low on inventory
          </p>
          <div className="flex h-40 items-end gap-2">
            {trend.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t bg-brand/70 transition-all hover:bg-brand"
                  style={{
                    height: `${(d.value / maxTrend) * 100}%`,
                    minHeight: d.value ? '6px' : '2px',
                  }}
                  title={`${d.value} orders`}
                />
                <span className="text-[10px] text-gray-400">{d.label.split(' ')[1]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent members */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold uppercase tracking-wider text-white">
              Recent Members
            </h3>
            <Link to="/admin/members" className="text-xs text-brand hover:underline">
              View all
            </Link>
          </div>
          <ul className="space-y-3">
            {(data?.recent_members || []).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{m.full_name}</p>
                  <p className="truncate text-xs text-gray-500">
                    {m.member_code} · {formatDate(m.created_at)}
                  </p>
                </div>
                <StatusBadge status={m.status} />
              </li>
            ))}
            {(!data?.recent_members || data.recent_members.length === 0) && (
              <li className="text-sm text-gray-500">No members yet.</li>
            )}
          </ul>
        </div>

        {/* Recent orders */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold uppercase tracking-wider text-white">
              Recent Store Orders
            </h3>
            <Link to="/admin/orders" className="text-xs text-brand hover:underline">
              View all
            </Link>
          </div>
          <ul className="space-y-3">
            {(data?.recent_orders || []).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{o.customer_name}</p>
                  <p className="truncate text-xs text-gray-500">
                    {o.order_code} · {rs(o.total_amount)}
                  </p>
                </div>
                <StatusBadge status={o.status} />
              </li>
            ))}
            {(!data?.recent_orders || data.recent_orders.length === 0) && (
              <li className="text-sm text-gray-500">No orders yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
