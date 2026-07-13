export default function TestModeLoading() {
  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: '800px' }}>
      <div className="skeleton" style={{ height: '2rem', width: '6rem', marginBottom: '1.25rem' }} />
      <div className="skeleton" style={{ height: '130px', marginBottom: '1.5rem' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div className="skeleton" style={{ height: '140px' }} />
        <div className="skeleton" style={{ height: '140px' }} />
      </div>
    </div>
  );
}
