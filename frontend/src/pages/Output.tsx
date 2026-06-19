import { useParams } from 'react-router-dom';

export function Output() {
  const { adId } = useParams();
  return (
    <section data-testid="output-page">
      <h1 className="t-display-sm">Your ad</h1>
      <p className="t-para-md">{adId}</p>
    </section>
  );
}
