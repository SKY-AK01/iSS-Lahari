export default function PracticeLoading() {
  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '4rem', maxWidth: '760px' }}>
      {/* Top bar skeleton */}
      <div className="skeleton" style={{ height: '52px', marginBottom: '1.5rem' }} />
      {/* Question number */}
      <div className="skeleton" style={{ height: '1rem', width: '6rem', marginBottom: '1.75rem' }} />
      {/* Question card */}
      <div className="skeleton" style={{ height: '220px', marginBottom: '1.5rem' }} />
      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: '64px' }} />)}
      </div>
      {/* Nav buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div className="skeleton" style={{ height: '48px', width: '80px' }} />
        <div className="skeleton" style={{ height: '48px', width: '80px' }} />
      </div>
    </div>
  );
}
