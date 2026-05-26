export function detectChatGameSplit({
  gameOutput = '',
  discordOutput = '',
  streamOutput = ''
}: Record<string, string> = {}) {
  const outputs = [gameOutput, discordOutput, streamOutput].filter(Boolean).map((item) => item.toLowerCase());
  const unique = new Set(outputs);
  return {
    id: 'chat-game-split',
    split: unique.size > 1,
    warning: unique.size > 1
      ? 'Game, Discord, and stream audio may be using different endpoints.'
      : null
  };
}
