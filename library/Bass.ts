export default class Bass {
  audioContext: AudioContext;
  gainNode: GainNode;
  oscillator: OscillatorNode | null;
  attackTime: number;
  decayTime: number;
  sustainLevel: number;
  releaseTime: number;
  private readonly destinations: AudioNode[];

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;

    // Create a GainNode which we'll use for the ADSR envelope
    this.gainNode = this.audioContext.createGain();

    // Initial oscillator is null
    this.oscillator = null;

    // ADSR settings
    this.attackTime = 0.1; // in seconds
    this.decayTime = 0.1; // in seconds
    this.sustainLevel = 0.8; // volume level, 0 to 1
    this.releaseTime = 0.5; // in seconds

    this.destinations = [];
  }

  playNote(midi: number, time: number) {
    // Convert MIDI note to frequency
    const frequency = 440 * Math.pow(2, (midi - 69) / 12);

    // Create and configure a new oscillator
    this.oscillator = this.audioContext.createOscillator();
    this.oscillator.type = "sawtooth";
    this.oscillator.frequency.setValueAtTime(frequency, time);

    // Configure the ADSR envelope
    this.gainNode.gain.cancelScheduledValues(time);
    this.gainNode.gain.setValueAtTime(0, time); // Initial volume: 0
    this.gainNode.gain.linearRampToValueAtTime(1, time + this.attackTime); // Attack
    this.gainNode.gain.linearRampToValueAtTime(
      this.sustainLevel,
      time + this.attackTime + this.decayTime,
    ); // Decay

    // Connect the oscillator to the gainNode and start it
    this.oscillator.connect(this.gainNode);
    for (const destination of this.destinations) {
      this.gainNode.connect(destination);
    }
    this.oscillator.start();
  }

  noteOff(time: number) {
    if (this.oscillator == null) return;

    // Release phase
    this.gainNode.gain.cancelScheduledValues(time);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, time); // Hold current volume until release
    this.gainNode.gain.linearRampToValueAtTime(0, time + this.releaseTime); // Release

    this.oscillator.stop(time + this.releaseTime);
    this.oscillator = null; // Clear the oscillator
  }

  connect(destination: AudioNode) {
    // Add a new destination only if it's not the default destination
    if (destination !== this.audioContext.destination) {
      this.destinations.push(destination);
    }
  }
}
