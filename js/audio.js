import * as THREE from 'three';

// Enhanced SoundSynthesizer class for better audio
class SoundSynthesizer {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.masterGain = audioContext.createGain();
        this.masterGain.gain.value = 0.4; // Lower overall volume
        this.masterGain.connect(audioContext.destination);
        
        // For effects
        this.reverb = this.createReverb();
        this.delay = this.createDelay();
        
        // Connect effects
        this.masterGain.connect(this.reverb);
        this.masterGain.connect(this.delay);
        this.reverb.connect(audioContext.destination);
        this.delay.connect(audioContext.destination);
        
        // Create a compressor to prevent clipping
        this.compressor = audioContext.createDynamicsCompressor();
        this.compressor.threshold.value = -24;
        this.compressor.knee.value = 30;
        this.compressor.ratio.value = 12;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;
        
        this.masterGain.connect(this.compressor);
        this.compressor.connect(audioContext.destination);
        
        // Create a distortion effect for crunchy sounds
        this.distortion = this.createDistortion();
        
        // Store active note modules for management
        this.activeNotes = [];
        
        // Store buffers for special sounds (explosion, rainbow, etc.)
        this.specialSounds = {};
        
        // Initialize special sounds
        this.initSpecialSounds();
    }
    
    // Initialize special sound effects
    initSpecialSounds() {
        // Using the Web Audio API to create special sound effects
        this.createSpecialSound('click', this.createClickBuffer());
        this.createSpecialSound('explosion', this.createExplosionBuffer());
        this.createSpecialSound('rainbow', this.createRainbowBuffer());
        this.createSpecialSound('magnetic', this.createMagneticBuffer());
        this.createSpecialSound('blackhole', this.createBlackholeBuffer());
    }
    
    // Create a special sound and store it
    createSpecialSound(name, buffer) {
        const sound = {
            buffer: buffer,
            source: null,
            isPlaying: false
        };
        this.specialSounds[name] = sound;
    }
    
    // Play a special sound
    playSpecialSound(name, loop = false) {
        const sound = this.specialSounds[name];
        if (!sound) return;
        
        // Stop if already playing
        if (sound.isPlaying && sound.source) {
            this.stopSpecialSound(name);
        }
        
        // Create a new source
        const source = this.audioContext.createBufferSource();
        source.buffer = sound.buffer;
        source.loop = loop;
        
        // Create a gain node
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0.4;
        
        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        // Start playing
        source.start();
        
        // Update sound status
        sound.source = source;
        sound.gainNode = gainNode;
        sound.isPlaying = true;
        
        // Handle sound end if not looping
        if (!loop) {
            source.onended = () => {
                sound.isPlaying = false;
                sound.source = null;
            };
        }
    }
    
    // Stop a special sound
    stopSpecialSound(name) {
        const sound = this.specialSounds[name];
        if (!sound || !sound.isPlaying || !sound.source) return;
        
        // Fade out
        const now = this.audioContext.currentTime;
        sound.gainNode.gain.setValueAtTime(sound.gainNode.gain.value, now);
        sound.gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
        
        // Stop after fade out
        setTimeout(() => {
            try {
                sound.source.stop();
            } catch (e) {
                // Ignore if already stopped
            }
            sound.isPlaying = false;
            sound.source = null;
        }, 100);
    }
    
    // Create a basic reverb effect
    createReverb() {
        const convolver = this.audioContext.createConvolver();
        
        // Create impulse response for reverb
        const rate = this.audioContext.sampleRate;
        const length = rate * 2; // 2 seconds
        const impulse = this.audioContext.createBuffer(2, length, rate);
        
        for (let channel = 0; channel < 2; channel++) {
            const impulseData = impulse.getChannelData(channel);
            
            for (let i = 0; i < length; i++) {
                // Decay curve for reverb
                impulseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }
        
        convolver.buffer = impulse;
        
        // Create gain node for reverb amount
        const reverbGain = this.audioContext.createGain();
        reverbGain.gain.value = 0.2; // Subtle reverb
        
        convolver.connect(reverbGain);
        
        return reverbGain;
    }
    
    // Create a delay effect
    createDelay() {
        const delay = this.audioContext.createDelay();
        delay.delayTime.value = 0.3; // 300ms delay
        
        // Feedback for delay
        const feedback = this.audioContext.createGain();
        feedback.gain.value = 0.2; // 20% feedback
        
        delay.connect(feedback);
        feedback.connect(delay);
        
        // Create gain node for delay amount
        const delayGain = this.audioContext.createGain();
        delayGain.gain.value = 0.15; // Subtle delay
        
        delay.connect(delayGain);
        
        return delayGain;
    }
    
    // Create a distortion effect
    createDistortion() {
        const distortion = this.audioContext.createWaveShaper();
        
        // Create a distortion curve
        function makeDistortionCurve(amount) {
            const k = typeof amount === 'number' ? amount : 50;
            const n_samples = 44100;
            const curve = new Float32Array(n_samples);
            const deg = Math.PI / 180;
            
            for (let i = 0; i < n_samples; ++i) {
                const x = i * 2 / n_samples - 1;
                curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
            }
            
            return curve;
        }
        
        distortion.curve = makeDistortionCurve(50);
        distortion.oversample = '4x';
        
        // Create gain node for distortion amount
        const distortionGain = this.audioContext.createGain();
        distortionGain.gain.value = 0.1; // Subtle distortion by default
        
        distortion.connect(distortionGain);
        
        return distortionGain;
    }
    
    // Play a note with warm pad sound
    playWarmPad(note, duration = 0.5) {
        const now = this.audioContext.currentTime;
        
        // Create oscillators for rich sound
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const osc3 = this.audioContext.createOscillator();
        
        // Set waveforms for warmer sound
        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc3.type = 'sine';
        
        // Set frequencies with slight detuning for warmth
        osc1.frequency.value = note;
        osc2.frequency.value = note * 1.005; // Slight detuning
        osc3.frequency.value = note * 0.5;   // Octave below
        
        // Create gain nodes for envelope
        const gain1 = this.audioContext.createGain();
        const gain2 = this.audioContext.createGain();
        const gain3 = this.audioContext.createGain();
        
        // Set initial gain to 0
        gain1.gain.value = 0;
        gain2.gain.value = 0;
        gain3.gain.value = 0;
        
        // Connect everything
        osc1.connect(gain1);
        osc2.connect(gain2);
        osc3.connect(gain3);
        
        gain1.connect(this.masterGain);
        gain2.connect(this.masterGain);
        gain3.connect(this.masterGain);
        
        // Apply envelope for smooth attack and release
        const attackTime = 0.1;
        const releaseTime = 0.6;
        
        // Attack
        gain1.gain.linearRampToValueAtTime(0.2, now + attackTime);
        gain2.gain.linearRampToValueAtTime(0.15, now + attackTime);
        gain3.gain.linearRampToValueAtTime(0.1, now + attackTime);
        
        // Release
        gain1.gain.linearRampToValueAtTime(0, now + duration + releaseTime);
        gain2.gain.linearRampToValueAtTime(0, now + duration + releaseTime + 0.1);
        gain3.gain.linearRampToValueAtTime(0, now + duration + releaseTime + 0.2);
        
        // Start and stop oscillators
        osc1.start(now);
        osc2.start(now);
        osc3.start(now);
        
        osc1.stop(now + duration + releaseTime + 0.3);
        osc2.stop(now + duration + releaseTime + 0.3);
        osc3.stop(now + duration + releaseTime + 0.3);
        
        // Track active notes
        const noteModule = { oscillators: [osc1, osc2, osc3], gains: [gain1, gain2, gain3] };
        this.activeNotes.push(noteModule);
        
        // Clean up after note finishes
        setTimeout(() => {
            const index = this.activeNotes.indexOf(noteModule);
            if (index > -1) {
                this.activeNotes.splice(index, 1);
            }
        }, (duration + releaseTime + 0.3) * 1000);
        
        return noteModule;
    }
    
    // Play a chord based on a root note
    playChord(rootNote, duration = 0.8) {
        this.playWarmPad(rootNote, duration);
        this.playWarmPad(rootNote * 5/4, duration); // Major third
        this.playWarmPad(rootNote * 3/2, duration); // Perfect fifth
    }
    
    // Play sound based on position (for hover)
    playPositionSound(x, y) {
        // Map x and y to meaningful musical values
        // Using pentatonic scale for pleasing sounds
        const pentatonicScale = [220, 247.5, 277.2, 329.6, 370.0];
        
        // Map x to note in scale (-1 to 1 maps to 0 to 4)
        const noteIndex = Math.floor(((x + 1) / 2) * pentatonicScale.length);
        const note = pentatonicScale[Math.min(noteIndex, pentatonicScale.length - 1)];
        
        // Map y to volume (-1 to 1 maps to 0 to 0.4)
        const volume = ((y + 1) / 2) * 0.4;
        this.masterGain.gain.value = volume;
        
        // Play the note
        this.playWarmPad(note, 0.2);
    }
    
    // Play click sound
    playClickSound() {
        // Play a pleasant chord
        this.playChord(329.6, 0.5); // E4 chord
    }
    
    // Play release sound
    playReleaseSound() {
        // Play a different chord
        this.playChord(261.6, 0.3); // C4 chord
    }
    
    // Play a crunchy facet sound
    playFacetSound(facetIndex, intensity = 0.5) {
        const now = this.audioContext.currentTime;
        
        // Create a more percussive synth for the facet sounds
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const noise = this.createNoiseGenerator();
        
        // Use facetIndex to determine frequency - create a unique sound for each facet
        // Map facet index to frequencies in a pleasing scale
        const baseNote = 60 + (facetIndex % 12); // C4 (midi note 60) + offset based on facet
        const frequency = 440 * Math.pow(2, (baseNote - 69) / 12); // Convert MIDI note to frequency
        
        // Set waveforms for crunchy sound
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        
        // Set frequencies with different relationships for each facet
        osc1.frequency.value = frequency;
        osc2.frequency.value = frequency * (1 + (facetIndex % 5) * 0.02); // Creates harmonic beating
        
        // Create gain nodes
        const gain1 = this.audioContext.createGain();
        const gain2 = this.audioContext.createGain();
        const noiseGain = this.audioContext.createGain();
        
        // Set initial gain values
        gain1.gain.value = 0;
        gain2.gain.value = 0;
        noiseGain.gain.value = 0;
        
        // Connect the oscillators through distortion for crunchiness
        osc1.connect(gain1);
        osc2.connect(gain2);
        noise.connect(noiseGain);
        
        // Create individual distortion for each sound source
        const distortion1 = this.audioContext.createWaveShaper();
        const distortion2 = this.audioContext.createWaveShaper();
        
        // Create distortion curves with different characteristics
        function makeDistortionCurve(amount) {
            const k = typeof amount === 'number' ? amount : 50;
            const n_samples = 44100;
            const curve = new Float32Array(n_samples);
            const deg = Math.PI / 180;
            
            for (let i = 0; i < n_samples; ++i) {
                const x = i * 2 / n_samples - 1;
                curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
            }
            
            return curve;
        }
        
        // Different distortion amounts based on facet index
        const distAmt1 = 50 + (facetIndex % 5) * 20;
        const distAmt2 = 30 + (facetIndex % 7) * 15;
        
        distortion1.curve = makeDistortionCurve(distAmt1);
        distortion2.curve = makeDistortionCurve(distAmt2);
        distortion1.oversample = '4x';
        distortion2.oversample = '4x';
        
        // Connect through distortion chains
        gain1.connect(distortion1);
        gain2.connect(distortion2);
        
        // Create a bandpass filter to shape the sound
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = frequency * (1 + (facetIndex % 3) * 0.5);
        filter.Q.value = 1 + (facetIndex % 10); // Different resonance per facet
        
        // Connect everything to the filter
        distortion1.connect(filter);
        distortion2.connect(filter);
        noiseGain.connect(filter);
        
        // Connect to master output with a specific gain for this sound
        const outputGain = this.audioContext.createGain();
        outputGain.gain.value = 0.2 * intensity; // Scale by intensity
        
        filter.connect(outputGain);
        outputGain.connect(this.masterGain);
        
        // Very short, percussive envelope
        const attackTime = 0.005;
        const releaseTime = 0.1 + (facetIndex % 5) * 0.05; // Varied release per facet
        
        // Envelope for oscillator 1
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.3 * intensity, now + attackTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + attackTime + releaseTime);
        
        // Envelope for oscillator 2
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(0.2 * intensity, now + attackTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + attackTime + releaseTime * 0.8);
        
        // Envelope for noise
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(0.1 * intensity, now + attackTime * 0.5);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + attackTime + releaseTime * 0.3);
        
        // Start and stop sources
        osc1.start(now);
        osc2.start(now);
        
        const stopTime = now + attackTime + releaseTime + 0.1;
        osc1.stop(stopTime);
        osc2.stop(stopTime);
        
        // Add filter sweep for extra texture
        filter.frequency.setValueAtTime(filter.frequency.value, now);
        filter.frequency.exponentialRampToValueAtTime(
            filter.frequency.value * (0.5 + Math.random()),
            now + attackTime + releaseTime * 0.8
        );
        
        // Clean up noise generator
        setTimeout(() => {
            noise.disconnect();
        }, (attackTime + releaseTime + 0.1) * 1000);
    }
    
    // Create a noise generator
    createNoiseGenerator() {
        // Create audio buffer for noise
        const bufferSize = 2 * this.audioContext.sampleRate;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        // Fill the buffer with noise
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        // Create buffer source
        const noise = this.audioContext.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;
        noise.start();
        
        return noise;
    }
    
    // Stop all currently playing sounds
    stopAllSounds() {
        // Gradually fade out master gain
        const now = this.audioContext.currentTime;
        this.masterGain.gain.linearRampToValueAtTime(0, now + 0.1);
        
        // Reset after fade out
        setTimeout(() => {
            // Stop all active oscillators
            this.activeNotes.forEach(noteModule => {
                noteModule.oscillators.forEach(osc => {
                    try {
                        osc.stop();
                    } catch (e) {
                        // Ignore errors if oscillator is already stopped
                    }
                });
            });
            
            // Clear active notes
            this.activeNotes = [];
            
            // Reset master gain
            this.masterGain.gain.value = 0.4;
        }, 100);
        
        // Stop all special sounds
        Object.keys(this.specialSounds).forEach(name => {
            this.stopSpecialSound(name);
        });
    }
    
    // Create buffer for click sound
    createClickBuffer() {
        // Create a buffer for a short click sound
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, sampleRate * 0.5, sampleRate);
        
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            
            // Attack
            for (let i = 0; i < sampleRate * 0.01; i++) {
                data[i] = Math.random() * i / (sampleRate * 0.01);
            }
            
            // Body - warm tone with slight distortion
            for (let i = sampleRate * 0.01; i < sampleRate * 0.2; i++) {
                const t = (i - sampleRate * 0.01) / (sampleRate * 0.19);
                const x = Math.sin(i * 0.05) * 0.3 + Math.sin(i * 0.08) * 0.2 + Math.sin(i * 0.11) * 0.1;
                data[i] = x * (1 - t);
            }
            
            // Fade out
            for (let i = sampleRate * 0.2; i < sampleRate * 0.5; i++) {
                const t = (i - sampleRate * 0.2) / (sampleRate * 0.3);
                data[i] = (1 - t) * 0.05 * Math.sin(i * 0.02);
            }
        }
        
        return buffer;
    }
    
    // Create buffer for explosion sound
    createExplosionBuffer() {
        // Create a buffer for an explosion sound
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, sampleRate * 2, sampleRate);
        
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            
            // Initial burst
            for (let i = 0; i < sampleRate * 0.1; i++) {
                const t = i / (sampleRate * 0.1);
                data[i] = (Math.random() * 2 - 1) * (1 - t * 0.5);
            }
            
            // Rumble with decreasing amplitude
            for (let i = sampleRate * 0.1; i < sampleRate * 2; i++) {
                const t = (i - sampleRate * 0.1) / (sampleRate * 1.9);
                const noise = Math.random() * 2 - 1;
                const lowFreq = Math.sin(i * 0.01) * 0.5;
                data[i] = (noise * 0.4 + lowFreq) * Math.pow(1 - t, 1.5);
            }
        }
        
        return buffer;
    }
    
    // Create buffer for rainbow sound
    createRainbowBuffer() {
        // Create a buffer for a shimmering sound
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, sampleRate * 3, sampleRate);
        
        // Base frequencies for a major chord
        const frequencies = [261.6, 329.6, 392.0, 523.2];
        
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            
            // Fill with silence first
            for (let i = 0; i < data.length; i++) {
                data[i] = 0;
            }
            
            // Add sine waves at different frequencies
            for (const freq of frequencies) {
                for (let i = 0; i < data.length; i++) {
                    const t = i / sampleRate;
                    data[i] += Math.sin(t * freq * Math.PI * 2) * 0.1 * Math.sin(t * 0.5);
                }
            }
            
            // Add some shimmer
            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                data[i] += Math.sin(t * 1000 + Math.sin(t * 4) * 500) * 0.01 * Math.sin(t * 0.8);
            }
        }
        
        return buffer;
    }
    
    // Create buffer for magnetic sound
    createMagneticBuffer() {
        // Create a buffer for a humming magnetic sound
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, sampleRate * 3, sampleRate);
        
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            
            // Fill with a humming sound
            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                // Base frequency
                const baseFreq = 80 + Math.sin(t * 0.5) * 10;
                // Harmonics
                const h1 = Math.sin(t * baseFreq * Math.PI * 2) * 0.3;
                const h2 = Math.sin(t * baseFreq * 2 * Math.PI * 2) * 0.15;
                const h3 = Math.sin(t * baseFreq * 3 * Math.PI * 2) * 0.08;
                const h4 = Math.sin(t * baseFreq * 4 * Math.PI * 2) * 0.04;
                // Combined with a high resonant sweep
                const sweep = Math.sin(t * (1000 + Math.sin(t * 0.3) * 800) * Math.PI * 2) * 0.05;
                
                data[i] = (h1 + h2 + h3 + h4 + sweep) * 0.5;
            }
        }
        
        return buffer;
    }
    
    // Create buffer for blackhole sound
    createBlackholeBuffer() {
        // Create a buffer for an ominous blackhole sound
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, sampleRate * 5, sampleRate);
        
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            
            // Fill with deep rumbling sound
            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                // Deep bass
                const deepBass = Math.sin(t * 30 * Math.PI * 2) * 0.4;
                // Low rumble
                const rumble = (Math.random() * 2 - 1) * 0.1 * Math.pow(Math.sin(t * 0.25) * 0.5 + 0.5, 2);
                // Sweeping sound
                const sweep = Math.sin(t * (50 + Math.sin(t * 0.1) * 20) * Math.PI * 2) * 0.1;
                
                // Combine with volume envelope
                const envelope = Math.min(t * 0.5, 1) * Math.min((5 - t) * 0.5, 1);
                data[i] = (deepBass + rumble + sweep) * envelope;
            }
        }
        
        return buffer;
    }
}

