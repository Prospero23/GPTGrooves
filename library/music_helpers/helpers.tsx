import { type Device, createDevice, type IPatcher } from "@rnbo/js";

export function scaleValue(
  x: number,
  a: number,
  b: number,
  c: number,
  d: number,
) {
  return c + ((x - a) * (d - c)) / (b - a);
}

export function scaleExponential(
  input: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  exponent: number,
) {
  const normalizedValue = (input - inMin) / (inMax - inMin);
  const scaledExponentialValue = Math.pow(normalizedValue, exponent);
  return outMin + scaledExponentialValue * (outMax - outMin);
}

export async function setupDrum(context: AudioContext): Promise<Device> {
  const rawDrumPatcher = await fetch("export/drums/drums.export.json");
  let drumDependencies = await fetch("export/drums/dependencies.json");
  drumDependencies = await drumDependencies.json();
  const drumPatcher = await rawDrumPatcher.json();
  const drum = await createDevice({
    context,
    patcher: drumPatcher,
  });
  // @ts-expect-error this is straight from the docs
  await drum.loadDataBufferDependencies(drumDependencies);
  return drum;
}

export async function setupDevice(
  context: AudioContext,
  url: string,
): Promise<Device> {
  const rawPatcher = await fetch(`${url}`);
  const patcher: IPatcher = await rawPatcher.json();
  return await createDevice({
    context,
    patcher,
  });
}

export function setupGain(context: AudioContext, initialValue: number) {
  const gain = context.createGain();
  gain.gain.value = initialValue;
  return gain;
}

export function setupDelay(
  context: AudioContext,
  initialValue: number,
  feedbackValue: number,
  filterFrequency: number,
) {
  const delayGain = context.createGain();
  delayGain.gain.value = initialValue;
  const delay = context.createDelay(4);
  delay.delayTime.value = 0;
  const delayFeedback = context.createGain();
  delayFeedback.gain.value = feedbackValue;
  const delayFilter = context.createBiquadFilter();
  delayFilter.type = "lowpass";
  delayFilter.frequency.value = filterFrequency;

  delayGain.connect(delay);
  delay.connect(delayFeedback);
  delayFeedback.connect(delay);
  delay.connect(delayFilter);
  delayFilter.connect(context.destination);

  return { delayGain, delay, delayFeedback, delayFilter };
}
async function loadImpulseResponse(url: string, audioContext: AudioContext) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  return audioBuffer;
}

export async function setupReverb(context: AudioContext, url: string) {
  const impulseResponse = await loadImpulseResponse(url, context);
  const reverb = context.createConvolver();
  reverb.buffer = impulseResponse;
  const reverbGain = context.createGain();
  reverbGain.gain.value = 0;
  reverbGain.connect(reverb);
  reverb.connect(context.destination);
  return { reverb, reverbGain };
}

export function setupFilter(context: AudioContext): BiquadFilterNode {
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 22050;
  return filter;
}

export function safelyConnect(
  sourceNode?: AudioNode,
  destinationNode?: AudioNode,
) {
  if (sourceNode != null && destinationNode != null) {
    sourceNode.connect(destinationNode);
  } else {
    console.error("Failed to connect nodes:", { sourceNode, destinationNode });
  }
}
