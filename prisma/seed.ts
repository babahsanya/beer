/**
 * Seed script: loads real beer data from PunkAPI into the local database.
 * Run: bun prisma db seed
 * 
 * This replaces the old hardcoded seed with real data from:
 * - PunkAPI (325 real BrewDog beers with ABV, IBU, descriptions, images)
 * 
 * Falls back to hardcoded data if PunkAPI is unreachable.
 */

import { PrismaClient } from '@prisma/client';
import { fetchAllPunkBeers, punkToDbBeer } from './src/lib/punkapi';

const prisma = new PrismaClient();

// Hardcoded fallback beers (used when PunkAPI is unreachable)
const FALLBACK_BEERS = [
  { name: "Guinness Draught", style: "Stout", abv: 4.2, ibu: 45, country: "🇮🇪 Ирландия", brewery: "Guinness", description: "Классический ирландский сухой стаут с бархатистой текстурой и кофейно-шоколадным вкусом. Один из самых узнаваемых сортов пива в мире.", rating: 4.1, ratingCount: 284500 },
  { name: "Pliny the Elder", style: "Double IPA", abv: 8.0, ibu: 100, country: "🇺🇸 США", brewery: "Russian River Brewing", description: "Легендарный Imperial IPA с мощным хмельным профилем. Сочетание цитрусовых, сосновых и цветочных нот.", rating: 4.5, ratingCount: 18500 },
  { name: "Weihenstephaner Hefeweissbier", style: "Wheat Beer", abv: 5.4, ibu: 14, country: "🇩🇪 Германия", brewery: "Bayerische Staatsbrauerei Weihenstephan", description: "Самая старая пивоварня в мире. Классический баварский пшеничный эль с нотами банана и гвоздики.", rating: 3.9, ratingCount: 42000 },
  { name: "Pilsner Urquell", style: "Pilsner", abv: 4.4, ibu: 40, country: "🇨🇿 Чехия", brewery: "Plzeňský Prazdroj", description: "Оригинальный пильзнер с 1842 года. Чистый, хрустящий лагер с благородным хмелем Saaz.", rating: 4.0, ratingCount: 52000 },
  { name: "Westmalle Tripel", style: "Belgian Tripel", abv: 9.5, ibu: 35, country: "🇧🇪 Бельгия", brewery: "Brouwerij Westmalle", description: "Траппистский трипель золотистого цвета. Сложный вкус с фруктовыми и пряными нотами.", rating: 4.2, ratingCount: 15000 },
  { name: "Rochefort 10", style: "Belgian Dark Ale", abv: 11.3, ibu: 35, country: "🇧🇪 Бельгия", brewery: "Brasserie de Rochefort", description: "Мощный траппистский эль с нотами тёмного шоколада, инжира и сухофруктов.", rating: 4.3, ratingCount: 28000 },
  { name: "Sierra Nevada Pale Ale", style: "Pale Ale", abv: 5.6, ibu: 38, country: "🇺🇸 США", brewery: "Sierra Nevada Brewing Co.", description: "Американский классический pale ale. Каскадный хмель даёт цитрусовые и цветочные ноты.", rating: 3.8, ratingCount: 45000 },
  { name: "Chimay Blue Grande Réserve", style: "Belgian Dark Ale", abv: 11.0, ibu: 36, country: "🇧🇪 Бельгия", brewery: "Abbaye de Chimay", description: "Траппистский тёмный эль. Сложный вкус с карамелью, тёмным сахаром и пряностями.", rating: 4.1, ratingCount: 32000 },
  { name: "Duvel", style: "Belgian Golden Ale", abv: 8.5, ibu: 32, country: "🇧🇪 Бельгия", brewery: "Duvel Moortgat", description: "Культовый бельгийский золотой эль. Лёгкая текстура с сухим, хмельным финишем.", rating: 4.0, ratingCount: 22000 },
  { name: "Orval", style: "Belgian Pale Ale", abv: 6.9, ibu: 36, country: "🇧🇪 Бельгия", brewery: "Abbaye Notre-Dame d'Orval", description: "Уникальный траппистский эль с сухой重新发酵ацией в бутылке. Дикий, сложный, землистый.", rating: 4.2, ratingCount: 18000 },
  { name: "Hoegaarden", style: "Wheat Beer", abv: 4.9, ibu: 14, country: "🇧🇪 Бельгия", brewery: "Brouwerij Hoegaarden", description: "Бельгийский witbier с кориандром и цедрой апельсина. Свежий, лёгкий, цитрусовый.", rating: 3.5, ratingCount: 35000 },
  { name: "Stella Artois", style: "Lager", abv: 5.0, ibu: 24, country: "🇧🇪 Бельгия", brewery: "Stella Artois", description: "Классический европейский лагер. Чистый, сухой, с лёгкой сладостью.", rating: 3.4, ratingCount: 65000 },
  { name: "Founders All Day IPA", style: "IPA", abv: 4.7, ibu: 42, country: "🇺🇸 США", brewery: "Founders Brewing Co.", description: "Session IPA для ежедневного употребления. Сбалансированный хмелевой профиль с цитрусовыми нотами.", rating: 3.7, ratingCount: 12000 },
  { name: "Bell's Two Hearted Ale", style: "American IPA", abv: 7.0, ibu: 55, country: "🇺🇸 США", brewery: "Bell's Brewery", description: "Американский IPA с хмелем Centennial. Мощный цитрусовый и хвойный аромат.", rating: 4.0, ratingCount: 25000 },
  { name: "Samuel Smith's Oatmeal Stout", style: "Oatmeal Stout", abv: 5.0, ibu: 28, country: "🇬🇧 Англия", brewery: "Samuel Smith Old Brewery", description: "Английский овсяный стаут. Нежный, кремовый с нотами овса, кофе и тёмного шоколада.", rating: 3.9, ratingCount: 15000 },
  { name: "Ayinger Celebrator Doppelbock", style: "Bock", abv: 6.7, ibu: 24, country: "🇩🇪 Германия", brewery: "Ayinger Privatbrauerei", description: "Немецкий двойной бок. Мощный солодовый характер с карамелью, тёмным хлебом и лёгкой горчинкой.", rating: 4.0, ratingCount: 11000 },
  { name: "Punk IPA", style: "IPA", abv: 5.6, ibu: 40, country: "🏴󠁧󠁢󠁳󠁣󠁴󠁿 Шотландия", brewery: "BrewDog", description: "Культовый IPA от BrewDog. Тропические фрукты, цитрусовые и сосна в каждом глотке.", rating: 3.8, ratingCount: 30000 },
  { name: "Budweiser Budvar", style: "Lager", abv: 5.0, ibu: 35, country: "🇨🇿 Чехия", brewery: "Budweiser Budvar", description: "Чешский лагер, оригинальный Budweiser. С Saaz хмелем и моравским солодом.", rating: 3.7, ratingCount: 8000 },
  { name: "Paulaner Salvator Doppelbock", style: "Bock", abv: 7.9, ibu: 25, country: "🇩🇪 Германия", brewery: "Paulaner", description: "Самый известный двойной бок в мире. Солодовый, насыщенный с нотами карамели и сухофруктов.", rating: 3.9, ratingCount: 9000 },
  { name: "Kozel Dark", style: "Dark Lager", abv: 3.8, ibu: 18, country: "🇨🇿 Чехия", brewery: "Kozel", description: "Чешкий тёмный лагер. Мягкий солодовый вкус с нотами карамели и кофе.", rating: 3.3, ratingCount: 20000 },
];

