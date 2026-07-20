import { NextRequest, NextResponse } from 'next/server';
import { readLimiter, getClientIp } from '@/lib/rate-limit';
import { getBreweryInfo, isUntappdAvailable, localizeCountry } from '@/lib/untappd';

/**
 * GET /api/breweries/untappd/[id]
 *
 * Fetches detailed info for an Untappd brewery by its numeric ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = readLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
    }

    const { id: rawId } = await params;
    const breweryId = parseInt(rawId, 10);

    if (!breweryId || breweryId < 1) {
      return NextResponse.json({ error: 'Некорректный ID пивоварни' }, { status: 400 });
    }

    if (!(await isUntappdAvailable())) {
      return NextResponse.json({ error: 'Untappd API не настроен' }, { status: 503 });
    }

    const brewery = await getBreweryInfo(breweryId);

    if (!brewery) {
      return NextResponse.json({ error: 'Пивоварня не найдена в Untappd' }, { status: 404 });
    }

    return NextResponse.json({
      id: brewery.brewery_id,
      name: brewery.brewery_name,
      label: brewery.brewery_label,
      slug: brewery.brewery_slug,
      country: localizeCountry(brewery.country_name),
      rawCountry: brewery.country_name,
      city: brewery.location?.brewery_city || '',
      state: brewery.location?.brewery_state || '',
      lat: brewery.location?.lat || 0,
      lng: brewery.location?.lng || 0,
      website: brewery.contact?.url || '',
      twitter: brewery.contact?.twitter || '',
      facebook: brewery.contact?.facebook || '',
      instagram: brewery.contact?.instagram || '',
      type: brewery.brewery_type || '',
      rating: brewery.rating_score || 0,
      beerCount: brewery.beer_count || 0,
    });
  } catch (error) {
    console.error('Untappd brewery info error:', error);
    return NextResponse.json({ error: 'Ошибка загрузки данных из Untappd' }, { status: 500 });
  }
}