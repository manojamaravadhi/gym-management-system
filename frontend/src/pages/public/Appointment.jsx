import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Calendar, Clock, User, ShieldCheck } from 'lucide-react';
import PageHeader from './PageHeader';
import { useFetch } from '../../hooks/useFetch';
import { trainerService, serviceService } from '../../services/trainerService';
import { appointmentService } from '../../services/appointmentService';
import { toast } from '../../utils/toast';

const today = new Date().toISOString().slice(0, 10);

export default function Appointment() {
  const [searchParams] = useSearchParams();
  const queryTrainerId = searchParams.get('trainerId') || searchParams.get('trainer') || '';

  const { data: trainers } = useFetch(() => trainerService.list({ is_active: true }), []);
  const { data: services } = useFetch(() => serviceService.list({ is_active: true }), []);
  const { data: slots, reload: reloadSlots } = useFetch(() => appointmentService.listSlots(), []);

  const [form, setForm] = useState({
    slot_id: '',
    customer_name: '',
    email: '',
    phone: '',
    service_id: '',
    trainer_id: queryTrainerId,
    appointment_date: '',
    appointment_time: '',
    notes: '',
  });

  useEffect(() => {
    if (queryTrainerId && form.trainer_id !== queryTrainerId) {
      setForm((prev) => ({ ...prev, trainer_id: queryTrainerId }));
    }
  }, [queryTrainerId]);

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k) => (e) => {
    // If manually selecting date/time, clear slot_id unless picked from list
    if (k === 'appointment_date' || k === 'appointment_time') {
      setForm({ ...form, [k]: e.target.value, slot_id: '' });
    } else {
      setForm({ ...form, [k]: e.target.value });
    }
  };

  const handleSelectSlot = (slot) => {
    setForm({
      ...form,
      slot_id: slot.id,
      trainer_id: slot.trainer_id || '',
      service_id: slot.service_id || '',
      appointment_date: String(slot.slot_date).slice(0, 10),
      appointment_time: String(slot.start_time).slice(0, 5),
    });
    toast.success(`Selected slot with ${slot.trainer_name || 'trainer'} (${slot.available_seats} seats remaining)`);
  };

  const validate = () => {
    const e = {};
    if (!form.customer_name.trim()) e.customer_name = 'Name is required';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Valid email required';
    if (!form.appointment_date) e.appointment_date = 'Pick a date or select a slot';
    else if (form.appointment_date < today) e.appointment_date = 'Date cannot be in the past';
    if (!form.appointment_time) e.appointment_time = 'Pick a time';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await appointmentService.book({
        ...form,
        slot_id: form.slot_id ? Number(form.slot_id) : undefined,
        trainer_id: form.trainer_id ? Number(form.trainer_id) : undefined,
        service_id: form.service_id ? Number(form.service_id) : undefined,
      });
      setDone(true);
      toast.success('Appointment booked with atomic slot lock!');
      reloadSlots();
    } catch (err) {
      toast.error(err.message || 'Booking conflict or slot full.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="container-x py-24 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-400" />
        <h1 className="mt-4 font-heading text-3xl uppercase text-white">Booking Confirmed & Locked</h1>
        <p className="mt-2 text-gray-400">
          Your seat has been atomically reserved in the database transaction. We will see you on your scheduled session!
        </p>
        <button
          onClick={() => {
            setDone(false);
            setForm({
              slot_id: '',
              customer_name: '',
              email: '',
              phone: '',
              service_id: '',
              trainer_id: '',
              appointment_date: '',
              appointment_time: '',
              notes: '',
            });
          }}
          className="btn-outline mt-6"
        >
          Book Another Session
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Reserve a Training Session"
        subtitle="Concurrency-controlled slot booking with real-time capacity and atomic seat locks"
      />

      <section className="container-x max-w-3xl py-12">
        {/* Available Live Timetable Slots Showcase */}
        {slots && slots.length > 0 && (
          <div className="mb-8 rounded-xl border border-sky-500/30 bg-ink-900/90 p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-sky-400" />
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
                  Available Timetable Slots (Row-Locked & Atomic)
                </h3>
              </div>
              <span className="text-xs text-sky-400">Click to Select</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
              {slots.map((s) => {
                const isSelected = String(form.slot_id) === String(s.id);
                const isFull = s.available_seats <= 0;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={isFull}
                    onClick={() => handleSelectSlot(s)}
                    className={`rounded-lg border p-3 text-left transition ${
                      isSelected
                        ? 'border-sky-500 bg-sky-950/40 ring-2 ring-sky-500/30'
                        : isFull
                        ? 'cursor-not-allowed border-ink-800 bg-ink-950/50 opacity-40'
                        : 'border-ink-700 bg-ink-850 hover:border-sky-500/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate text-xs font-semibold text-white">
                        {s.trainer_name || 'Any Coach'}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          isFull ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {isFull ? 'FULL' : `${s.available_seats} seats left`}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
                      <span>{String(s.slot_date).slice(0, 10)}</span>
                      <span>•</span>
                      <span>{String(s.start_time).slice(0, 5)}</span>
                    </div>
                    {s.service_title && (
                      <span className="mt-1 block truncate text-[10px] text-gray-500">
                        {s.service_title}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="card space-y-4 p-6 shadow-card">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Full Name</label>
              <input
                value={form.customer_name}
                onChange={set('customer_name')}
                placeholder="e.g. Alex Morgan"
                className="input"
              />
              {errors.customer_name && (
                <p className="mt-1 text-xs text-rose-400">{errors.customer_name}</p>
              )}
            </div>
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="alex@example.com"
                className="input"
              />
              {errors.email && <p className="mt-1 text-xs text-rose-400">{errors.email}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Phone Number</label>
              <input
                value={form.phone}
                onChange={set('phone')}
                placeholder="+1 (555) 000-0000"
                className="input"
              />
            </div>
            <div>
              <label className="label">Service / Training Type</label>
              <select value={form.service_id} onChange={set('service_id')} className="input">
                <option value="">Select Service (or any)</option>
                {services?.items?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Assigned Trainer</label>
              <select value={form.trainer_id} onChange={set('trainer_id')} className="input">
                <option value="">Any available trainer</option>
                {trainers?.items?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                min={today}
                value={form.appointment_date}
                onChange={set('appointment_date')}
                className="input"
              />
              {errors.appointment_date && (
                <p className="mt-1 text-xs text-rose-400">{errors.appointment_date}</p>
              )}
            </div>
            <div>
              <label className="label">Time</label>
              <input
                type="time"
                value={form.appointment_time}
                onChange={set('appointment_time')}
                className="input"
              />
              {errors.appointment_time && (
                <p className="mt-1 text-xs text-rose-400">{errors.appointment_time}</p>
              )}
            </div>
          </div>

          <div>
            <label className="label">Session Notes / Medical Inquiries (optional)</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={3}
              placeholder="Any specific goals, injury rehabilitation, or requirements..."
              className="input"
            />
          </div>

          <button
            onClick={submit}
            disabled={submitting}
            className="btn-primary w-full py-3 shadow-glow"
          >
            {submitting ? 'Acquiring Lock & Reserving…' : 'Confirm & Reserve Slot'}
          </button>
        </div>
      </section>
    </div>
  );
}
