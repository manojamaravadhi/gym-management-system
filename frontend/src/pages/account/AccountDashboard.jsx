import { useMemo, useRef, useState } from 'react';
import { CalendarClock, CreditCard, Images, Star, Upload, Trash2, ShoppingBag, BadgeCheck, Clock, UserCheck, Download, AlertOctagon } from 'lucide-react';
import PageHeader from '../public/PageHeader';
import Loader from '../../components/common/Loader';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import { accountService } from '../../services/accountService';
import { planService } from '../../services/planService';
import { toast } from '../../utils/toast';
import { rs, formatDate, daysBetween } from '../../utils/format';

const TABS = [
  { key: 'overview', label: 'Overview', icon: CalendarClock },
  { key: 'orders', label: 'My Orders', icon: ShoppingBag },
  { key: 'photos', label: 'My Photos', icon: Images },
  { key: 'review', label: 'Leave a Review', icon: Star },
];

function downloadInvoice({ title, invoiceCode, customerName, memberCode, date, amount, items, status }) {
  const content = `
=====================================================
              KURNOOL FITNESS CENTRE
          Official Tax Invoice & Receipt
=====================================================

Invoice Number:   ${invoiceCode || 'INV-' + Math.floor(100000 + Math.random() * 900000)}
Issue Date:       ${formatDate(date || new Date())}
Status:           ${(status || 'PAID').toUpperCase()}

CUSTOMER DETAILS
-----------------------------------------------------
Name:             ${customerName || 'Kurnool Fitness Member'}
Member ID:        ${memberCode || 'KFC-MEMBER'}

ITEMIZED BREAKDOWN
-----------------------------------------------------
Description:      ${title || 'Gym Membership / Store Purchase'}
${items ? items.map((i) => ` - ${i.name || i.product_name} x ${i.quantity}: ${rs((i.price || i.unit_price || 0) * (i.quantity || 1))}`).join('\n') : ''}

TOTAL PAID:       ${rs(amount)}
PAYMENT STATUS:   CONFIRMED & RECONCILED
-----------------------------------------------------
Thank you for training with Kurnool Fitness Centre!
Near Bellary Road, Kurnool, Andhra Pradesh - 518004
contact@kurnoolfitness.com · +91 83280 75915
=====================================================
`.trim();

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${invoiceCode || 'KFC-Invoice'}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success('Invoice downloaded successfully!');
}

