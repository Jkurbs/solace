import { redirect } from 'next/navigation';

// The Vision page was absorbed into the Technical Brief.
export default function VisionRedirect() {
  redirect('/brief');
}
