import { redirect } from 'next/navigation';

/** Observatory deep-link for Glorya; the living product surface is /glorya. */
export default function ObservatoryGloryaPage() {
  redirect('/glorya');
}
