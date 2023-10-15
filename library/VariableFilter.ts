export default class VariableFilter {
  private readonly context: AudioContext;
  private readonly filters: Record<string, BiquadFilterNode>;
  private readonly gains: Record<string, GainNode>;
  private readonly inputGain: GainNode; // New GainNode to act as input
  private readonly masterGain: GainNode;

  constructor(context: AudioContext) {
    this.context = context;

    this.filters = {};
    this.gains = {};

    // Create input gain (acting as an input point)
    this.inputGain = this.context.createGain();

    // Create master gain (acting as a mixer)
    this.masterGain = this.context.createGain();

    // Define the types of filters you plan to use
    const types: BiquadFilterType[] = ["lowpass", "highpass", "bandpass"];

    types.forEach((type) => {
      const filter = this.context.createBiquadFilter();
      filter.type = type;

      const gain = this.context.createGain();
      gain.gain.value = 0; // Initially silent

      // Connect the input to each filter
      this.inputGain.connect(filter);

      filter.connect(gain); // Connect this filter through a gain node
      gain.connect(this.masterGain); // Connect the gain node to the master gain

      this.filters[type] = filter;
      this.gains[type] = gain;
    });

    // Set one of the filter gains to 1 as default so sound will pass through
    this.gains.lowpass.gain.value = 1;
  }

  // Method to "switch" filters by changing the gain
  switchFilter(type: BiquadFilterType, audioContextTime: number) {
    // Fade out all filters
    Object.values(this.gains).forEach((gain) => {
      gain.gain.setValueAtTime(0, audioContextTime);
    });

    // Fade in the selected filter
    this.gains[type].gain.setValueAtTime(1, audioContextTime);
  }

  changeFrequency(
    normalizedValue: number,
    filterType: string,
    audioContextTime: number,
  ) {
    // Define the frequency range (in Hz) that the filter will operate over
    // For example: 20Hz - 20000Hz (which are common values for human hearing)
    const minFreq = 20;
    const maxFreq = 20000;
    const currentFilter = this.filters[filterType];

    // Calculate the exponential scale factor
    const scaleFactor = Math.log(maxFreq / minFreq);

    // Calculate the frequency from the normalized value
    let frequency;
    if (filterType === "lowpass") {
      // For lowpass, 1 is very low freq and 0 is very high freq
      frequency = minFreq * Math.exp(scaleFactor * (1 - normalizedValue));
    }
    if (filterType === "highpass" || filterType === "bandpass") {
      // For highpass, 0 is very low freq and 1 is very high freq
      frequency = minFreq * Math.exp(scaleFactor * normalizedValue);
    } else {
      // Handle other filter types or throw an error
      throw new Error(`Unsupported filter type: ${filterType}`);
    }

    // Set the value
    currentFilter.frequency.setValueAtTime(frequency, audioContextTime);
  }

  // Method to get the master output node
  getOutputNode() {
    return this.masterGain;
  }

  getInputNode() {
    return this.inputGain;
  }
}
