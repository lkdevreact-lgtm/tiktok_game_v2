import { useAtomValue, useSetAtom } from "jotai";
import { spidermanHpAtom, venomHpAtom, gameOverAtom, winnerAtom, gameState } from "../../stores/gameStore";

const Bar = ({ hp, name, color, side }) => {
  const percent = Math.max(0, Math.min(100, hp));
  const barColor = percent > 50 ? color : percent > 25 ? "#f59e0b" : "#ef4444";

  return (
    <div className={`flex flex-col ${side === "right" ? "items-end" : "items-start"}`}>
      <span className="text-white text-sm font-bold mb-1 drop-shadow-lg">
        {name}
      </span>
      <div className="w-56 h-5 bg-black/60 rounded-full border-2 border-white/30 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percent}%`,
            background: `linear-gradient(180deg, ${barColor}, ${barColor}88)`,
            boxShadow: `0 0 10px ${barColor}88`,
            marginLeft: side === "right" ? "auto" : undefined,
          }}
        />
      </div>
      <span className="text-white/80 text-xs mt-1 drop-shadow">
        {Math.round(hp)} / 100
      </span>
    </div>
  );
};

const HealthBarHUD = () => {
  const spidermanHp = useAtomValue(spidermanHpAtom);
  const gameOver = useAtomValue(gameOverAtom);
  const winner = useAtomValue(winnerAtom);
  const setSpidermanHp = useSetAtom(spidermanHpAtom);
  const setVenomHp = useSetAtom(venomHpAtom);
  const setGameOver = useSetAtom(gameOverAtom);
  const setWinner = useSetAtom(winnerAtom);

  const handlePlayAgain = () => {
    // Reset atoms
    setSpidermanHp(100);
    setVenomHp(100);
    setGameOver(false);
    setWinner(null);
    // Reset mutable game state
    gameState.spiderman.isAttacking = false;
    gameState.spiderman.attackType = null;
    gameState.spiderman.hitDealt = false;
    gameState.venom.hp = 100;
    gameState.venom.isAttacking = false;
    gameState.venom.attackType = null;
    gameState.venom.hitDealt = false;
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {/* Combat guide */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-4 bg-black/40 backdrop-blur-sm rounded-lg px-5 py-2 border border-white/10">
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-white text-xs font-bold">W</kbd>
            <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-white text-xs font-bold">A</kbd>
            <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-white text-xs font-bold">S</kbd>
            <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-white text-xs font-bold">D</kbd>
          </div>
          <span className="text-white/70 text-xs">Move</span>
        </div>
        <div className="w-px bg-white/20" />
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-red-500/40 rounded text-white text-xs font-bold">Q</kbd>
          <span className="text-white/70 text-xs">Punch</span>
        </div>
        <div className="w-px bg-white/20" />
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-orange-500/40 rounded text-white text-xs font-bold">R</kbd>
          <span className="text-white/70 text-xs">Kick</span>
        </div>
        <div className="w-px bg-white/20" />
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-pink-500/40 rounded text-white text-xs font-bold">F</kbd>
          <span className="text-white/70 text-xs">KickMMA</span>
        </div>
        <div className="w-px bg-white/20" />
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-purple-500/40 rounded text-white text-xs font-bold">E</kbd>
          <span className="text-white/70 text-xs">ComboPunch</span>
        </div>
        <div className="w-px bg-white/20" />
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-blue-500/40 rounded text-white text-xs font-bold">Space</kbd>
          <span className="text-white/70 text-xs">Jump</span>
        </div>
      </div>

      {/* Health bar at bottom */}
      <div className="absolute bottom-6 left-0 right-0 flex px-8">
        <Bar hp={spidermanHp} name="SPIDERMAN" color="#3b82f6" side="left" />
      </div>

      {/* Game over overlay */}
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-auto">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white drop-shadow-lg mb-4">
              K.O.
            </h1>
            <p className="text-3xl font-semibold text-yellow-400 drop-shadow mb-8">
              {winner} Wins!
            </p>
            <button
              onClick={handlePlayAgain}
              className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xl rounded-full transition-all duration-200 hover:scale-110 shadow-lg shadow-yellow-500/50"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthBarHUD;
