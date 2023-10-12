/* eslint-disable react/no-unknown-property */
"use client";
import { useState, useEffect } from "react";

import { Vector3 } from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Plane } from "@react-three/drei";

import Button from "./assets/Button";
import Next from "@/app/components/assets/Next";
import Prev from "@/app/components/assets/Prev";
import Date from "@/app/components/assets/Date";
import Author from "@/app/components/assets/Author";
import Album from "@/app/components/assets/Album";
import PlayState from "@/app/components/assets/PlayState";
import UserToggle from "./assets/UserToggle";
import EffectSliders from "./assets/EffectSliders";
import useAudioScheduler from "./useAudioScheduler";

import { type SongType } from "@/library/musicData";

interface GenDate {
  day: number;
  month: string;
  year: number;
}

export default function Scene({
  songs,
  dates,
}: {
  songs: SongType[];
  dates: GenDate[];
}) {
  const [isUserEffects, setIsUserEffects] = useState<boolean>(false);
  const [orbitEndabled, setOrbitEnabled] = useState<boolean>(true);

  const {
    isPlaying,
    setIsPlaying,
    currentSong,
    setCurrentSong,
    setFilterFrequency,
    setDelayFeedback,
    setDelayTime,
    setReverbLevel,
    switchEffectsGen,
    init,
  } = useAudioScheduler({ songs }); // TODO: just move all of these functions to the child components

  const numberDates = dates.length; // number of dates
  useEffect(() => {
    switchEffectsGen(isUserEffects);
  }, [isUserEffects, switchEffectsGen]);

  return (
    <>
      <button
        onClick={async () => {
          await init();
        }}
      >
        SUP
      </button>
      <Canvas camera={{ position: [0, 11, 13.6], fov: 75 }} linear flat shadows>
        <Plane
          rotation={[(Math.PI * 3) / 2, 0, 0]}
          scale={40}
          position={[0, -0.1, -10]}
          receiveShadow
        >
          <meshLambertMaterial color={"white"} emissive={"white"} />
        </Plane>
        <directionalLight
          position={[0, 20, 10]}
          intensity={1.0}
          castShadow
          color={"white"}
        />
        <OrbitControls makeDefault enabled={orbitEndabled} />
        <Button
          position={new Vector3(0, 0, 0)}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
        />
        <Date month={dates[currentSong].month} day={dates[currentSong].day} />
        <Author />
        <Album year={dates[currentSong].year} />
        <Next
          setCurrentSong={setCurrentSong}
          currentSong={currentSong}
          setIsPlaying={setIsPlaying}
        />
        <Prev
          setCurrentSong={setCurrentSong}
          currentSong={currentSong}
          numberDates={numberDates}
          setIsPlaying={setIsPlaying}
        />
        <PlayState isPlaying={isPlaying} />
        <UserToggle
          userActions={isUserEffects}
          setUserActions={setIsUserEffects}
        />
        <EffectSliders
          count={4}
          visible={isUserEffects}
          setOrbitEndabled={setOrbitEnabled}
          setFilterFreq={setFilterFrequency}
          setDelayFeedback={setDelayFeedback}
          setDelayTime={setDelayTime}
          setReverbLevel={setReverbLevel}
        />
      </Canvas>
    </>
  );
}