export default function AccountDashboard() {
  const { user } = useAuth();
  const { data, loading, refetch } = useFetch(() => accountService.summary(), []);
  const [tab, setTab] = useState('overview');
  const [profileOpen, setProfileOpen] = useState(false);

  if (loading) return <><PageHeader title="My Account" subtitle="Loading your dashboard…" /><Loader className="min-h-[40vh]" /></>;

  const s = data || {};
  const current = s.current_membership;

  return (
    <div>
      <PageHeader
        title={`Welcome, ${s.member?.full_name || user?.name || 'Member'}`}
        subtitle={s.member?.member_code ? `Member ID: ${s.member.member_code}` : 'Your member dashboard'}
      />
      <section className="container-x py-12">
        {/* Profile Action Header Strip */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-ink-800 bg-ink-900/60 p-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/15 text-sky-400">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{s.member?.full_name || user?.name}</p>
              <p className="text-xs text-gray-400">{s.member?.email || user?.email} · {s.member?.phone || 'No phone set'}</p>
            </div>
          </div>
          <button
            onClick={() => setProfileOpen(true)}
            className="btn-outline text-xs px-4 py-2 hover:border-brand hover:text-white"
          >
            Update Profile
          </button>
        </div>

        {/* Current plan banner */}
        <CurrentPlan current={current} onSubscribed={refetch} onCancelled={refetch} member={s.member} />

        {/* Tabs */}
        <div className="mt-10 flex flex-wrap gap-2 border-b border-ink-800">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${tab === t.key ? 'border-b-2 border-brand text-brand' : 'text-gray-400 hover:text-white'}`}>
              <t.icon className="h-4 w-4" />{t.label}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {tab === 'overview' && <Overview s={s} />}
          {tab === 'orders' && <Orders orders={s.orders} member={s.member} />}
          {tab === 'photos' && <Photos photos={s.photos} onChange={refetch} />}
          {tab === 'review' && <ReviewForm reviews={s.reviews} onSubmitted={refetch} />}
        </div>

        {profileOpen && (
          <UpdateProfileModal
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
            member={s.member}
            onSaved={refetch}
          />
        )}
      </section>
    </div>
  );
}

/* ---------------- Current plan / subscribe / cancel ---------------- */
function CurrentPlan({ current, onSubscribed, onCancelled, member }) {
  const { data: plans } = useFetch(() => planService.list(), []);
  const [busy, setBusy] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const subscribe = async (plan_id) => {
    setBusy(plan_id);
    try {
      await accountService.subscribe({ plan_id });
      toast.success('Plan requested! Awaiting payment confirmation.');
      onSubscribed();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await accountService.cancelSubscription({ membership_id: current.id });
      toast.success('Subscription cancelled');
      setCancelOpen(false);
      onCancelled();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  if (current) {
    const total = daysBetween(current.start_date, current.end_date);
    const left = Math.max(0, daysBetween(new Date(), current.end_date));
    const pct = Math.min(100, Math.max(0, Math.round(((total - left) / (total || 1)) * 100)));
    const canCancel = current.status === 'active' || current.status === 'pending';

    return (
      <div className="card overflow-hidden">
        <div className="grid gap-6 p-6 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/15 text-brand"><BadgeCheck className="h-6 w-6" /></span>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Current Plan</p>
                <h3 className="font-display text-xl font-semibold text-white">{current.plan_name}</h3>
              </div>
              <span className="ml-auto"><StatusBadge status={current.status} /></span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Info label="Price" value={rs(current.price)} />
              <Info label="Start Date" value={formatDate(current.start_date)} />
              <Info label="End Date" value={formatDate(current.end_date)} />
            </div>
            {current.status === 'pending' && (
              <p className="mt-4 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300"><Clock className="h-4 w-4" />Awaiting payment confirmation from our team to activate this plan.</p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() =>
                  downloadInvoice({
                    title: `Membership - ${current.plan_name}`,
                    invoiceCode: `INV-MEM-${current.id}`,
                    customerName: member?.full_name,
                    memberCode: member?.member_code,
                    date: current.start_date,
                    amount: current.price,
                    status: current.status,
                  })
                }
                className="btn-outline flex items-center gap-2 text-xs py-2 px-3"
              >
                <Download className="h-3.5 w-3.5" /> Download Invoice
              </button>

              {canCancel && (
                <button
                  onClick={() => setCancelOpen(true)}
                  className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition"
                >
                  Cancel Subscription
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col justify-center rounded-xl border border-ink-800 bg-ink-950/50 p-5 text-center">
            <p className="font-heading text-4xl text-white">{left}</p>
            <p className="text-xs text-gray-400">days remaining</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-800">
              <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        <ConfirmDialog
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
          onConfirm={handleCancel}
          title="Cancel Subscription"
          message="Are you sure you want to cancel your current membership subscription? You will still retain access until the end of the term."
          confirmLabel="Yes, Cancel"
          loading={cancelling}
        />
      </div>
    );
  }

  // No plan yet — let the member pick one
  return (
    <div className="card p-6">
      <h3 className="font-display text-lg font-semibold text-white">You don't have an active plan yet</h3>
      <p className="mt-1 text-sm text-gray-400">Choose a membership below — our team confirms your payment to activate it.</p>
      {!plans ? <Loader /> : !plans.items.length ? (
        <p className="mt-6 text-sm text-gray-500">No plans available right now. Please check back soon.</p>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.items.map((p) => (
            <div key={p.id} className="relative">
              <PlanCardSubscribe plan={p} busy={busy === p.id} onSubscribe={() => subscribe(p.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlanCardSubscribe({ plan, busy, onSubscribe }) {
  const features = Array.isArray(plan.features) ? plan.features : [];
  return (
    <div className={`flex h-full flex-col rounded-xl border p-6 transition ${plan.is_featured ? 'border-brand bg-gradient-to-b from-brand/15 to-ink-900' : 'border-ink-700 bg-ink-900 hover:border-ink-600'}`}>
      <h3 className="font-display text-lg font-semibold uppercase text-white">{plan.name}</h3>
      <p className="mt-2 font-heading text-3xl text-white">{rs(plan.price)}</p>
      <p className="text-xs text-gray-500">{plan.duration_months} month{plan.duration_months > 1 ? 's' : ''}</p>
      <ul className="mt-4 flex-1 space-y-2 text-sm text-gray-300">
        {features.slice(0, 4).map((f, i) => <li key={i}>• {f}</li>)}
      </ul>
      <button onClick={onSubscribe} disabled={busy} className="btn-primary mt-5 w-full">{busy ? 'Requesting…' : 'Choose Plan'}</button>
    </div>
  );
}

function Info({ label, value }) {
  return <div><p className="text-xs uppercase tracking-wide text-gray-500">{label}</p><p className="mt-0.5 font-medium text-gray-100">{value}</p></div>;
}

/* ---------------- Overview: history + payments ---------------- */
function Overview({ s }) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="card p-5">
        <h4 className="mb-4 flex items-center gap-2 font-display font-semibold text-white"><CalendarClock className="h-4 w-4 text-brand" />Membership History</h4>
        {s.memberships?.length ? (
          <div className="space-y-3">
            {s.memberships.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-ink-800 p-3">
                <div><p className="text-sm font-medium text-white">{m.plan_name}</p><p className="text-xs text-gray-500">{formatDate(m.start_date)} → {formatDate(m.end_date)}</p></div>
                <StatusBadge status={m.status} />
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-500">No memberships yet.</p>}
      </div>
      <div className="card p-5">
        <h4 className="mb-4 flex items-center gap-2 font-display font-semibold text-white"><CreditCard className="h-4 w-4 text-brand" />Payments & Invoices</h4>
        {s.payments?.length ? (
          <div className="space-y-3">
            {s.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-ink-800 p-3">
                <div>
                  <p className="text-sm font-medium text-white">{rs(p.amount)}</p>
                  <p className="text-xs text-gray-500">{p.method} · {formatDate(p.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={p.status} />
                  <button
                    onClick={() =>
                      downloadInvoice({
                        title: `Kurnool Fitness Payment #${p.id}`,
                        invoiceCode: p.reference || `PAY-${p.id}`,
                        customerName: s.member?.full_name,
                        memberCode: s.member?.member_code,
                        date: p.created_at,
                        amount: p.amount,
                        status: p.status,
                      })
                    }
                    title="Download Receipt"
                    className="rounded p-1.5 text-gray-400 hover:bg-ink-800 hover:text-white transition"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-500">No payments yet.</p>}
      </div>
    </div>
  );
}

