import { genreForGame } from '../data/genreProfiles.js';

export function classifyGame(game = '') {
  const genre = genreForGame(game);
  return {
    game: game || 'Tarkov / Siege / COD',
    genreId: genre.id,
    genreLabel: genre.label,
    priorities: genre.priorities,
    targetBands: genre.targetBands,
    caution: genre.caution
  };
}
