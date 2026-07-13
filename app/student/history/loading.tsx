export default function HistoryLoading() {
  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div className="skeleton" style={{ height: '2.5rem', width: '8rem', marginBottom: '0.5rem' }} />
      <div className="skeleton" style={{ height: '1rem', width: '12rem', marginBottom: '1.5rem' }} />
      <div className="skeleton" style={{ height: '2.5rem', marginBottom: '1.25rem' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {[...Array(3)].map((_, i) => (
          <div key={i}>
            <div className="skeleton" style={{ height: '1rem', width: '10rem', marginBottom: '0.75rem' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[...Array(3)].map((__, j) => <div key={j} className="skeleton" style={{ height: '52px' }} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
