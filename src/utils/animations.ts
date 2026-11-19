// 动画工具函数和音效系统
import { settingsStorage } from './storage';

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    audioContext = new AudioContextCtor();
  }
  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }
  return audioContext;
};

export const playSound = (
  soundType: 'success' | 'error' | 'click' | 'collect' | 'levelUp',
): void => {
  if (typeof window === 'undefined') return;
  if (!settingsStorage.get().soundEnabled) return;

  const context = getAudioContext();
  if (!context) return;

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  const soundConfigs: Record<typeof soundType, { frequency: number; duration: number; type: OscillatorType }> = {
    success: { frequency: 523.25, duration: 0.3, type: 'sine' },
    error: { frequency: 200, duration: 0.3, type: 'sawtooth' },
    click: { frequency: 800, duration: 0.1, type: 'sine' },
    collect: { frequency: 880, duration: 0.2, type: 'sine' },
    levelUp: { frequency: 659.25, duration: 0.5, type: 'sine' },
  };

  const config = soundConfigs[soundType];

  oscillator.frequency.setValueAtTime(config.frequency, context.currentTime);
  oscillator.type = config.type;

  gainNode.gain.setValueAtTime(0.3, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + config.duration);

  oscillator.start(context.currentTime);
  oscillator.stop(context.currentTime + config.duration);
  oscillator.onended = () => {
    oscillator.disconnect();
    gainNode.disconnect();
  };
};

export const playSuccessSound = (): void => {
  playSound('success');
};

export const playErrorSound = (): void => {
  playSound('error');
};

export const playClickSound = (): void => {
  playSound('click');
};

export const playCollectSound = (): void => {
  playSound('collect');
};

export const playLevelUpSound = (): void => {
  playSound('levelUp');
};

/** 通关撒花粒子效果 */
export const celebrateWin = (element: HTMLElement): void => {
  const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da', '#fcbad3', '#a8d8ea'];
  const particleCount = 30;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.width = '10px';
    particle.style.height = '10px';
    particle.style.borderRadius = '50%';
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '9999';

    const angle = Math.random() * Math.PI * 2;
    const velocity = 100 + Math.random() * 200;

    particle.animate(
      [
        {
          transform: `translate(0, 0) scale(1)`,
          opacity: 1,
        },
        {
          transform: `translate(${Math.cos(angle) * velocity}px, ${Math.sin(angle) * velocity}px) scale(0)`,
          opacity: 0,
        },
      ],
      {
        duration: 1000 + Math.random() * 500,
        easing: 'cubic-bezier(0, 0.5, 0.5, 1)',
        fill: 'forwards',
      },
    );

    element.appendChild(particle);

    window.setTimeout(() => {
      particle.remove();
    }, 1500);
  }
};