/* ---------------- Orders ---------------- */
function Orders({ orders, member }) {
  if (!orders?.length) {
    return <EmptyState title="No orders placed yet" subtitle="Explore our pro shop for fitness gear and supplements." />;
  }
  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <div key={o.id} className="card flex items-center justify-between p-4">
          <div>
            <p className="font-medium text-white">{o.order_code}</p>
            <p className="text-xs text-gray-500">{formatDate(o.created_at)}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-display text-brand font-semibold">{rs(o.total_amount)}</p>
              <StatusBadge status={o.status} />
            </div>
            <button
              onClick={() =>
                downloadInvoice({
                  title: `Order ${o.order_code}`,
                  invoiceCode: o.order_code,
                  customerName: o.customer_name || member?.full_name,
                  memberCode: member?.member_code,
                  date: o.created_at,
                  amount: o.total_amount,
                  status: o.status,
                })
              }
              title="Download Order Receipt"
              className="rounded-lg border border-ink-800 bg-ink-850 p-2 text-gray-300 hover:border-brand hover:text-white transition"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Photos: upload + list ---------------- */
function Photos({ photos, onChange }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    if (!file) { toast.error('Choose an image first'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      if (title) fd.append('title', title);
      await accountService.uploadPhoto(fd);
      toast.success('Photo uploaded! It appears in the gallery once approved.');
      setFile(null); setTitle(''); if (fileRef.current) fileRef.current.value = '';
      onChange();
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  const del = async (id) => {
    try { await accountService.deletePhoto(id); toast.success('Photo removed'); onChange(); }
    catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <div className="card p-5">
        <h4 className="mb-4 flex items-center gap-2 font-display font-semibold text-white"><Upload className="h-4 w-4 text-brand" />Upload a Gym Photo</h4>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Caption (optional)" className="input" />
          <input ref={fileRef} type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-800 file:px-4 file:py-2.5 file:text-sm file:text-gray-200 hover:file:bg-ink-700" />
        </div>
        <button onClick={upload} disabled={busy} className="btn-primary mt-4"><Upload className="h-4 w-4" />{busy ? 'Uploading…' : 'Upload Photo'}</button>
        <p className="mt-2 text-xs text-gray-500">Photos are reviewed by our team before appearing in the public gallery.</p>
      </div>

      <div className="mt-6">
        {photos?.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((p) => (
              <div key={p.id} className="group relative overflow-hidden rounded-xl border border-ink-700">
                <img
                  src={p.image_url}
                  alt={p.title || 'Photo'}
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/fallback-gym.jpg'; }}
                  className="aspect-square w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-ink-950/80 px-2 py-1.5">
                  <StatusBadge status={p.is_active ? 'approved' : 'pending'} />
                  {!p.is_active && <button onClick={() => del(p.id)} className="rounded p-1 text-gray-400 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button>}
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-500">No photos uploaded yet.</p>}
      </div>
    </div>
  );
}

/* ---------------- Review form ---------------- */
function ReviewForm({ reviews, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!message.trim()) { toast.error('Write a short message'); return; }
    setBusy(true);
    try {
      await accountService.submitReview({ rating, message });
      toast.success('Thanks! Your review will appear after approval.');
      setMessage('');
      setRating(5);
      onSubmitted();
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="card p-5">
        <h4 className="mb-4 font-display font-semibold text-white">Share Your Experience</h4>
        <label className="label">Rating</label>
        <div className="mb-4 flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <button key={i} onClick={() => setRating(i + 1)}>
              <Star className={`h-7 w-7 transition ${i < rating ? 'fill-brand text-brand' : 'text-ink-600 hover:text-ink-500'}`} />
            </button>
          ))}
        </div>
        <label className="label">Your Review</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="input min-h-[120px]" placeholder="Tell us about your journey at Kurnool Fitness Centre…" />
        <button onClick={submit} disabled={busy} className="btn-primary mt-4">{busy ? 'Submitting…' : 'Submit Review'}</button>
      </div>
      <div>
        <h4 className="mb-4 font-display font-semibold text-white">Your Reviews</h4>
        {reviews?.length ? (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < r.rating ? 'fill-brand text-brand' : 'text-ink-600'}`} />)}</div>
                  <StatusBadge status={r.is_approved ? 'approved' : 'pending'} />
                </div>
                <p className="text-sm text-gray-300">"{r.message}"</p>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-500">You haven't written a review yet.</p>}
      </div>
    </div>
  );
}

/* ---------------- Update Profile Modal ---------------- */
function UpdateProfileModal({ open, onClose, member, onSaved }) {
  const [form, setForm] = useState({
    full_name: member?.full_name || '',
    phone: member?.phone || '',
    emergency_contact: member?.emergency_contact || '',
    address: member?.address || '',
    gender: member?.gender || '',
    date_of_birth: member?.date_of_birth ? String(member.date_of_birth).slice(0, 10) : '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await accountService.updateProfile(form);
      toast.success('Profile updated successfully!');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Update Member Profile">
      <div className="space-y-4">
        <div>
          <label className="label">Full Name</label>
          <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Emergency Contact</label>
            <input className="input" value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Gender</label>
            <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Date of Birth</label>
            <input type="date" className="input" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Address</label>
          <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </div>
    </Modal>
  );
}
