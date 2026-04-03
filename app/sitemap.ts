import type { MetadataRoute } from 'next';
import { getAllDigestDates } from '@/lib/supabase/queries';

const BASE_URL = 'https://digest.fieldnotes-ai.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dates = await getAllDigestDates();

  const digestEntries: MetadataRoute.Sitemap = dates.map((date) => ({
    url: `${BASE_URL}/${date}`,
    lastModified: new Date(date),
    changeFrequency: 'never',
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
    },
    ...digestEntries,
  ];
}
