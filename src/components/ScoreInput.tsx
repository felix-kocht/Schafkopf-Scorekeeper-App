import React from 'react';
import { AlertTriangle, Plus, Minus } from 'lucide-react';
import { ScoreInputProps } from '../types';
import { balanceScores, generateRedCardScores, isValidScore } from '../utils/scoreUtils';
import { useSettings } from '../contexts/SettingsContext';

export const ScoreInput: React.FC<ScoreInputProps> = ({
  players,
  onSubmit,
  onYellowCard,
  onSittingOutChange,
}) => {
  const { settings } = useSettings();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const scores = players.map((_, index) => 
      Number(formData.get(`score-${index}`) || 0)
    );

    const sittingOutIndices = players
      .map((player, index) => player.sittingOut ? index : -1)
      .filter(index => index !== -1);

    // Check if all non-zero scores are multiples of minimumUnit
    const hasInvalidScores = scores.some((score, index) => 
      !sittingOutIndices.includes(index) && 
      score !== 0 && 
      !isValidScore(score, settings.minimumUnit)
    );

    if (hasInvalidScores) {
      alert(`Scores must be multiples of ${settings.minimumUnit}`);
      return;
    }

    if (!settings.zeroSumMode) {
      const { scores: balancedScores, isValid } = balanceScores(scores, sittingOutIndices, settings.minimumUnit);
      
      if (!isValid) {
        alert(`Cannot balance scores as multiples of ${settings.minimumUnit}`);
        return;
      }

      const totalScore = balancedScores.reduce((sum, score) => sum + score, 0);
      if (Math.abs(totalScore) > 0.01) {
        alert('Scores must sum to zero');
        return;
      }

      onSubmit(balancedScores);
    } else {
      onSubmit(scores);
    }
    
    event.currentTarget.reset();
  };

  const handleScoreAdjust = (
    event: React.MouseEvent,
    inputElement: HTMLInputElement,
    adjustment: number
  ) => {
    event.preventDefault();
    const currentValue = Number(inputElement.value) || 0;
    inputElement.value = String(currentValue + adjustment);
  };

  const handleYellowCardClick = async (playerIndex: number) => {
    if (!settings.enableYellowCards) return;

    if (players[playerIndex].yellowCard) {
      if (confirm('Player already has a yellow card. Issue a red card and apply penalty?')) {
        const redCardScores = generateRedCardScores(playerIndex, players.length, settings.redCardPenalty);
        onSubmit(redCardScores);
      }
    }
    onYellowCard(playerIndex);
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-100">Active Round</h2>
        <p className="text-sm text-gray-400">Check box for players being skipped</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {players.map((player, i) => (
          <div key={i} className="flex items-center gap-2 group">
            <input
              type="checkbox"
              checked={player.sittingOut}
              onChange={() => onSittingOutChange(i, !player.sittingOut)}
              className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
            />
            <span className="flex-1 text-gray-200 group-hover:text-white transition-colors">
              {player.name}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  const input = document.querySelector(`input[name="score-${i}"]`) as HTMLInputElement;
                  handleScoreAdjust(e, input, -settings.minimumUnit);
                }}
                className="p-2 h-[42px] rounded bg-gray-700 hover:bg-gray-600 transition-colors"
                disabled={player.sittingOut}
              >
                <Minus className="h-5 w-5" />
              </button>
              <input
                type="number"
                name={`score-${i}`}
                disabled={player.sittingOut}
                className="w-16 p-2 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                placeholder="0"
                step={settings.minimumUnit}
              />
              <button
                type="button"
                onClick={(e) => {
                  const input = document.querySelector(`input[name="score-${i}"]`) as HTMLInputElement;
                  handleScoreAdjust(e, input, settings.minimumUnit);
                }}
                className="p-2 h-[42px] rounded bg-gray-700 hover:bg-gray-600 transition-colors"
                disabled={player.sittingOut}
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            {settings.enableYellowCards && (
              <button
                type="button"
                onClick={() => handleYellowCardClick(i)}
                className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                title="Toggle yellow card"
              >
                <AlertTriangle className={`h-5 w-5 ${player.yellowCard ? 'text-yellow-500' : 'text-gray-400'}`} />
              </button>
            )}
          </div>
        ))}
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 py-3 px-4 rounded-lg font-medium transition-colors"
        >
          Submit Scores
        </button>
      </form>
    </div>
  );
};