import { useParams } from 'react-router-dom';

export function Progress() {
  const { adId } = useParams();
  return (
    <section data-testid="progress-page">
      <h1 className="t-display-sm">Generating</h1>
      <p className="t-para-md">{adId}</p>
    </section>
  );
}
