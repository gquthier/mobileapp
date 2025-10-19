// ============================================================================
// Chapter Colors Palette
// Description: Palette de 20 couleurs pour les chapitres
// ============================================================================

export const CHAPTER_COLORS = [
  '#FF6B6B', // Rouge corail
  '#4ECDC4', // Turquoise
  '#45B7D1', // Bleu ciel
  '#FFA07A', // Saumon
  '#98D8C8', // Menthe
  '#F7DC6F', // Jaune or
  '#BB8FCE', // Lavande
  '#85C1E2', // Bleu poudre
  '#F8B195', // Pêche
  '#F67280', // Rose corail
  '#C06C84', // Rose mauve
  '#6C5B7B', // Violet profond
  '#355C7D', // Bleu marine
  '#99B898', // Vert sauge
  '#FECEAB', // Beige rosé
  '#FF847C', // Corail vif
  '#E84A5F', // Rouge framboise
  '#2A363B', // Gris anthracite
  '#A8E6CF', // Vert menthe clair
  '#FFD3B6', // Pêche clair
];

/**
 * Retourne une couleur aléatoire de la palette
 */
export function getRandomChapterColor(): string {
  const randomIndex = Math.floor(Math.random() * CHAPTER_COLORS.length);
  return CHAPTER_COLORS[randomIndex];
}

/**
 * Vérifie si une couleur est valide (existe dans la palette)
 */
export function isValidChapterColor(color: string): boolean {
  return CHAPTER_COLORS.includes(color.toUpperCase());
}
