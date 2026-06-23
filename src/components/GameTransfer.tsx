import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, QrCode, X } from 'lucide-react';
import QRCode from 'qrcode';
import type { Html5Qrcode } from 'html5-qrcode';
import { GameStateTransferData, Player, PreviousPlayer, Settings } from '../types';
import { createGameStatePayload, parseGameStatePayload } from '../utils/gameStateTransfer';

interface GameTransferProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  scores: number[][];
  previousPlayers: PreviousPlayer[];
  settings: Settings;
  onImport: (gameState: GameStateTransferData) => void;
  showExport?: boolean;
}

const scannerElementId = 'game-state-qr-scanner';

export const GameTransfer: React.FC<GameTransferProps> = ({
  isOpen,
  onClose,
  players,
  scores,
  previousPlayers,
  settings,
  onImport,
  showExport = true,
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [exportError, setExportError] = useState('');
  const [scanError, setScanError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [pendingImport, setPendingImport] = useState<GameStateTransferData | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const gameStatePayload = useMemo(
    () => createGameStatePayload({ players, scores, previousPlayers, settings }),
    [players, scores, previousPlayers, settings]
  );

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;

    if (!scanner) return;

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      scanner.clear();
    } catch {
      // The scanner may already be stopped by the browser when permissions change.
    } finally {
      scannerRef.current = null;
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !showExport) return;

    setQrCodeUrl('');
    setExportError('');

    QRCode.toDataURL(gameStatePayload, {
      errorCorrectionLevel: 'L',
      margin: 2,
      width: 320,
    })
      .then(setQrCodeUrl)
      .catch(() => {
        setExportError('This game state is too large for one QR code.');
      });
  }, [gameStatePayload, isOpen, showExport]);

  useEffect(() => {
    if (!isOpen) {
      setPendingImport(null);
      setScanError('');
      void stopScanner();
    }

    return () => {
      void stopScanner();
    };
  }, [isOpen, stopScanner]);

  if (!isOpen) return null;

  const startScanner = async () => {
    setPendingImport(null);
    setScanError('');

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(scannerElementId);
      scannerRef.current = scanner;
      setIsScanning(true);

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          try {
            const gameState = parseGameStatePayload(decodedText);
            setPendingImport(gameState);
            setScanError('');
            await stopScanner();
          } catch (error) {
            setScanError(error instanceof Error ? error.message : 'The QR code could not be imported.');
          }
        },
        undefined
      );
    } catch {
      scannerRef.current = null;
      setIsScanning(false);
      setScanError('Camera access failed. Check browser permissions and try again.');
    }
  };

  const handleImport = () => {
    if (!pendingImport) return;

    onImport(pendingImport);
    setPendingImport(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-gray-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {showExport ? 'Game Transfer' : 'Import Game'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-6">
          {showExport && (
            <section>
              <h3 className="text-sm font-medium text-gray-300 mb-3">Export</h3>
              <div className="flex justify-center rounded-lg bg-white p-3">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="Game state QR code" className="h-80 w-80" />
                ) : (
                  <div className="h-80 w-80 flex items-center justify-center text-sm text-gray-500">
                    {exportError || 'Generating QR code...'}
                  </div>
                )}
              </div>
              {exportError && (
                <p className="mt-2 text-sm text-red-400">{exportError}</p>
              )}
            </section>
          )}

          <section className={showExport ? 'border-t border-gray-700 pt-6' : ''}>
            <h3 className="text-sm font-medium text-gray-300 mb-3">Import</h3>
            <div id={scannerElementId} className="overflow-hidden rounded-lg bg-gray-900/70" />
            {scanError && (
              <p className="mt-2 text-sm text-red-400">{scanError}</p>
            )}
            {pendingImport && (
              <div className="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span>
                    {pendingImport.players.length} players, {pendingImport.scores.length} rounds, {pendingImport.previousPlayers.length} previous players
                  </span>
                </div>
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={startScanner}
                disabled={isScanning}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Camera className="h-5 w-5" />
                Scan QR
              </button>
              {isScanning && (
                <button
                  type="button"
                  onClick={() => void stopScanner()}
                  className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Stop
                </button>
              )}
            </div>
            {pendingImport && (
              <button
                type="button"
                onClick={handleImport}
                className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Import Game State
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