// Setup audio system
function setupAudio(app) {
    try {
        // Initialize Web Audio API
        app.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create sound synthesizer
        app.soundSynth = new SoundSynthesizer(app.audioContext);
        
        console.log("Audio system initialized");
        return app.soundSynth;
    } catch (e) {
        console.error("Web Audio API not supported:", e);
        return null;
    }
}

// Initialize Web Audio API synthesizer and effects
function initAudioEffects(app) {
    if (!app.audioContext) {
        try {
            app.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create our synthesizer
            app.soundSynth = new SoundSynthesizer(app.audioContext);
            
            console.log("Audio effects initialized");
        } catch (e) {
            console.error("Web Audio API not supported:", e);
        }
    }
}

// Map a value to a frequency range (for mouse movement)
function mapToFrequency(value, min, max, freqMin = 220, freqMax = 880) {
    return freqMin + ((value - min) / (max - min)) * (freqMax - freqMin);
}

// Play a tone based on position
function playToneForPosition(app, x, y) {
    if (!app.soundSynth) return;
    
    // Use the improved synthesizer for position-based sounds
    app.soundSynth.playPositionSound(x, y);
}

// Stop playing the tone
function stopTone(app) {
    if (!app.soundSynth) return;
    
    // Stop all currently playing sounds
    app.soundSynth.stopAllSounds();
}

