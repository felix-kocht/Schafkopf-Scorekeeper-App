import React from 'react';
import { Download, Trash2, RotateCcw } from 'lucide-react';
import { Player } from '../types';
import { generateCSV } from '../utils/scoreUtils';

interface ScoreHistoryProps {
  players: Player[];
  scores: number[][];
  onRemoveLastScore: () => void;
  onNewGame: () => void;
}

export const ScoreHistory: React.FC<ScoreHistoryProps> = ({
  players,
  scores,
  onRemoveLastScore,
  onNewGame,
}) => {
  const handleDownload = () => {
    const csvContent = generateCSV(
      players.map(p => p.name),
      scores
    );
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'schafkopf_scores.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 shadow-xl border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-100">Score History</h2>
        <div className="flex gap-1">
          <button
            onClick={onRemoveLastScore}
            className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
            title="Remove last round"
          >
            <Trash2 className="h-5 w-5 text-gray-400 hover:text-red-400" />
          </button>
          <button
            onClick={onNewGame}
            className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
            title="New game"
          >
            <RotateCcw className="h-5 w-5 text-gray-400 hover:text-blue-400" />
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
            title="Download scores"
          >
            <Download className="h-5 w-5 text-gray-400 hover:text-green-400" />
          </button>
        </div>
      </div>
      
      <div className="overflow-auto">
        <div className="inline-block min-w-full align-middle">
          <table className="w-full table-fixed">
            <thead>
              <tr>
                <th className="w-10 px-2 py-2 bg-gray-700/50 rounded-tl-lg text-sm sticky left-0 z-10">#</th>
                {players.map((player, i) => (
                  <th key={i} className={`px-2 py-2 bg-gray-700/50 text-sm whitespace-nowrap ${
                    i === players.length - 1 ? 'rounded-tr-lg' : ''
                  }`}>
                    {player.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {scores.map((round, roundIndex) => (
                <tr key={roundIndex} className="group">
                  <td className="px-2 py-1.5 text-center text-gray-400 text-sm group-hover:bg-gray-700/30 transition-colors sticky left-0 bg-gray-800/50 backdrop-blur-sm">
                    {roundIndex + 1}
                  </td>
                  {round.map((score, playerIndex) => (
                    <td
                      key={playerIndex}
                      className={`px-2 py-1.5 text-center text-sm group-hover:bg-gray-700/30 transition-colors ${
                        score === 0 ? 'text-gray-400' :
                        score > 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {score}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};