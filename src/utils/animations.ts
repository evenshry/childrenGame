// 动画工具函数和音效系统

export type AnimationType = 'bounce' | 'shake' | 'pulse' | 'wiggle' | 'flip' | 'pop';

export interface AnimationConfig {
  type: AnimationType;
  duration?: number;
  easing?: string;
}

export const playSound = (soundType: 'success' | 'error' | 'click' | 'collect' | 'move' | 'levelUp'): void => {
  if (typeof window === 'undefined') return;
  
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  const soundConfigs: Record<typeof soundType, { frequency: number; duration: number; type: OscillatorType }> = {
    success: { frequency: 523.25, duration: 0.3, type: 'sine' },
    error: { frequency: 200, duration: 0.3, type: 'sawtooth' },
    click: { frequency: 800, duration: 0.1, type: 'sine' },
    collect: { frequency: 880, duration: 0.2, type: 'sine' },
    move: { frequency: 440, duration: 0.15, type: 'sine' },
    levelUp: { frequency: 659.25, duration: 0.5, type: 'sine' },
  };

  const config = soundConfigs[soundType];
  
  oscillator.frequency.setValueAtTime(config.frequency, audioContext.currentTime);
  oscillator.type = config.type;
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + config.duration);
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

export const playMoveSound = (): void => {
  playSound('move');
};

export const playLevelUpSound = (): void => {
  playSound('levelUp');
};

export const animateElement = (
  element: HTMLElement,
  animation: AnimationConfig,
  onComplete?: () => void
): void => {
  const { type, duration = 300, easing = 'ease' } = animation;

  const keyframes: Record<AnimationType, Keyframe[]> = {
    bounce: [
      { transform: 'scale(1)', offset: 0 },
      { transform: 'scale(1.2)', offset: 0.5 },
      { transform: 'scale(1)', offset: 1 },
    ],
    shake: [
      { transform: 'translateX(0)', offset: 0 },
      { transform: 'translateX(-10px)', offset: 0.25 },
      { transform: 'translateX(10px)', offset: 0.5 },
      { transform: 'translateX(-10px)', offset: 0.75 },
      { transform: 'translateX(0)', offset: 1 },
    ],
    pulse: [
      { transform: 'scale(1)', opacity: 1, offset: 0 },
      { transform: 'scale(1.1)', opacity: 0.8, offset: 0.5 },
      { transform: 'scale(1)', opacity: 1, offset: 1 },
    ],
    wiggle: [
      { transform: 'rotate(0deg)', offset: 0 },
      { transform: 'rotate(-10deg)', offset: 0.25 },
      { transform: 'rotate(10deg)', offset: 0.5 },
      { transform: 'rotate(-10deg)', offset: 0.75 },
      { transform: 'rotate(0deg)', offset: 1 },
    ],
    flip: [
      { transform: 'rotateY(0deg)', offset: 0 },
      { transform: 'rotateY(90deg)', offset: 0.5 },
      { transform: 'rotateY(0deg)', offset: 1 },
    ],
    pop: [
      { transform: 'scale(0)', offset: 0 },
      { transform: 'scale(1.2)', offset: 0.7 },
      { transform: 'scale(1)', offset: 1 },
    ],
  };

  const animationKeyframes = keyframes[type];

  element.animate(animationKeyframes, {
    duration,
    easing,
    iterations: 1,
    fill: 'forwards',
  }).onfinish = () => {
    if (onComplete) {
      onComplete();
    }
  };
};

export const createRipple = (event: React.MouseEvent<HTMLElement>): void => {
  const button = event.currentTarget;
  const circle = document.createElement('span');
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - button.offsetLeft - radius}px`;
  circle.style.top = `${event.clientY - button.offsetTop - radius}px`;
  circle.classList.add('ripple');

  const ripple = button.getElementsByClassName('ripple')[0];

  if (ripple) {
    ripple.remove();
  }

  button.appendChild(circle);
};

export const springAnimation = (
  element: HTMLElement,
  from: number,
  to: number,
  duration: number = 300,
  onUpdate?: (value: number) => void,
  onComplete?: () => void
): void => {
  const startTime = performance.now();
  const change = to - from;

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const easeOutElastic = (x: number): number => {
      const c4 = (2 * Math.PI) / 3;
      return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
    };

    const value = from + change * easeOutElastic(progress);

    if (onUpdate) {
      onUpdate(value);
    }

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else if (onComplete) {
      onComplete();
    }
  };

  requestAnimationFrame(animate);
};

export const fadeIn = (element: HTMLElement, duration: number = 300): Promise<void> => {
  return new Promise((resolve) => {
    element.style.opacity = '0';
    element.style.display = 'block';

    const animation = element.animate(
      [
        { opacity: 0 },
        { opacity: 1 },
      ],
      {
        duration,
        fill: 'forwards',
      }
    );

    animation.onfinish = () => {
      resolve();
    };
  });
};

export const fadeOut = (element: HTMLElement, duration: number = 300): Promise<void> => {
  return new Promise((resolve) => {
    const animation = element.animate(
      [
        { opacity: 1 },
        { opacity: 0 },
      ],
      {
        duration,
        fill: 'forwards',
      }
    );

    animation.onfinish = () => {
      element.style.display = 'none';
      resolve();
    };
  });
};

export const slideIn = (
  element: HTMLElement,
  direction: 'left' | 'right' | 'up' | 'down' = 'up',
  duration: number = 300
): Promise<void> => {
  return new Promise((resolve) => {
    const transforms: Record<typeof direction, string> = {
      left: 'translateX(-100%)',
      right: 'translateX(100%)',
      up: 'translateY(-100%)',
      down: 'translateY(100%)',
    };

    const targetTransforms: Record<typeof direction, string> = {
      left: 'translateX(0)',
      right: 'translateX(0)',
      up: 'translateY(0)',
      down: 'translateY(0)',
    };

    element.style.transform = transforms[direction];
    element.style.display = 'block';

    const animation = element.animate(
      [
        { transform: transforms[direction] },
        { transform: targetTransforms[direction] },
      ],
      {
        duration,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards',
      }
    );

    animation.onfinish = () => {
      resolve();
    };
  });
};

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
    const startX = element.offsetWidth / 2;
    const startY = element.offsetHeight / 2;

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
      }
    );

    element.appendChild(particle);

    setTimeout(() => {
      particle.remove();
    }, 1500);
  }
};