// Create visualization for sound
function createAudioVisualization(app) {
    if (!app.audioContext) return;
    
    // Create a circle of small cubes around the ball
    const visualizationGroup = new THREE.Group();
    const cubeCount = 32;
    const radius = 2;
    
    for (let i = 0; i < cubeCount; i++) {
        const angle = (i / cubeCount) * Math.PI * 2;
        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.1, 0.1),
            new THREE.MeshBasicMaterial({
                color: 0xFFFFFF,
                transparent: true,
                opacity: 0.8
            })
        );
        
        cube.position.set(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            0
        );
        
        visualizationGroup.add(cube);
    }
    
    app.scene.add(visualizationGroup);
    
    // Store it for updates
    app.scene.userData.audioVisualization = visualizationGroup;
}

// Update audio visualization
function updateAudioVisualization(app) {
    if (!app.audioContext || !app.scene.userData.audioVisualization) return;
    
    // Get frequency data
    const analyser = app.analyser;
    if (!analyser) return;
    
    const dataArray = app.audioDataArray;
    if (!dataArray) return;
    
    // Get frequency data
    analyser.getByteFrequencyData(dataArray);
    
    // Update visualization cubes
    const visualization = app.scene.userData.audioVisualization;
    const cubes = visualization.children;
    
    for (let i = 0; i < cubes.length; i++) {
        const cube = cubes[i];
        
        // Map frequency bin to cube
        const frequencyBin = Math.floor((i / cubes.length) * dataArray.length);
        const value = dataArray[frequencyBin] / 255; // Normalize to 0-1
        
        // Scale cube based on frequency value
        cube.scale.y = 0.1 + value * 2;
        
        // Position the cube
        cube.position.y = Math.sin((i / cubes.length) * Math.PI * 2) * 2 + (value * 0.5);
        
        // Color based on frequency (optional)
        cube.material.color.setHSL(i / cubes.length, 0.8, 0.5 + value * 0.5);
    }
}

