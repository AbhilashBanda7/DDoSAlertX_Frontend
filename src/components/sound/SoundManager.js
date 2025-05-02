import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const SoundManager = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainNodeRef = useRef(null);
  const location = useLocation();

  // Initialize audio context on first render
  useEffect(() => {
    // Clean up function for when component unmounts
    return () => {
      stopSound();
    };
  }, []);

  // Start playing the ticking sound
  const startTickingSound = () => {
    if (isPlaying) return;

    try {
      // Create audio context if it doesn't exist
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      // Create oscillator and gain node
      oscillatorRef.current = audioContextRef.current.createOscillator();
      gainNodeRef.current = audioContextRef.current.createGain();

      // Configure oscillator for clock ticking sound
      oscillatorRef.current.type = 'square'; // Square wave for more tick-like sound
      oscillatorRef.current.frequency.value = 2; // 2Hz - two ticks per second
      
      // Higher volume
      gainNodeRef.current.gain.value = 0.3;
      
      // Connect the nodes
      oscillatorRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(audioContextRef.current.destination);
      
      // Start the oscillator
      oscillatorRef.current.start();
      setIsPlaying(true);
      
      // Dispatch an event to signal that sound has started
      document.dispatchEvent(new CustomEvent('soundStarted'));
    } catch (err) {
      console.error('Error starting sound:', err);
    }
  };

  // Stop the sound
  const stopSound = () => {
    if (!isPlaying) return;

    try {
      // Stop the oscillator if it exists
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
      }
      
      // Close the audio context if it exists
      if (audioContextRef.current) {
        // Don't close the audio context as it might be needed again
        // Just disconnect the gain node
        if (gainNodeRef.current) {
          gainNodeRef.current.disconnect();
          gainNodeRef.current = null;
        }
      }
      
      setIsPlaying(false);
      
      // Dispatch an event to signal that sound has stopped
      document.dispatchEvent(new CustomEvent('soundStopped'));
    } catch (err) {
      console.error('Error stopping sound:', err);
    }
  };

  // Pause sound (by setting volume to 0)
  const pauseSound = () => {
    if (isPlaying && gainNodeRef.current) {
      gainNodeRef.current.gain.value = 0;
    }
  };

  // Resume sound
  const resumeSound = () => {
    if (isPlaying && gainNodeRef.current) {
      gainNodeRef.current.gain.value = 0.3;
    }
  };

  // Play a sound based on the event type
  const playSound = (type) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Sound configurations for different events - improved versions
      const soundConfigs = {
        plottingStarted: {
          // Gentle "ding" sound
          type: 'sine',
          frequency: [440, 880], // Start at A4, go to A5
          duration: 600,
          volume: 0.6,
          envelope: {
            attack: 0.01,
            decay: 0.2,
            sustain: 0.6,
            release: 0.3
          }
        },
        plottingEnded: {
          // Success chord  
          type: 'sine',
          frequency: [523.25, 659.25, 783.99], // C5, E5, G5 (C major chord)
          duration: 800,
          volume: 0.7,
          envelope: {
            attack: 0.05,
            decay: 0.3,
            sustain: 0.6,
            release: 0.5
          }
        },
        attackStarted: {
          // Alert siren sound
          type: 'triangle',
          frequency: [698.46, 523.25], // F5 to C5
          duration: 1000,
          volume: 0.7,
          envelope: {
            attack: 0.05,
            decay: 0.3,
            sustain: 0.9,
            release: 0.2
          }
        },
        attackEnded: {
          // Resolved alert sound
          type: 'sine',
          frequency: [587.33, 659.25], // D5 to E5
          duration: 800,
          volume: 0.6,
          envelope: {
            attack: 0.05,
            decay: 0.1,
            sustain: 0.7,
            release: 0.5
          }
        },
        ewsAlert: {
          // Warning pulse sound
          type: 'sawtooth',
          frequency: [415.30, 466.16], // G#4 to A#4
          duration: 700,
          volume: 0.6,
          envelope: {
            attack: 0.01,
            decay: 0.1,
            sustain: 0.8,
            release: 0.2
          }
        }
      };
      
      const config = soundConfigs[type] || soundConfigs.plottingEnded;
      
      oscillator.type = config.type;
      
      // Apply envelope to gain
      const now = audioContext.currentTime;
      const attackTime = now + config.envelope.attack;
      const decayTime = attackTime + config.envelope.decay;
      const sustainTime = decayTime + (config.duration / 1000 - config.envelope.attack - config.envelope.decay - config.envelope.release);
      const releaseTime = sustainTime + config.envelope.release;
      
      // Volume envelope
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(config.volume, attackTime);
      gainNode.gain.linearRampToValueAtTime(config.volume * config.envelope.sustain, decayTime);
      gainNode.gain.linearRampToValueAtTime(config.volume * config.envelope.sustain, sustainTime);
      gainNode.gain.linearRampToValueAtTime(0, releaseTime);
      
      // For multi-tone sounds
      if (Array.isArray(config.frequency)) {
        const freqLen = config.frequency.length;
        const step = config.duration / freqLen;
        
        oscillator.frequency.setValueAtTime(config.frequency[0], now);
        
        // Schedule frequency changes
        for (let i = 1; i < freqLen; i++) {
          const time = now + (step * i / 1000);
          oscillator.frequency.linearRampToValueAtTime(config.frequency[i], time);
        }
      } else {
        oscillator.frequency.value = config.frequency;
      }
      
      oscillator.start();
      
      // Stop after duration
      setTimeout(() => {
        oscillator.stop(releaseTime);
        
        // Clean up after release time
        setTimeout(() => {
          oscillator.disconnect();
          gainNode.disconnect();
          audioContext.close().catch(() => {});
        }, config.envelope.release * 1000 + 100);
      }, config.duration);
    } catch (err) {
      console.error(`Error playing ${type} sound:`, err);
    }
  };

  // Play specific event sounds
  const playPlottingStartedSound = () => playSound('plottingStarted');
  const playPlottingEndedSound = () => playSound('plottingEnded');
  const playAttackStartedSound = () => playSound('attackStarted');
  const playAttackEndedSound = () => playSound('attackEnded');
  const playEWSAlertSound = () => playSound('ewsAlert');

  // Stop sound when route changes (leaving analysis page)
  useEffect(() => {
    if (location.pathname !== '/analysis') {
      stopSound();
    }
  }, [location.pathname]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopSound();
      
      // Clean up audio context
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Listen for custom events to control the sound
  useEffect(() => {
    const handleStartSound = () => startTickingSound();
    const handleStopSound = () => stopSound();
    const handlePauseSound = () => pauseSound();
    const handleResumeSound = () => resumeSound();
    
    // Event handlers for specific sound types
    const handlePlottingStartedSound = () => playPlottingStartedSound();
    const handlePlottingEndedSound = () => playPlottingEndedSound();
    const handleAttackStartedSound = () => playAttackStartedSound();
    const handleAttackEndedSound = () => playAttackEndedSound();
    const handleEWSAlertSound = () => playEWSAlertSound();
    
    // Add event listeners for basic sound control
    document.addEventListener('startTickingSound', handleStartSound);
    document.addEventListener('stopTickingSound', handleStopSound);
    document.addEventListener('pauseTickingSound', handlePauseSound);
    document.addEventListener('resumeTickingSound', handleResumeSound);
    
    // Add event listeners for specific sounds
    document.addEventListener('playPlottingStartedSound', handlePlottingStartedSound);
    document.addEventListener('playPlottingEndedSound', handlePlottingEndedSound);
    document.addEventListener('playAttackStartedSound', handleAttackStartedSound);
    document.addEventListener('playAttackEndedSound', handleAttackEndedSound);
    document.addEventListener('playEWSAlertSound', handleEWSAlertSound);
    
    // Animation events
    document.addEventListener('animationStart', handleStartSound);
    document.addEventListener('animationComplete', handlePlottingEndedSound);
    document.addEventListener('animationPause', handlePauseSound);
    document.addEventListener('animationResume', handleResumeSound);
    document.addEventListener('attackDetected', handleAttackStartedSound);
    document.addEventListener('attackEnded', handleAttackEndedSound);
    document.addEventListener('ewsAlertDetected', handleEWSAlertSound);
    
    // Clean up
    return () => {
      // Remove basic sound control listeners
      document.removeEventListener('startTickingSound', handleStartSound);
      document.removeEventListener('stopTickingSound', handleStopSound);
      document.removeEventListener('pauseTickingSound', handlePauseSound);
      document.removeEventListener('resumeTickingSound', handleResumeSound);
      
      // Remove specific sound listeners
      document.removeEventListener('playPlottingStartedSound', handlePlottingStartedSound);
      document.removeEventListener('playPlottingEndedSound', handlePlottingEndedSound);
      document.removeEventListener('playAttackStartedSound', handleAttackStartedSound);
      document.removeEventListener('playAttackEndedSound', handleAttackEndedSound);
      document.removeEventListener('playEWSAlertSound', handleEWSAlertSound);
      
      // Remove animation event listeners
      document.removeEventListener('animationStart', handleStartSound);
      document.removeEventListener('animationComplete', handlePlottingEndedSound);
      document.removeEventListener('animationPause', handlePauseSound);
      document.removeEventListener('animationResume', handleResumeSound);
      document.removeEventListener('attackDetected', handleAttackStartedSound);
      document.removeEventListener('attackEnded', handleAttackEndedSound);
      document.removeEventListener('ewsAlertDetected', handleEWSAlertSound);
    };
  }, [isPlaying]);

  return null; // This component doesn't render anything
};

export default SoundManager; 