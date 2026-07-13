export default function ChapterLoading() {
  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div className="skeleton" style={{ height: '2rem', width: '8rem', marginBottom: '1.25rem' }} />
      <div className="skeleton" style={{ height: '2.5rem', width: '50%', marginBottom: '1.75rem' }} />
      {/* Materials skeleton */}
      <div className="skeleton" style={{ height: '1rem', width: '7rem', marginBottom: '0.75rem' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '2.5rem' }}>
        {[...Array(2)].map((_, i) => <div key={i} className="skeleton" style={{ height: '52px' }} />)}
      </div>
      {/* Batches skeleton */}
      <div className="skeleton" style={{ height: '1rem', width: '7rem', marginBottom: '0.75rem' }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ flexBasis: '200px', flexGrow: 1, height: '110px' }} />)}
      </div>
    </div>
  );
}