// Create a listener for 3D audio
const listener = new THREE.AudioListener();

// Sound manager for handling sound effects
const soundManager = {
    sounds: {},
    
    // Initialize all sounds
    init: function() {
        // Create sound effects
        this.createSound('hover', 'https://assets.codepen.io/729648/hover.mp3');
        this.createSound('click', 'https://assets.codepen.io/729648/click.mp3');
        this.createSound('explosion', 'https://assets.codepen.io/729648/explosion.mp3');
        this.createSound('spike', 'https://assets.codepen.io/729648/spike.mp3');
        this.createSound('rainbow', 'https://assets.codepen.io/729648/rainbow.mp3');
        this.createSound('blackhole', 'https://assets.codepen.io/729648/blackhole.mp3');
        this.createSound('magnetic', 'https://assets.codepen.io/729648/magnetic.mp3');
        
        // Create positional sounds (these will come from the ball's location)
        this.createPositionalSound('deform', 'https://assets.codepen.io/729648/deform.mp3');
    },
    
    // Create a global sound
    createSound: function(name, url) {
        const sound = new THREE.Audio(listener);
        
        // Load a sound and set it as the Audio object's buffer
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load(url, function(buffer) {
            sound.setBuffer(buffer);
            sound.setVolume(0.5);
        });
        
        this.sounds[name] = sound;
    },
    
    // Create a positional sound
    createPositionalSound: function(name, url) {
        const sound = new THREE.PositionalAudio(listener);
        
        // Load a sound and set it as the Audio object's buffer
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load(url, function(buffer) {
            sound.setBuffer(buffer);
            sound.setRefDistance(3); // The distance at which the volume reduction starts
            sound.setVolume(0.5);
        });
        
        this.sounds[name] = sound;
    },
    
    // Play a sound
    play: function(name, loop = false) {
        const sound = this.sounds[name];
        if (sound && sound.buffer) {
            // Don't restart if it's already playing
            if (!sound.isPlaying) {
                sound.setLoop(loop);
                sound.play();
            }
        }
    },
    
    // Stop a sound
    stop: function(name) {
        const sound = this.sounds[name];
        if (sound && sound.isPlaying) {
            sound.stop();
        }
    },
    
    // Attach a positional sound to an object
    attachToObject: function(name, object) {
        const sound = this.sounds[name];
        if (sound && !object.children.includes(sound)) {
            object.add(sound);
        }
    },
    
    // Set the frequency of an oscillator
    setFrequency: function(name, value) {
        const sound = this.sounds[name];
        if (sound && sound.source && sound.source.frequency) {
            sound.source.frequency.value = value;
        }
    }
};

