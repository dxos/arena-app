import React, { useMemo } from "react";
import { useValue } from "signia-react";
import { blackTimeAtom, whiteTimeAtom } from "../hooks/useTimeControl";
import { PlayerColor } from "../game";

export const Timer = ({ color }: { color: PlayerColor }) => {
  const atom = useMemo(() => (color === "white" ? whiteTimeAtom : blackTimeAtom), [color]);
  const time = useValue(atom);

  // Format the time (ms) into minutes and seconds
  const minutes = Math.floor(time / 60 / 1000);
  const seconds = Math.floor(time / 1000) - minutes * 60;

  const secondsGranular = time / 1000;

  return (
    <div className="h-min p-2 rounded-lg text-2xl leading-none font-mono text-gray-90 bg-gray-50 border border-gray-200 shadow-inner shadow-gray-100">
      {secondsGranular < 10
        ? `${secondsGranular.toFixed(2)}`
        : `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`}
    </div>
  );
};
