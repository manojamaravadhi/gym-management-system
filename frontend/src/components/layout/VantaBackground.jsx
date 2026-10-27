/**
 * Lightweight layout container component.
 */
export default function VantaBackground({ className = '', children }) {
  return (
    <div className={`relative ${className}`}>
      {children}
    </div>
  );
}