async function main() {
  console.log('🌱 Seeding BeerID database...');

  // Check if data already exists
  const existingCount = await prisma.beer.count();
  if (existingCount > 0) {
    console.log(`Database already has ${existingCount} beers. Skipping seed.`);
    return;
  }

  // Try PunkAPI first (real data)
  console.log('📡 Fetching real beer data from PunkAPI...');
  let punkBeers = await fetchAllPunkBeers((fetched, total) => {
    process.stdout.write(`\r   Fetched ${fetched}/${total} beers...`);
  });
  console.log('');

  if (punkBeers.length > 0) {
    console.log(`✅ Got ${punkBeers.length} real beers from PunkAPI`);
    
    for (const beer of punkBeers) {
      const data = punkToDbBeer(beer);
      try {
        await prisma.beer.create({ data });
      } catch {
        // Skip duplicates
      }
    }

    console.log(`📊 Database now has ${await prisma.beer.count()} beers from PunkAPI`);
  } else {
    console.log('⚠️  PunkAPI unavailable, using fallback data...');
    
    for (const beer of FALLBACK_BEERS) {
      await prisma.beer.create({
        data: {
          ...beer,
          label: '',
          totalCheckins: Math.floor(Math.random() * 50000) + 500,
          monthlyCheckins: Math.floor(Math.random() * 2000) + 50,
          dailyCheckins: Math.floor(Math.random() * 100) + 5,
          source: 'seed',
        },
      });
    }
    console.log(`📊 Database seeded with ${FALLBACK_BEERS.length} fallback beers`);
  }

  // Seed some sample reviews
  const allBeers = await prisma.beer.findMany({ take: 30 });
  const reviewerNames = ['Алексей', 'Мария', 'Дмитрий', 'Ольга', 'Сергей', 'Анна', 'Иван', 'Елена', 'Павел', 'Наталья'];
  const reviewComments = [
    'Отличное пиво, рекомендую!',
    'Необычный вкус, но понравилось.',
    'Классика жанра.',
    'Хороший выбор для вечера.',
    'Слишком горькое для меня.',
    'Идеальный баланс хмеля и солода.',
    'Буду заказывать ещё.',
    'Не моё, но качество отличное.',
  ];

  for (const beer of allBeers) {
    const numReviews = Math.floor(Math.random() * 4) + 1;
    for (let i = 0; i < numReviews; i++) {
      await prisma.review.create({
        data: {
          beerId: beer.id,
          author: reviewerNames[Math.floor(Math.random() * reviewerNames.length)],
          rating: Math.round((3 + Math.random() * 2) * 2) / 2,
          comment: reviewComments[Math.floor(Math.random() * reviewComments.length)],
        },
      });
    }
  }

  console.log('✅ Seeding complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());