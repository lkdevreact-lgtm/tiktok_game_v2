import { useAtomValue, useSetAtom, useAtom } from "jotai";
import {
  userHeroHpAtom,
  venomHpAtom,
  gameOverAtom,
  winnerAtom,
  gameState,
  MAX_PLAYS,
  playCountAtom,
  fullRestartAtom,
} from "../../stores/gameStore";
import { AiFillSetting } from "react-icons/ai";


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
  const spidermanHp = useAtomValue(userHeroHpAtom);
  const gameOver = useAtomValue(gameOverAtom);
  const winner = useAtomValue(winnerAtom);
  const setSpidermanHp = useSetAtom(userHeroHpAtom);
  const setVenomHp = useSetAtom(venomHpAtom);
  const setGameOver = useSetAtom(gameOverAtom);
  const setWinner = useSetAtom(winnerAtom);
  const [playCount, setPlayCount] = useAtom(playCountAtom);
  const setFullRestart = useSetAtom(fullRestartAtom);

  const remainingPlays = MAX_PLAYS - playCount;
  const canPlayAgain = remainingPlays > 0;

  const handlePlayAgain = () => {
    if (!canPlayAgain) return;
    // Increment play count
    setPlayCount((prev) => prev + 1);
    // Reset atoms
    setSpidermanHp(100);
    setVenomHp(100);
    setGameOver(false);
    setWinner(null);
    // Reset mutable game state (keep venoms alive — just reset their attack state)
    gameState.spiderman.isAttacking = false;
    gameState.spiderman.attackType = null;
    gameState.spiderman.hitDealt = false;
    // NOTE: Don't clear venoms — keep them across rounds
  };

  const handleFullRestart = () => {
    // Reset play count
    setPlayCount(0);
    // Reset atoms
    setSpidermanHp(100);
    setVenomHp(100);
    setGameOver(false);
    setWinner(null);
    // Reset mutable game state + clear all venoms
    gameState.spiderman.isAttacking = false;
    gameState.spiderman.attackType = null;
    gameState.spiderman.hitDealt = false;
    gameState.venoms.length = 0;
    // Signal full restart to GameSence
    setFullRestart(true);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      <div className="absolute top-4 left-5"></div>
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
          <span className="text-white/70 text-xs">KickUp</span>
        </div>
        <div className="w-px bg-white/20" />
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-purple-500/40 rounded text-white text-xs font-bold">E</kbd>
          <span className="text-white/70 text-xs">HookPunch</span>
        </div>
        <div className="w-px bg-white/20" />
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-blue-500/40 rounded text-white text-xs font-bold">Space</kbd>
          <span className="text-white/70 text-xs">Jump</span>
        </div>
      </div>

      {/* Round counter (always visible) */}
      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/10">
        <span className="text-white/80 text-xs font-semibold">
          Round {playCount + 1} / {MAX_PLAYS}
        </span>
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
            <p className="text-3xl font-semibold text-yellow-400 drop-shadow mb-4">
              {winner} Wins!
            </p>

            {/* Round info */}
            <p className="text-white/70 text-sm mb-6">
              {canPlayAgain
                ? `Round ${playCount + 1} / ${MAX_PLAYS} — ${remainingPlays} play${remainingPlays > 1 ? "s" : ""} remaining`
                : "All rounds completed!"}
            </p>

            {canPlayAgain ? (
              <button
                onClick={handlePlayAgain}
                className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xl rounded-full transition-all duration-200 hover:scale-110 shadow-lg shadow-yellow-500/50"
              >
                Play Again ({remainingPlays} left)
              </button>
            ) : (
              <button
                onClick={handleFullRestart}
                className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xl rounded-full transition-all duration-200 hover:scale-110 shadow-lg shadow-red-600/50"
              >
                Restart Game
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthBarHUD;
