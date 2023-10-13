// Helper class to manage individual voices in the synthesizer
class Voice {
  public oscillator: OscillatorNode;
  public modulator: OscillatorNode; // for frequency modulation
  public gainNode: GainNode;
  public playing: boolean;

  constructor(
    context: AudioContext,
    frequency: number,
    modulationFrequency: number,
    modulationGain: number,
  ) {
    this.oscillator = context.createOscillator();
    this.modulator = context.createOscillator();
    this.gainNode = context.createGain();

    this.oscillator.frequency.value = frequency;
    this.modulator.frequency.value = modulationFrequency;
    this.gainNode.gain.value = modulationGain;

    // FM synthesis
    this.modulator.connect(this.gainNode);
    this.gainNode.connect(this.oscillator.frequency);
    this.oscillator.type = "sine"; // Can be changed to other types
    this.modulator.type = "sine"; // Can be changed to other types

    this.playing = false;
  }

  play(startTime: number) {
    this.oscillator.start(startTime);
    this.modulator.start(startTime);
    this.playing = true;
  }

  stop(stopTime: number) {
    this.oscillator.stop(stopTime);
    this.modulator.stop(stopTime);
    this.playing = false;
  }
}

// Main synthesizer class
export default class FMSynth {
  audioContext: AudioContext;
  voices: Voice[];
  filter: BiquadFilterNode;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.voices = [];

    // Create a filter
    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = "lowpass"; // default type
    this.filter.frequency.value = 5000; // Some default value
    // Other filter parameters can be set here
  }

  playNote(
    frequency: number,
    modulationFrequency: number,
    modulationGain: number,
    startTime: number,
  ) {
    // Create a new voice
    const voice = new Voice(
      this.audioContext,
      frequency,
      modulationFrequency,
      modulationGain,
    );

    // Connect to the filter
    voice.oscillator.connect(this.filter);

    // Then connect the filter to the context's destination
    this.filter.connect(this.audioContext.destination);

    // Play the voice
    voice.play(startTime);

    // Add the voice to the array of voices
    this.voices.push(voice);
  }

  stopNote(frequency: number, stopTime: number) {
    // Find and stop the voice with the matching frequency
    this.voices = this.voices.filter((voice) => {
      if (voice.oscillator.frequency.value === frequency && voice.playing) {
        voice.stop(stopTime);
        return false; // Remove this voice from the voices array
      }
      return true;
    });
  }

  // Method to set filter parameters
  setFilterType(type: BiquadFilterType) {
    this.filter.type = type;
  }

  setFilterFrequency(frequency: number) {
    this.filter.frequency.value = frequency;
  }

  setFilterResonance(Q: number) {
    this.filter.Q.value = Q;
  }
}
