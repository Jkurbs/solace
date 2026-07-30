import { redirect } from 'next/navigation';

/** Observatory deep-link for Oracle; the living product surface is /oracle. */
export default function ObservatoryOraclePage() {
  redirect('/oracle');
}
