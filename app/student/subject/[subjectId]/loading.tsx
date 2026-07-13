export default function SubjectLoading() {
  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div className="skeleton" style={{ height: '2rem', width: '8rem', marginBottom: '1.25rem' }} />
      <div className="skeleton" style={{ height: '2.5rem', width: '55%', marginBottom: '0.5rem' }} />
      <div className="skeleton" style={{ height: '1rem', width: '6rem', marginBottom: '1.5rem' }} />
      <div className="skeleton" style={{ height: '2.5rem', width: '10rem', marginBottom: '1rem' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '60px' }} />)}
      </div>
    </div>
  );
}
