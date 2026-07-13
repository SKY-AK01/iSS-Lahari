export default function PYQLoading() {
  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div className="skeleton" style={{ height: '2rem', width: '6rem', marginBottom: '1rem' }} />
      <div className="skeleton" style={{ height: '3rem', width: '45%', marginBottom: '0.5rem' }} />
      <div className="skeleton" style={{ height: '1rem', width: '25rem', marginBottom: '1.5rem' }} />
      <div className="skeleton" style={{ height: '2.5rem', marginBottom: '1.5rem' }} />
      {[2024, 2023, 2022].map(y => (
        <div key={y} style={{ marginBottom: '1.5rem' }}>
          <div className="skeleton" style={{ height: '1rem', width: '3rem', marginBottom: '0.6rem' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem' }}>
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: '130px' }} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
