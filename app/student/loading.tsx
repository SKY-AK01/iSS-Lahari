export default function StudentLoading() {
  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div className="skeleton" style={{ height: '3rem', width: '60%', marginBottom: '2rem' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: '80px' }} />)}
      </div>
      <div className="skeleton" style={{ height: '70px', marginBottom: '1rem' }} />
      <div className="skeleton" style={{ height: '70px', marginBottom: '2rem' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
        {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: '110px' }} />)}
      </div>
    </div>
  );
}
