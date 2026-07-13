export default function ExamLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Timer bar */}
      <div className="skeleton" style={{ height: '52px', borderRadius: 0 }} />
      <div className="container" style={{ paddingTop: '1.5rem', maxWidth: '760px' }}>
        <div className="skeleton" style={{ height: '1rem', width: '6rem', marginBottom: '1.75rem' }} />
        <div className="skeleton" style={{ height: '220px', marginBottom: '1.5rem' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: '64px' }} />)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div className="skeleton" style={{ height: '48px', width: '80px' }} />
          <div className="skeleton" style={{ height: '48px', width: '80px' }} />
        </div>
      </div>
    </div>
  );
}
