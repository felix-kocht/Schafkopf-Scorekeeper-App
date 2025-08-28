import { supabase } from './supabase';
import { Player } from '../types';

interface GameData {
  players: Player[];
  scores: number[][];
}

export async function saveGame(players: Player[], scores: number[][]) {
  const { error } = await supabase
    .from('games')
    .insert({
      players: players,
      scores: scores
    });
  
  if (error) throw error;
}

export async function loadGames() {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function updateGame(id: string, players: Player[], scores: number[][]) {
  const { error } = await supabase
    .from('games')
    .update({
      players,
      scores,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);
  
  if (error) throw error;
}

export async function deleteGame(id: string) {
  const { error } = await supabase
    .from('games')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}