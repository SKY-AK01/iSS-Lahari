export default function MentorLoading() {
  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div className="skeleton" style={{ height: '2.5rem', width: '50%', marginBottom: '0.5rem' }} />
      <div className="skeleton" style={{ height: '1rem', width: '20rem', marginBottom: '2.5rem' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '100px' }} />)}
      </div>
      <div className="skeleton" style={{ height: '2rem', width: '14rem', marginBottom: '1rem' }} />
      {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: '80px', marginBottom: '0.75rem' }} />)}
    </div>
  );
}
