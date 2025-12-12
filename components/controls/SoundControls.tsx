"use client";
import { SpeakerWaveIcon, SpeakerXMarkIcon } from "@heroicons/react/24/solid";
import { usePlayerStore } from "@/store/player-store";

export default function SoundControls() {
  const volume = usePlayerStore((state) => state.volume);
  const setVolume = usePlayerStore((state) => state.setVolume);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const toggleMute = () => {
    setVolume(volume === 0 ? 0.5 : 0);
  };

  return (
    <div className="flex flex-row items-center gap-3 group">
      <button
        onClick={toggleMute}
        className="text-base-content/70 hover:text-primary transition-colors"
      >
        {volume === 0 ? (
          <SpeakerXMarkIcon className="h-5 w-5" />
        ) : (
          <SpeakerWaveIcon className="h-5 w-5" />
        )}
      </button>

      <div className="relative flex items-center w-24 h-6">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="range range-xs range-primary w-full"
        />
      </div>
    </div>
  );
}
