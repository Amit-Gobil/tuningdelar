export const CATEGORIES = [
  { slug: 'bilar', name: 'Bilar' },
  { slug: 'motor', name: 'Motor' },
  { slug: 'turbo-kompressor', name: 'Turbo & kompressor' },
  { slug: 'avgas', name: 'Avgas' },
  { slug: 'insug-bransle', name: 'Insug & bränsle' },
  { slug: 'mjukvara-elektronik', name: 'Mjukvara & elektronik' },
  { slug: 'vaxellada-drivlina', name: 'Växellåda & drivlina' },
  { slug: 'chassi-broms', name: 'Chassi & broms' },
  { slug: 'falgar-dack', name: 'Fälgar & däck' },
  { slug: 'kaross-interior', name: 'Kaross & interiör' },
  { slug: 'ovrigt', name: 'Övrigt' }
];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);

export function categoryName(slug) {
  return CATEGORIES.find((c) => c.slug === slug)?.name || 'Övrigt';
}

export const SALE_TYPES = {
  auction: 'Auktion',
  fixed: 'Köp direkt',
  both: 'Auktion + köp direkt'
};
