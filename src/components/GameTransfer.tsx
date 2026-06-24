import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, ChevronLeft, ChevronRight, QrCode, X } from 'lucide-react';
import QRCode from 'qrcode';
import type { Html5Qrcode } from 'html5-qrcode';
import { GameStateTransferData, Player, PreviousPlayer, Settings } from '../types';
import {
  combineGameStatePayloadChunks,
  createGameStatePayloads,
  parseGameStatePayload,
  parseGameStatePayloadChunk,
  type GameStatePayloadChunk,
} from '../utils/gameStateTransfer';

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

const getResponsiveQrBox = (viewfinderWidth: number, viewfinderHeight: number) => {
  const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
  const maxEdge = Math.max(1, minEdge - 16);
  const preferredEdge = Math.floor(minEdge * 0.92);
  const edge = Math.floor(Math.min(Math.max(preferredEdge, 280), 420, maxEdge));

  return { width: edge, height: edge };
};

const preferredCameraConstraints: MediaTrackConstraints = {
  facingMode: { ideal: 'environment' },
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  frameRate: { ideal: 15, max: 30 },
};

const fallbackCameraConstraints: MediaTrackConstraints[] = [
  { facingMode: 'environment' },
  { facingMode: { ideal: 'environment' } },
  {},
];

const scannerConfig = {
  fps: 12,
  qrbox: getResponsiveQrBox,
  disableFlip: true,
};

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
  const [qrCodeUrls, setQrCodeUrls] = useState<string[]>([]);
  const [activeQrIndex, setActiveQrIndex] = useState(0);
  const [exportError, setExportError] = useState('');
  const [scanError, setScanError] = useState('');
  const [scanStatus, setScanStatus] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [pendingImport, setPendingImport] = useState<GameStateTransferData | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedChunksRef = useRef<GameStatePayloadChunk[]>([]);

  const gameStatePayloads = useMemo(
    () => createGameStatePayloads({ players, scores, previousPlayers, settings }),
    [players, scores, previousPlayers, settings]
  );

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;

    if (!scanner) {
      setIsScanning(false);
      return;
    }

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

    setQrCodeUrls([]);
    setActiveQrIndex(0);
    setExportError('');

    Promise.all(
      gameStatePayloads.map(payload =>
        QRCode.toDataURL(payload, {
          errorCorrectionLevel: 'L',
          margin: 2,
          width: 320,
        })
      )
    )
      .then(setQrCodeUrls)
      .catch(() => {
        setExportError('This game state could not be converted to QR codes.');
      });
  }, [gameStatePayloads, isOpen, showExport]);

  useEffect(() => {
    if (!isOpen) {
      setPendingImport(null);
      setScanError('');
      setScanStatus('');
      scannedChunksRef.current = [];
      void stopScanner();
    }

    return () => {
      void stopScanner();
    };
  }, [isOpen, stopScanner]);

  if (!isOpen) return null;

  const activeQrCodeUrl = qrCodeUrls[activeQrIndex];
  const showExportSection = showExport && !isScanning;

  const processScannedPayload = (decodedText: string) => {
    try {
      const payloadChunk = parseGameStatePayloadChunk(decodedText);

      if (payloadChunk) {
        const existingChunks = scannedChunksRef.current.every(
          chunk => chunk.id === payloadChunk.id && chunk.total === payloadChunk.total
        )
          ? scannedChunksRef.current
          : [];
        const nextChunks = [
          ...existingChunks.filter(chunk => chunk.index !== payloadChunk.index),
          payloadChunk,
        ].sort((a, b) => a.index - b.index);

        scannedChunksRef.current = nextChunks;

        if (nextChunks.length === payloadChunk.total) {
          const gameState = parseGameStatePayload(combineGameStatePayloadChunks(nextChunks));
          setPendingImport(gameState);
          setScanError('');
          setScanStatus('');
          scannedChunksRef.current = [];
          void stopScanner();
          return;
        }

        setScanError('');
        setScanStatus(`Scanned ${nextChunks.length} of ${payloadChunk.total} QR codes.`);
        return;
      }

      const gameState = parseGameStatePayload(decodedText);
      setPendingImport(gameState);
      setScanError('');
      setScanStatus('');
      scannedChunksRef.current = [];
      void stopScanner();
    } catch (error) {
      setScanStatus('');
      setScanError(error instanceof Error ? error.message : 'The QR code could not be imported.');
    }
  };

  const startScanner = async () => {
    setPendingImport(null);
    setScanError('');
    setScanStatus('');
    scannedChunksRef.current = [];
    setIsScanning(true);

    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      const cameraCandidates = [preferredCameraConstraints, ...fallbackCameraConstraints];
      let lastStartError: unknown;

      for (const cameraCandidate of cameraCandidates) {
        const scanner = new Html5Qrcode(scannerElementId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        });
        scannerRef.current = scanner;

        try {
          await scanner.start(
            cameraCandidate,
            scannerConfig,
            processScannedPayload,
            undefined
          );
          return;
        } catch (error) {
          lastStartError = error;

          try {
            if (scanner.isScanning) {
              await scanner.stop();
            }
            scanner.clear();
          } catch {
            // Keep trying simpler camera constraints.
          }

          if (scannerRef.current === scanner) {
            scannerRef.current = null;
          }
        }
      }

      throw lastStartError;
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
          {showExportSection && (
            <section>
              <h3 className="text-sm font-medium text-gray-300 mb-3">Export</h3>
              <div className="flex justify-center rounded-lg bg-white p-3">
                {activeQrCodeUrl ? (
                  <img
                    src={activeQrCodeUrl}
                    alt={`Game state QR code ${activeQrIndex + 1} of ${qrCodeUrls.length}`}
                    className="h-80 w-80"
                  />
                ) : (
                  <div className="h-80 w-80 flex items-center justify-center text-sm text-gray-500">
                    {exportError || 'Generating QR code...'}
                  </div>
                )}
              </div>
              {qrCodeUrls.length > 1 && (
                <>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveQrIndex(index => Math.max(0, index - 1))}
                      disabled={activeQrIndex === 0}
                      aria-label="Previous QR code"
                      className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5 text-gray-200" />
                    </button>
                    <span className="text-sm text-gray-300">
                      QR {activeQrIndex + 1} of {qrCodeUrls.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveQrIndex(index => Math.min(qrCodeUrls.length - 1, index + 1))}
                      disabled={activeQrIndex === qrCodeUrls.length - 1}
                      aria-label="Next QR code"
                      className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <ChevronRight className="h-5 w-5 text-gray-200" />
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    Scan all QR codes in any order to import larger game states.
                  </p>
                </>
              )}
              {exportError && (
                <p className="mt-2 text-sm text-red-400">{exportError}</p>
              )}
            </section>
          )}

          <section className={showExportSection ? 'border-t border-gray-700 pt-6' : ''}>
            <h3 className="text-sm font-medium text-gray-300 mb-3">Import</h3>
            <div
              id={scannerElementId}
              className={`overflow-hidden rounded-lg bg-gray-900/70 ${isScanning ? 'min-h-80' : ''}`}
            />
            {scanStatus && (
              <p className="mt-2 text-sm text-gray-300">{scanStatus}</p>
            )}
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
