import { SpeakerWaveIcon } from "@heroicons/react/24/solid";

export default function SoundControls() {
  return (
    <div className="flex flex-row items-center justify-center gap-4">
      <SpeakerWaveIcon className="h-3 w-3 text-slate-500" />
      <input
        type="range"
        min="0"
        max={240}
        className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-container]:bg-gradient-to-r
              [&::-webkit-slider-container]:from-blue-200
              [&::-webkit-slider-container]:to-transparent"
      />
    </div>
  );
}
