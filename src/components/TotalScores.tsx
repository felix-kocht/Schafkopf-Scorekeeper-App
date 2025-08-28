import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Player, PreviousPlayer } from '../types';
import { calculateTotalScores } from '../utils/scoreUtils';
import { useSettings } from '../contexts/SettingsContext';

interface TotalScoresProps {
  players: Player[];
  scores: number[][];
  previousPlayers: PreviousPlayer[];
}

export const TotalScores: React.FC<TotalScoresProps> = ({ 
  players, 
  scores,
  previousPlayers 
}) => {
  const { settings } = useSettings();
  const totalScores = calculateTotalScores(scores, players.length);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 shadow-xl border border-gray-700">
      <h2 className="text-xl font-semibold mb-2 text-gray-100">Total Scores</h2>
      <div className="space-y-2">
        {/* Active Players */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {players.map((player, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-700/30 p-2 rounded-lg group hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-gray-200 group-hover:text-white transition-colors truncate">
                  {player.name}
                </span>
                {settings.enableYellowCards && player.yellowCard && (
                  <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                )}
              </div>
              <span className={`ml-2 tabular-nums ${
                totalScores[i] === 0 ? 'text-gray-400' :
                totalScores[i] > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {totalScores[i] || 0}
              </span>
            </div>
          ))}
        </div>

        {/* Previous Players */}
        {previousPlayers.length > 0 && (
          <>
            <div className="border-t border-gray-700 my-4"></div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Previous Players</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {previousPlayers.map((player, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-700/10 p-2 rounded-lg">
                  <span className="text-gray-400 truncate">
                    {player.name}
                  </span>
                  <span className={`ml-2 tabular-nums ${
                    player.finalScore === 0 ? 'text-gray-500' :
                    player.finalScore > 0 ? 'text-green-500/70' : 'text-red-500/70'
                  }`}>
                    {player.finalScore}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};