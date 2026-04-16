import { useAtomValue } from "jotai";
import { spidermanHpAtom, venomHpAtom, gameOverAtom, winnerAtom } from "../../stores/gameStore";

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
  const venomHp = useAtomValue(venomHpAtom);
  const gameOver = useAtomValue(gameOverAtom);
  const winner = useAtomValue(winnerAtom);

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {/* Health bars at bottom */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-between px-8">
        <Bar hp={spidermanHp} name="SPIDERMAN" color="#3b82f6" side="left" />
        <Bar hp={venomHp} name="VENOM" color="#a855f7" side="right" />
      </div>

      {/* Game over overlay */}
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-auto">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white drop-shadow-lg mb-4">
              K.O.
            </h1>
            <p className="text-3xl font-semibold text-yellow-400 drop-shadow">
              {winner} Wins!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthBarHUD;
