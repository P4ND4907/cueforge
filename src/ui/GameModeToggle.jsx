import { useState } from 'react';
import { Gamepad2 } from 'lucide-react';
import { getPerformanceProfile, setPerformanceProfile } from '../settings/performanceSettings.js';

export default function GameModeToggle() {
  const [profile, setProfile] = useState(() => getPerformanceProfile());
  const gameMode = profile === 'game';

  const toggleGameMode = () => {
    const next = gameMode ? 'balanced' : 'game';
    setPerformanceProfile(next);
    document.body.classList.toggle('game-mode', next === 'game');
    setProfile(next);
  };

  return (
    <button onClick={toggleGameMode} className={`game-toggle ${gameMode ? 'active' : ''}`} type="button">
      <Gamepad2 size={18} />
      Game Mode {gameMode ? 'ON' : 'OFF'}
    </button>
  );
}
