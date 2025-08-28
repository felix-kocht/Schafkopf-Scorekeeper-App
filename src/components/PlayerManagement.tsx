import React, { useState } from 'react';
import { Plus, Trash2, Users, X } from 'lucide-react';
import { Player, PreviousPlayer } from '../types';

interface PlayerManagementProps {
  players: Player[];
  previousPlayers: PreviousPlayer[];
  onAddPlayer: (name: string, initialScore?: number) => void;
  onRemovePlayer: (index: number) => void;
  onRemovePreviousPlayer: (name: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const PlayerManagement: React.FC<PlayerManagementProps> = ({
  players,
  previousPlayers,
  onAddPlayer,
  onRemovePlayer,
  onRemovePreviousPlayer,
  isOpen,
  onClose,
}) => {
  const [newPlayerName, setNewPlayerName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    
    const playerExists = players.some(p => p.name.toLowerCase() === newPlayerName.trim().toLowerCase());
    if (playerExists) {
      alert('A player with this name already exists');
      return;
    }

    const previousPlayer = previousPlayers.find(
      p => p.name.toLowerCase() === newPlayerName.trim().toLowerCase()
    );

    if (previousPlayer) {
      const wantsToRestore = confirm(
        `${previousPlayer.name} was previously in the game with a score of ${previousPlayer.finalScore}. Would you like to add them back with their previous score?`
      );

      if (wantsToRestore) {
        onAddPlayer(previousPlayer.name, previousPlayer.finalScore);
        onRemovePreviousPlayer(previousPlayer.name);
      }
    } else {
      onAddPlayer(newPlayerName.trim());
    }

    setNewPlayerName('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-gray-700 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Player Management
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Add New Player
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Player name"
                className="flex-1 p-2 bg-gray-700/50 rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-100"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                disabled={players.length >= 12}
              >
                <Plus className="h-5 w-5" />
                Add
              </button>
            </div>
            {players.length >= 12 && (
              <p className="mt-2 text-sm text-red-400">
                Maximum number of players (12) reached
              </p>
            )}
          </div>
        </form>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Current Players</h3>
          {players.map((player, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 rounded-lg bg-gray-700/30 group hover:bg-gray-700/50 transition-colors"
            >
              <span className="text-gray-200 group-hover:text-white transition-colors">
                {player.name}
              </span>
              <button
                onClick={() => onRemovePlayer(index)}
                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                title="Remove player"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};