import { OG_SIZE, renderPlateImage } from '@/lib/og-plate';

export const alt = 'Solace — Independent Research Company';
export const size = OG_SIZE;
export const contentType = 'image/png';

// Site-wide fallback card: every page without its own OG image shares links
// with the observatory's signature plate.
export default function OgImage() {
  return renderPlateImage('solace-observatory', 'cream');
}
