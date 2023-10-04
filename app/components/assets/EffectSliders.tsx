import {
  type ChangeEvent,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { Html } from "@react-three/drei";

interface SliderProps {
  count: number;
  visible: boolean;
  setOrbitEndabled: Dispatch<SetStateAction<boolean>>;
  setFilterFreq: (value: number) => void;
  setDelayFeedback: (value: number) => void;
  setDelayTime: (value: number) => void;
  setReverbLevel: (value: number) => void;
}

export default function EffectSliders({
  count,
  visible,
  setOrbitEndabled,
  setFilterFreq,
  setDelayFeedback,
  setDelayTime,
  setReverbLevel,
}: SliderProps) {
  // Initialize an array of size 'count' with all zeros
  const [values, setValues] = useState<number[]>(Array(count).fill(100));

  function handleChange(e: ChangeEvent<HTMLInputElement>, index: number) {
    const updatedValues = [...values];
    updatedValues[index] = Number(e.target.value);
    setValues(updatedValues);
    setOrbitEndabled(false);
    e.stopPropagation();
    if (index === 0) {
      setFilterFreq(Number(e.target.value));
    }
    if (index === 1) {
      setDelayFeedback(Number(e.target.value));
    }
    if (index === 2) {
      setDelayTime(Number(e.target.value));
    }
    if (index === 3) {
      setReverbLevel(Number(e.target.value));
    }
  }

  function handleDown() {
    setOrbitEndabled(false);
  }
  function handleUp() {
    setOrbitEndabled(true);
  }
  const show = visible ? "flex" : "hidden";

  return (
    <>
      {values.map((value, index) => (
        <Html
          key={index}
          transform
          rotation={[(Math.PI * 3) / 2, 0, 0]}
          position={[0, 0, 3 + index]}
          visible={false}
        >
          <div className={`text-black flex-center ${show}`}>
            <label htmlFor={`effect-${index}`} className="">
              {`Effect ${index + 1}`}
            </label>
            <input
              className="cursor-pointer"
              type="range"
              name={`effect-${index}`}
              id={`effect-${index}`}
              onChange={(e) => {
                handleChange(e, index);
              }}
              value={value}
              onPointerDown={handleDown}
              onPointerUp={handleUp}
            />
            <p>{value}</p>
          </div>
        </Html>
      ))}
    </>
  );
}
// filter, delay
