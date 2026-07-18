/**
 * Seed script: loads classic beer data into the local database.
 * Run: bun prisma db seed
 *
 * Uses curated hardcoded data for reliable, instant seeding.
 * Online search via Untappd API adds millions more at runtime.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_BEERS = [
  { name: "Guinness Draught", style: "Irish Dry Stout", abv: 4.2, ibu: 45, country: "🇮🇪 Ирландия", brewery: "Guinness", description: "Классический ирландский сухой стаут с бархатистой текстурой и кофейно-шоколадным вкусом. Один из самых узнаваемых сортов пива в мире.", rating: 4.1, ratingCount: 284500, totalCheckins: 1280000, monthlyCheckins: 35000, dailyCheckins: 1200, label: "https://images.untappd.com/beer/346.jpg" },
  { name: "Pliny the Elder", style: "Double IPA", abv: 8.0, ibu: 100, country: "🇺🇸 США", brewery: "Russian River Brewing", description: "Легендарный Imperial IPA с мощным хмельным профилем. Сочетание цитрусовых, сосновых и цветочных нот.", rating: 4.5, ratingCount: 18500, totalCheckins: 95000, monthlyCheckins: 2800, dailyCheckins: 95, label: "" },
  { name: "Weihenstephaner Hefeweissbier", style: "Wheat Beer", abv: 5.4, ibu: 14, country: "🇩🇪 Германия", brewery: "Bayerische Staatsbrauerei Weihenstephan", description: "Самая старая пивоварня в мире. Классический баварский пшеничный эль с нотами банана и гвоздики.", rating: 3.9, ratingCount: 42000, totalCheckins: 210000, monthlyCheckins: 5500, dailyCheckins: 180, label: "" },
  { name: "Pilsner Urquell", style: "Pilsner", abv: 4.4, ibu: 40, country: "🇨🇿 Чехия", brewery: "Plzeňský Prazdroj", description: "Оригинальный пильзнер с 1842 года. Чистый, хрустящий лагер с благородным хмелем Saaz.", rating: 4.0, ratingCount: 52000, totalCheckins: 320000, monthlyCheckins: 8000, dailyCheckins: 270, label: "" },
  { name: "Westmalle Tripel", style: "Belgian Tripel", abv: 9.5, ibu: 35, country: "🇧🇪 Бельгия", brewery: "Brouwerij Westmalle", description: "Траппистский трипель золотистого цвета. Сложный вкус с фруктовыми и пряными нотами.", rating: 4.2, ratingCount: 15000, totalCheckins: 72000, monthlyCheckins: 1900, dailyCheckins: 65, label: "" },
  { name: "Rochefort 10", style: "Belgian Dark Ale", abv: 11.3, ibu: 35, country: "🇧🇪 Бельгия", brewery: "Brasserie de Rochefort", description: "Мощный траппистский эль с нотами тёмного шоколада, инжира и сухофруктов.", rating: 4.3, ratingCount: 28000, totalCheckins: 135000, monthlyCheckins: 3600, dailyCheckins: 120, label: "" },
  { name: "Sierra Nevada Pale Ale", style: "Pale Ale", abv: 5.6, ibu: 38, country: "🇺🇸 США", brewery: "Sierra Nevada Brewing Co.", description: "Американский классический pale ale. Каскадный хмель даёт цитрусовые и цветочные ноты.", rating: 3.8, ratingCount: 45000, totalCheckins: 245000, monthlyCheckins: 6200, dailyCheckins: 210, label: "" },
  { name: "Chimay Blue Grande Réserve", style: "Belgian Dark Ale", abv: 11.0, ibu: 36, country: "🇧🇪 Бельгия", brewery: "Abbaye de Chimay", description: "Траппистский тёмный эль. Сложный вкус с карамелью, тёмным сахаром и пряностями.", rating: 4.1, ratingCount: 32000, totalCheckins: 156000, monthlyCheckins: 4100, dailyCheckins: 140, label: "" },
  { name: "Duvel", style: "Belgian Golden Ale", abv: 8.5, ibu: 32, country: "🇧🇪 Бельгия", brewery: "Duvel Moortgat", description: "Культовый бельгийский золотой эль. Лёгкая текстура с сухим, хмельным финишем.", rating: 4.0, ratingCount: 22000, totalCheckins: 108000, monthlyCheckins: 2800, dailyCheckins: 95, label: "" },
  { name: "Orval", style: "Belgian Pale Ale", abv: 6.9, ibu: 36, country: "🇧🇪 Бельгия", brewery: "Abbaye Notre-Dame d'Orval", description: "Уникальный траппистский эль с сухой реферментацией в бутылке. Дикий, сложный, землистый.", rating: 4.2, ratingCount: 18000, totalCheckins: 85000, monthlyCheckins: 2200, dailyCheckins: 75, label: "" },
  { name: "Hoegaarden", style: "Wheat Beer", abv: 4.9, ibu: 14, country: "🇧🇪 Бельгия", brewery: "Brouwerij Hoegaarden", description: "Бельгийский witbier с кориандром и цедрой апельсина. Свежий, лёгкий, цитрусовый.", rating: 3.5, ratingCount: 35000, totalCheckins: 280000, monthlyCheckins: 7000, dailyCheckins: 235, label: "" },
  { name: "Stella Artois", style: "Lager", abv: 5.0, ibu: 24, country: "🇧🇪 Бельгия", brewery: "Stella Artois", description: "Классический европейский лагер. Чистый, сухой, с лёгкой сладостью.", rating: 3.4, ratingCount: 65000, totalCheckins: 560000, monthlyCheckins: 14000, dailyCheckins: 470, label: "" },
  { name: "Founders All Day IPA", style: "Session IPA", abv: 4.7, ibu: 42, country: "🇺🇸 США", brewery: "Founders Brewing Co.", description: "Session IPA для ежедневного употребления. Сбалансированный хмелевой профиль с цитрусовыми нотами.", rating: 3.7, ratingCount: 12000, totalCheckins: 62000, monthlyCheckins: 1600, dailyCheckins: 55, label: "" },
  { name: "Bell's Two Hearted Ale", style: "American IPA", abv: 7.0, ibu: 55, country: "🇺🇸 США", brewery: "Bell's Brewery", description: "Американский IPA с хмелем Centennial. Мощный цитрусовый и хвойный аромат.", rating: 4.0, ratingCount: 25000, totalCheckins: 130000, monthlyCheckins: 3400, dailyCheckins: 115, label: "" },
  { name: "Samuel Smith's Oatmeal Stout", style: "Oatmeal Stout", abv: 5.0, ibu: 28, country: "🇬🇧 Англия", brewery: "Samuel Smith Old Brewery", description: "Английский овсяный стаут. Нежный, кремовый с нотами овса, кофе и тёмного шоколада.", rating: 3.9, ratingCount: 15000, totalCheckins: 72000, monthlyCheckins: 1900, dailyCheckins: 65, label: "" },
  { name: "Ayinger Celebrator Doppelbock", style: "Bock", abv: 6.7, ibu: 24, country: "🇩🇪 Германия", brewery: "Ayinger Privatbrauerei", description: "Немецкий двойной бок. Мощный солодовый характер с карамелью, тёмным хлебом и лёгкой горчинкой.", rating: 4.0, ratingCount: 11000, totalCheckins: 54000, monthlyCheckins: 1400, dailyCheckins: 48, label: "" },
  { name: "Punk IPA", style: "IPA", abv: 5.6, ibu: 40, country: "🏴󠁧󠁢󠁳󠁣󠁴󠁿 Шотландия", brewery: "BrewDog", description: "Культовый IPA от BrewDog. Тропические фрукты, цитрусовые и сосна в каждом глотке.", rating: 3.8, ratingCount: 30000, totalCheckins: 185000, monthlyCheckins: 4800, dailyCheckins: 160, label: "" },
  { name: "Budweiser Budvar", style: "Lager", abv: 5.0, ibu: 35, country: "🇨🇿 Чехия", brewery: "Budweiser Budvar", description: "Чешский лагер, оригинальный Budweiser. С Saaz хмелем и моравским солодом.", rating: 3.7, ratingCount: 8000, totalCheckins: 38000, monthlyCheckins: 980, dailyCheckins: 33, label: "" },
  { name: "Paulaner Salvator Doppelbock", style: "Bock", abv: 7.9, ibu: 25, country: "🇩🇪 Германия", brewery: "Paulaner", description: "Самый известный двойной бок в мире. Солодовый, насыщенный с нотами карамели и сухофруктов.", rating: 3.9, ratingCount: 9000, totalCheckins: 44000, monthlyCheckins: 1150, dailyCheckins: 39, label: "" },
  { name: "Kozel Dark", style: "Dark Lager", abv: 3.8, ibu: 18, country: "🇨🇿 Чехия", brewery: "Kozel", description: "Чешский тёмный лагер. Мягкий солодовый вкус с нотами карамели и кофе.", rating: 3.3, ratingCount: 20000, totalCheckins: 98000, monthlyCheckins: 2500, dailyCheckins: 85, label: "" },
  { name: "Corona Extra", style: "Lager", abv: 4.6, ibu: 18, country: "🇲🇽 Мексика", brewery: "Grupo Modelo", description: "Лёгкий мексиканский лагер с лаймом. Самое продаваемое пиво в Мексике.", rating: 3.2, ratingCount: 180000, totalCheckins: 2100000, monthlyCheckins: 52000, dailyCheckins: 1750, label: "" },
  { name: "Heineken", style: "Lager", abv: 5.0, ibu: 23, country: "🇳🇱 Нидерланды", brewery: "Heineken", description: "Международный лагер. Чистый, лёгкий, слегка горьковатый финиш.", rating: 3.3, ratingCount: 120000, totalCheckins: 1800000, monthlyCheckins: 45000, dailyCheckins: 1500, label: "" },
  { name: "Murphy's Irish Stout", style: "Irish Dry Stout", abv: 4.0, ibu: 40, country: "🇮🇪 Ирландия", brewery: "Murphy's Brewery", description: "Ирландский сухой стаут. Мягче Guinness, с нотами кофе и шоколада.", rating: 3.7, ratingCount: 8500, totalCheckins: 20400, monthlyCheckins: 520, dailyCheckins: 18, label: "" },
  { name: "Erdinger Weissbier", style: "Wheat Beer", abv: 5.3, ibu: 14, country: "🇩🇪 Германия", brewery: "Erdinger Weissbräu", description: "Классический немецкий пшеничный эль. Банан, гвоздика, мягкая углекислотность.", rating: 3.6, ratingCount: 28000, totalCheckins: 145000, monthlyCheckins: 3700, dailyCheckins: 125, label: "" },
  { name: "Trappistes Rochefort 8", style: "Belgian Dark Ale", abv: 9.2, ibu: 22, country: "🇧🇪 Бельгия", brewery: "Brasserie de Rochefort", description: "Траппистский дуббель. Фиги, изюм, карамель и пряности в насыщенном теле.", rating: 4.1, ratingCount: 22000, totalCheckins: 105000, monthlyCheckins: 2750, dailyCheckins: 93, label: "" },
  { name: "La Chouffe", style: "Belgian Golden Ale", abv: 8.0, ibu: 22, country: "🇧🇪 Бельгия", brewery: "Brasserie d'Achouffe", description: "Бельгийский блонд эль с кориандром. Фруктовый, пряный, легко пьётся.", rating: 3.9, ratingCount: 14000, totalCheckins: 68000, monthlyCheckins: 1780, dailyCheckins: 60, label: "" },
  { name: "Hazy Little Thing", style: "New England IPA", abv: 6.7, ibu: 35, country: "🇺🇸 США", brewery: "Sierra Nevada Brewing Co.", description: "NEIPA от Sierra Nevada. Мутный, сочный, с тропическими фруктами и минимальной горчинкой.", rating: 3.9, ratingCount: 9500, totalCheckins: 48000, monthlyCheckins: 1250, dailyCheckins: 42, label: "" },
  { name: "Peroni Nastro Azzurro", style: "Lager", abv: 5.1, ibu: 20, country: "🇮🇹 Италия", brewery: "Peroni", description: "Итальянский премиум лагер. Сухой, хрустящий, с лёгкими цитрусовыми нотами.", rating: 3.2, ratingCount: 18000, totalCheckins: 95000, monthlyCheckins: 2400, dailyCheckins: 82, label: "" },
  { name: "Leffe Blonde", style: "Belgian Blonde Ale", abv: 6.6, ibu: 19, country: "🇧🇪 Бельгия", brewery: "Abbaye de Leffe", description: "Бельгийский блонд эль. Фруктовый, пряный, с нотами ванили и специй.", rating: 3.5, ratingCount: 22000, totalCheckins: 112000, monthlyCheckins: 2900, dailyCheckins: 98, label: "" },
  { name: "Amstel Lager", style: "Lager", abv: 5.0, ibu: 20, country: "🇳🇱 Нидерланды", brewery: "Amstel Brouwerij", description: "Нидерландский лагер. Чистый, мягкий, легко пьётся.", rating: 3.1, ratingCount: 15000, totalCheckins: 82000, monthlyCheckins: 2100, dailyCheckins: 71, label: "" },
  { name: "Stone IPA", style: "American IPA", abv: 6.9, ibu: 71, country: "🇺🇸 США", brewery: "Stone Brewing", description: "Мощный американский IPA от Stone. Агрессивный хмель с цитрусовыми и сосновыми нотами.", rating: 3.9, ratingCount: 16000, totalCheckins: 82000, monthlyCheckins: 2150, dailyCheckins: 73, label: "" },
  { name: "Unibroue La Fin du Monde", style: "Belgian Tripel", abv: 9.0, ibu: 19, country: "🇨🇦 Канада", brewery: "Unibroue", description: "Канадский бельгийский трипель. Фруктовый, пряный, с нотами кориандра и апельсиновой цедры.", rating: 4.0, ratingCount: 12000, totalCheckins: 58000, monthlyCheckins: 1500, dailyCheckins: 51, label: "" },
  { name: "To Øl Mosaic Pils", style: "Pilsner", abv: 4.6, ibu: 30, country: "🇩🇰 Дания", brewery: "To Øl", description: "Датский крафтовый пильзнер с хмелем Mosaic. Цветочные и тропические ноты.", rating: 3.7, ratingCount: 3500, totalCheckins: 18000, monthlyCheckins: 470, dailyCheckins: 16, label: "" },
  { name: "Lervig Proper", style: "IPA", abv: 5.5, ibu: 45, country: "🇳🇴 Норвегия", brewery: "Lervig Aktiebryggeri", description: "Норвежский IPA. Сочный, хмелевой, с нотами маракуйи и апельсина.", rating: 3.8, ratingCount: 4200, totalCheckins: 22000, monthlyCheckins: 580, dailyCheckins: 20, label: "" },
  { name: "Garage Project Hāpi Daze", style: "New England IPA", abv: 6.5, ibu: 30, country: "🇳🇿 Новая Зеландия", brewery: "Garage Project", description: "Новозеландский NEIPA с местным хмелем. Тропические ноты маракуйи и грейпфрута.", rating: 3.9, ratingCount: 2800, totalCheckins: 14000, monthlyCheckins: 370, dailyCheckins: 13, label: "" },
  { name: "Coopers Pale Ale", style: "Pale Ale", abv: 4.4, ibu: 30, country: "🇦🇺 Австралия", brewery: "Coopers Brewery", description: "Австралийский pale ale. Фруктовый хмелевой аромат, мягкое тело.", rating: 3.5, ratingCount: 8500, totalCheckins: 42000, monthlyCheckins: 1100, dailyCheckins: 37, label: "" },
  { name: "Sapporo Premium", style: "Lager", abv: 4.9, ibu: 18, country: "🇯🇵 Япония", brewery: "Sapporo Breweries", description: "Японский рисовый лагер. Чистый, сухой, лёгкий.", rating: 3.2, ratingCount: 11000, totalCheckins: 55000, monthlyCheckins: 1400, dailyCheckins: 48, label: "" },
  { name: "Trappistes Westmalle Dubbel", style: "Belgian Dubbel", abv: 7.0, ibu: 24, country: "🇧🇪 Бельгия", brewery: "Brouwerij Westmalle", description: "Траппистский дуббель. Карамель, слива, лёгкая сладость и пряности.", rating: 4.0, ratingCount: 13000, totalCheckins: 62000, monthlyCheckins: 1620, dailyCheckins: 55, label: "" },
  { name: "Schneider Weisse Tap 7", style: "Wheat Beer", abv: 5.4, ibu: 14, country: "🇩🇪 Германия", brewery: "Schneider Weisse", description: "Баварский тёмный пшеничный эль. Банан, гвоздика, хлебные ноты.", rating: 3.9, ratingCount: 7500, totalCheckins: 36000, monthlyCheckins: 940, dailyCheckins: 32, label: "" },
  { name: "Firestone Walker 805", style: "Blonde Ale", abv: 4.7, ibu: 20, country: "🇺🇸 США", brewery: "Firestone Walker", description: "Калифорнийский блонд эль. Лёгкий, хмелевой, освежающий.", rating: 3.6, ratingCount: 14000, totalCheckins: 72000, monthlyCheckins: 1880, dailyCheckins: 64, label: "" },
  { name: "Cigar City Jai Alai", style: "American IPA", abv: 7.2, ibu: 70, country: "🇺🇸 США", brewery: "Cigar City Brewing", description: "Флоридский IPA с хмелем Citra и Simcoe. Тропические фрукты и смола.", rating: 4.0, ratingCount: 11000, totalCheckins: 56000, monthlyCheckins: 1460, dailyCheckins: 50, label: "" },
  { name: "Mikkeller Single Hop Centennial", style: "American IPA", abv: 6.1, ibu: 55, country: "🇩🇰 Дания", brewery: "Mikkeller", description: "Моносортовой IPA от Mikkeller. Чистый профиль хмеля Centennial — цитрус и цветы.", rating: 3.8, ratingCount: 5000, totalCheckins: 25000, monthlyCheckins: 650, dailyCheckins: 22, label: "" },
  { name: "Dogfish Head 60 Minute IPA", style: "American IPA", abv: 6.0, ibu: 60, country: "🇺🇸 США", brewery: "Dogfish Head", description: "IPA с непрерывным хмелеванием. Сбалансированный, цитрусово-сосновый.", rating: 3.7, ratingCount: 18000, totalCheckins: 92000, monthlyCheckins: 2400, dailyCheckins: 81, label: "" },
  { name: "BrewDog Elvis Juice", style: "IPA", abv: 6.5, ibu: 40, country: "🏴󠁧󠁢󠁳󠁣󠁴󠁿 Шотландия", brewery: "BrewDog", description: "Grapefruit IPA от BrewDog. Грейпфрутовый сок и хмелевой цитрус.", rating: 3.7, ratingCount: 8500, totalCheckins: 42000, monthlyCheckins: 1100, dailyCheckins: 37, label: "" },
  { name: "Goose Island IPA", style: "American IPA", abv: 5.9, ibu: 55, country: "🇺🇸 США", brewery: "Goose Island Beer Co.", description: "Чикагский IPA. Каскадный хмель — цитрусовые, цветы, сосна.", rating: 3.6, ratingCount: 20000, totalCheckins: 105000, monthlyCheckins: 2740, dailyCheckins: 93, label: "" },
  { name: "Ballast Point Sculpin", style: "American IPA", abv: 7.0, ibu: 45, country: "🇺🇸 США", brewery: "Ballast Point", description: "Сан-диегский IPA с хмелем Simcoe. Апельсин, манго, ананас.", rating: 3.8, ratingCount: 13000, totalCheckins: 67000, monthlyCheckins: 1750, dailyCheckins: 59, label: "" },
  { name: "Bud Light", style: "Lager", abv: 4.2, ibu: 6, country: "🇺🇸 США", brewery: "Anheuser-Busch", description: "Самое продаваемое пиво в США. Лёгкий рисовый лагер.", rating: 2.8, ratingCount: 250000, totalCheckins: 3500000, monthlyCheckins: 87000, dailyCheckins: 2900, label: "" },
  { name: "Tiger Beer", style: "Lager", abv: 5.0, ibu: 16, country: "🇸🇬 Сингапур", brewery: "Asia Pacific Breweries", description: "Азиатский лагер. Лёгкий, освежающий, с мягкой горчинкой.", rating: 3.1, ratingCount: 9500, totalCheckins: 48000, monthlyCheckins: 1250, dailyCheckins: 42, label: "" },
  { name: "Foster's Lager", style: "Lager", abv: 4.0, ibu: 12, country: "🇦🇺 Австралия", brewery: "Foster's Group", description: "Австралийский лагер. Лёгкий, мягкий, хорошо охлаждённый.", rating: 2.9, ratingCount: 12000, totalCheckins: 65000, monthlyCheckins: 1680, dailyCheckins: 57, label: "" },
  { name: "Warsteiner Premium Verum", style: "Lager", abv: 4.8, ibu: 20, country: "🇩🇪 Германия", brewery: "Warsteiner Brauerei", description: "Немецкий премиум лагер. Чистый, солодовый, мягкая горечь.", rating: 3.3, ratingCount: 8500, totalCheckins: 42000, monthlyCheckins: 1090, dailyCheckins: 37, label: "" },
  { name: "Hite Cold Brew", style: "Lager", abv: 4.5, ibu: 14, country: "🇰🇷 Южная Корея", brewery: "HiteJinro", description: "Корейский лагер холодного фильтрования. Чистый, освежающий.", rating: 3.0, ratingCount: 5500, totalCheckins: 28000, monthlyCheckins: 730, dailyCheckins: 25, label: "" },
  { name: "Brahma Chopp", style: "Lager", abv: 4.8, ibu: 12, country: "🇧🇷 Бразилия", brewery: "Ambev", description: "Бразильский лагер. Лёгкий, мягкий, популярный в Южной Америке.", rating: 3.0, ratingCount: 7500, totalCheckins: 38000, monthlyCheckins: 980, dailyCheckins: 33, label: "" },
  { name: "Tuborg Green", style: "Lager", abv: 4.6, ibu: 16, country: "🇩🇰 Дания", brewery: "Tuborg Breweries", description: "Датский международный лагер. Мягкий, легко пьётся.", rating: 3.0, ratingCount: 10000, totalCheckins: 52000, monthlyCheckins: 1350, dailyCheckins: 46, label: "" },
  { name: "Three Floyds Zombie Dust", style: "American IPA", abv: 6.4, ibu: 50, country: "🇺🇸 США", brewery: "Three Floyds Brewing", description: "Культовый IPA от Three Floyds. Цитрусовый, тропический, хмелевой.", rating: 4.2, ratingCount: 8500, totalCheckins: 43000, monthlyCheckins: 1120, dailyCheckins: 38, label: "" },
  { name: "Hill Farmstead Abner", style: "Double IPA", abv: 8.0, ibu: 85, country: "🇺🇸 США", brewery: "Hill Farmstead Brewery", description: "DIPA от Hill Farmstead. Мощный, сложный, с тропическими фруктами и смолой.", rating: 4.4, ratingCount: 5200, totalCheckins: 26000, monthlyCheckins: 680, dailyCheckins: 23, label: "" },
  { name: "The Alchemist Heady Topper", style: "Double IPA", abv: 8.0, ibu: 75, country: "🇺🇸 США", brewery: "The Alchemist", description: "Легендарный DIPA из Вермонта. Мутный, сочный, взрыв тропических фруктов.", rating: 4.5, ratingCount: 15000, totalCheckins: 78000, monthlyCheckins: 2050, dailyCheckins: 69, label: "" },
  { name: "Tree House Julius", style: "New England IPA", abv: 6.8, ibu: 40, country: "🇺🇸 США", brewery: "Tree House Brewery", description: "NEIPA от Tree House. Апельсиновый мармелад, манго, пушистое тело.", rating: 4.4, ratingCount: 9000, totalCheckins: 45000, monthlyCheckins: 1180, dailyCheckins: 40, label: "" },
  { name: "De Molen Hemel & Aarde", style: "Stout", abv: 8.0, ibu: 35, country: "🇳🇱 Нидерланды", brewery: "Brouwerij De Molen", description: "Голландский имперский стаут. Шоколад, кофе, ваниль, дым.", rating: 4.0, ratingCount: 3200, totalCheckins: 16000, monthlyCheckins: 420, dailyCheckins: 14, label: "" },
  { name: "Brasserie Dupont Saison Dupont", style: "Saison", abv: 5.8, ibu: 28, country: "🇧🇪 Бельгия", brewery: "Brasserie Dupont", description: "Классическая бельгийская сезон. Сухой, пряный, с цитрусовыми и землистыми нотами.", rating: 3.9, ratingCount: 8000, totalCheckins: 39000, monthlyCheckins: 1020, dailyCheckins: 35, label: "" },
  { name: "Bosteels Pauwel Kwak", style: "Belgian Amber Ale", abv: 8.4, ibu: 20, country: "🇧🇪 Бельгия", brewery: "Brouwerij Bosteels", description: "Бельгийский янтарный эль. Карамель, пряности, лёгкая сладость. Подаётся в специальном стакане.", rating: 3.7, ratingCount: 6500, totalCheckins: 32000, monthlyCheckins: 840, dailyCheckins: 28, label: "" },
  { name: "Pilsner Urquell 1842", style: "Pilsner", abv: 4.4, ibu: 40, country: "🇨🇿 Чехия", brewery: "Plzeňský Prazdroj", description: "Нефильтрованный пильзнер. Более насыщенный вкус оригинала с дрожжевыми нотами.", rating: 4.1, ratingCount: 6200, totalCheckins: 31000, monthlyCheckins: 810, dailyCheckins: 27, label: "" },
  { name: "Hitachino Nest White Ale", style: "Wheat Beer", abv: 5.3, ibu: 15, country: "🇯🇵 Япония", brewery: "Kiuchi Brewery", description: "Японский witbier с юдзу и кориандром. Экзотичный, освежающий.", rating: 3.7, ratingCount: 4200, totalCheckins: 21000, monthlyCheckins: 550, dailyCheckins: 19, label: "" },
  { name: "Flying Dog Gonzo Imperial Porter", style: "Porter", abv: 7.8, ibu: 50, country: "🇺🇸 США", brewery: "Flying Dog Brewery", description: "Имперский портер. Тёмный шоколад, кофе, лёгкий дым.", rating: 3.7, ratingCount: 5800, totalCheckins: 29000, monthlyCheckins: 760, dailyCheckins: 26, label: "" },
  { name: "Epic Brewing Hop Zombie", style: "Double IPA", abv: 8.5, ibu: 100, country: "🇳🇿 Новая Зеландия", brewery: "Epic Brewing Company", description: "Новозеландский DIPA. Мощный хмель с тропическими нотами маракуйи.", rating: 3.8, ratingCount: 2800, totalCheckins: 14000, monthlyCheckins: 370, dailyCheckins: 13, label: "" },
  { name: "O'Hara's Irish Stout", style: "Irish Dry Stout", abv: 4.3, ibu: 30, country: "🇮🇪 Ирландия", brewery: "O'Hara's Brewery", description: "Ирландский сухой стаут. Кофе, шоколад, кремовая текстура.", rating: 3.6, ratingCount: 3200, totalCheckins: 16000, monthlyCheckins: 420, dailyCheckins: 14, label: "" },
  { name: "Franziskaner Hefe-Weisse", style: "Wheat Beer", abv: 5.0, ibu: 14, country: "🇩🇪 Германия", brewery: "Spaten-Franziskaner-Bräu", description: "Мюнхенский пшеничный эль. Банан, гвоздика, мягкая углекислотность.", rating: 3.5, ratingCount: 18000, totalCheckins: 92000, monthlyCheckins: 2400, dailyCheckins: 81, label: "" },
  { name: "Carlsberg", style: "Lager", abv: 5.0, ibu: 20, country: "🇩🇰 Дания", brewery: "Carlsberg Group", description: "Датский международный лагер. Чистый, мягкий, лёгкая горечь.", rating: 3.1, ratingCount: 22000, totalCheckins: 115000, monthlyCheckins: 3000, dailyCheckins: 100, label: "" },
  { name: "Kirin Ichiban", style: "Lager", abv: 5.0, ibu: 18, country: "🇯🇵 Япония", brewery: "Kirin Brewery", description: "Японский премиум лагер. Первый отжим (Ichiban Shibori). Чистый, мягкий.", rating: 3.2, ratingCount: 7800, totalCheckins: 39000, monthlyCheckins: 1010, dailyCheckins: 34, label: "" },
  { name: " Efes Pilsen", style: "Pilsner", abv: 5.0, ibu: 22, country: "🇹🇷 Турция", brewery: "Anadolu Efes", description: "Турецкий пильзнер. Самое популярное пиво Турции.", rating: 3.0, ratingCount: 6000, totalCheckins: 30000, monthlyCheckins: 780, dailyCheckins: 26, label: "" },
  { name: "Baltika #7 Export", style: "Lager", abv: 5.4, ibu: 16, country: "🇷🇺 Россия", brewery: "Baltika Breweries", description: "Российский экспортный лагер. Солодовый, чистый, с лёгкой горчинкой.", rating: 2.9, ratingCount: 14000, totalCheckins: 72000, monthlyCheckins: 1880, dailyCheckins: 63, label: "" },
  { name: "Ochakovo Classic", style: "Lager", abv: 4.8, ibu: 14, country: "🇷🇺 Россия", brewery: "Очаково", description: "Российский классический лагер. Мягкий солодовый вкус.", rating: 2.8, ratingCount: 8000, totalCheckins: 41000, monthlyCheckins: 1070, dailyCheckins: 36, label: "" },
  { name: "Жигулёвское Барное", style: "Lager", abv: 4.0, ibu: 12, country: "🇷🇺 Россия", brewery: "Жигулёвское", description: "Классическое советское пиво по ГОСТу. Лёгкий лагер.", rating: 2.6, ratingCount: 18000, totalCheckins: 95000, monthlyCheckins: 2470, dailyCheckins: 83, label: "" },
  { name: "Tolstoy Imperial Russian Stout", style: "Russian Imperial Stout", abv: 10.5, ibu: 65, country: "🇷🇺 Россия", brewery: "Tolstoy Brewery", description: "Российский имперский стаут. Тёмный шоколад, кофе, вишня, дуб.", rating: 3.9, ratingCount: 2800, totalCheckins: 14000, monthlyCheckins: 370, dailyCheckins: 13, label: "" },
];

const SEED_TRENDING = [
  { beerName: "Guinness Draught", category: "macro", position: 1 },
  { beerName: "Corona Extra", category: "macro", position: 2 },
  { beerName: "Heineken", category: "macro", position: 3 },
  { beerName: "Stella Artois", category: "macro", position: 4 },
  { beerName: "Bud Light", category: "macro", position: 5 },
  { beerName: "Pliny the Elder", category: "craft", position: 1 },
  { beerName: "The Alchemist Heady Topper", category: "craft", position: 2 },
  { beerName: "Hill Farmstead Abner", category: "craft", position: 3 },
  { beerName: "Tree House Julius", category: "craft", position: 4 },
  { beerName: "Three Floyds Zombie Dust", category: "craft", position: 5 },
  { beerName: "Pilsner Urquell", category: "global", position: 1 },
  { beerName: "Weihenstephaner Hefeweissbier", category: "global", position: 2 },
  { beerName: "Westmalle Tripel", category: "global", position: 3 },
  { beerName: "Sierra Nevada Pale Ale", category: "global", position: 4 },
  { beerName: "Duvel", category: "global", position: 5 },
];

const REVIEW_AUTHORS = ['Алексей', 'Мария', 'Дмитрий', 'Ольга', 'Сергей', 'Анна', 'Иван', 'Елена', 'Павел', 'Наталья', 'Михаил', 'Юлия', 'Артём', 'Виктория', 'Николай'];
const REVIEW_COMMENTS = [
  'Отличное пиво, рекомендую!',
  'Необычный вкус, но понравилось.',
  'Классика жанра, всегда стабильно.',
  'Хороший выбор для вечера с друзьями.',
  'Слишком горькое для меня, но качество на уровне.',
  'Идеальный баланс хмеля и солода.',
  'Буду заказывать ещё, одна из лучших.',
  'Не моё, но объективно хорошее пиво.',
  'Открыл для себя новый стиль благодаря этому пиву.',
  'Пьётся легко, но с характером.',
  'Идеально к барбекю.',
  'Лучшее в своей категории.',
  'Дороговато, но оно того стоит.',
  'Попробовал в путешествии, привёз домой.',
  'Покупаю регулярно уже несколько лет.',
  'Сложный вкус, раскрывается с каждой глоткой.',
];

async function main() {
  console.log('🌱 Seeding BeerID database...');

  // Check if data already exists
  const existingCount = await prisma.beer.count();
  if (existingCount > 0) {
    console.log(`Database already has ${existingCount} beers. Skipping seed.`);
    console.log('Run "bun prisma migrate reset" to reseed.');
    return;
  }

  // Seed beers
  console.log(`📦 Seeding ${SEED_BEERS.length} beers...`);
  for (const beer of SEED_BEERS) {
    await prisma.beer.create({
      data: {
        ...beer,
        source: 'seed',
      },
    });
  }

  // Seed reviews
  console.log('💬 Seeding reviews...');
  const allBeers = await prisma.beer.findMany();
  for (const beer of allBeers) {
    const numReviews = Math.floor(Math.random() * 5) + 1;
    for (let i = 0; i < numReviews; i++) {
      await prisma.review.create({
        data: {
          beerId: beer.id,
          author: REVIEW_AUTHORS[Math.floor(Math.random() * REVIEW_AUTHORS.length)],
          rating: Math.round((3 + Math.random() * 2) * 2) / 2,
          comment: REVIEW_COMMENTS[Math.floor(Math.random() * REVIEW_COMMENTS.length)],
        },
      });
    }
  }

  // Seed trending
  console.log('🔥 Seeding trending...');
  for (const t of SEED_TRENDING) {
    const beer = allBeers.find(b => b.name === t.beerName);
    if (!beer) continue;
    await prisma.trendingBeer.create({
      data: {
        beerId: beer.id,
        category: t.category,
        position: t.position,
        checkinDelta: Math.floor(Math.random() * 5000) + 100,
      },
    });
  }

  const finalCount = await prisma.beer.count();
  const reviewCount = await prisma.review.count();
  const trendingCount = await prisma.trendingBeer.count();
  console.log(`✅ Seeding complete! ${finalCount} beers, ${reviewCount} reviews, ${trendingCount} trending entries.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());