// We'll use the Web Audio API to create a synthesizer for reactive sounds
let audioContext;
let oscillator;
let gainNode;

// Initialize Web Audio API synthesizer
function initSynthesizer() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create gain node (for volume control)
        gainNode = audioContext.createGain();
        gainNode.gain.value = 0; // Start silent
        gainNode.connect(audioContext.destination);
        
        // Create oscillator (for tone generation)
        oscillator = audioContext.createOscillator();
        oscillator.type = 'sine'; // Sine wave
        oscillator.frequency.value = 440; // A4 note
        oscillator.connect(gainNode);
        oscillator.start();
        
        console.log("Audio synthesizer initialized");
    } catch (e) {
        console.error("Web Audio API not supported or error initializing:", e);
    }
}

// Create an audio analyzer to visualize sound
let analyzer;
let bufferLength;
let dataArray;

function setupAudioAnalyzer() {
    if (!audioContext) return;
    
    // Create an analyzer node
    analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 256;
    bufferLength = analyzer.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    
    // Connect the analyzer to the audio context
    gainNode.connect(analyzer);
}

// Export all needed functions and variables
export {
    listener,
    soundManager,
    initSynthesizer,
    setupAudioAnalyzer,
    analyzer,
    bufferLength,
    dataArray,
    createAudioVisualization,
    updateAudioVisualization,
    playToneForPosition,
    stopTone,
    mapToFrequency,
    setupAudio,
    initAudioEffects,
    SoundSynthesizer
};