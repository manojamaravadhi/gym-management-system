/**
 * Modern, clean SaaS Background component.
 * Replaces heavy, distracting WebGL/Vanta canvas with a lightweight,
 * highly performant slate theme and subtle ambient gradients.
 */
export default function SiteBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0b0f19]">
      {/* Soft emerald radial glow */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 40% at 50% -10%, rgba(16, 185, 129, 0.12), transparent 70%)',
        }}
      />
      {/* Subtle micro dot-grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: 'radial-gradient(rgba(52, 211, 153, 0.3) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* Subtle ambient bottom glow */}
      <div
        className="absolute bottom-0 left-0 right-0 h-96"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 120%, rgba(16, 185, 129, 0.06), transparent 70%)',
        }}
      />
    </div>
  );
}
