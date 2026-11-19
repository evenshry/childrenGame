import React, { useEffect, useRef } from 'react';
import type { Direction, MapData } from '@/types/global';
import styles from './index.module.scss';

export interface GameCanvasProps {
  map: MapData;
  robot: { x: number; y: number; dir: Direction };
  collectedStars?: { x: number; y: number }[];
}

const CANVAS_SIZE = 400;
const PADDING = 20;

const getCellSize = (map: MapData, size: number): number =>
  Math.min((size - PADDING * 2) / map.width, (size - PADDING * 2) / map.height);

const drawRobot = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: Direction,
  cellSize: number,
  time: number,
) => {
  const centerX = PADDING + x + cellSize / 2;
  const centerY = PADDING + y + cellSize / 2;
  const bodyRadius = cellSize / 2.5;
  const bounceOffset = Math.sin(time * 0.005) * 3;

  const gradient = ctx.createRadialGradient(
    centerX - 5,
    centerY - 5 + bounceOffset,
    0,
    centerX,
    centerY + bounceOffset,
    bodyRadius,
  );
  gradient.addColorStop(0, '#64b5f6');
  gradient.addColorStop(1, '#1976d2');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY + bounceOffset, bodyRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  const eyeOffset = bodyRadius / 3;
  ctx.beginPath();
  ctx.arc(centerX - eyeOffset, centerY - 5 + bounceOffset, bodyRadius / 4, 0, Math.PI * 2);
  ctx.arc(centerX + eyeOffset, centerY - 5 + bounceOffset, bodyRadius / 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#333';
  let pupilOffsetX = 0;
  let pupilOffsetY = 0;
  switch (direction) {
    case 'up':
      pupilOffsetY = -3;
      break;
    case 'down':
      pupilOffsetY = 3;
      break;
    case 'left':
      pupilOffsetX = -3;
      break;
    case 'right':
      pupilOffsetX = 3;
      break;
  }
  ctx.beginPath();
  ctx.arc(
    centerX - eyeOffset + pupilOffsetX,
    centerY - 5 + pupilOffsetY + bounceOffset,
    bodyRadius / 8,
    0,
    Math.PI * 2,
  );
  ctx.arc(
    centerX + eyeOffset + pupilOffsetX,
    centerY - 5 + pupilOffsetY + bounceOffset,
    bodyRadius / 8,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY + 3 + bounceOffset, bodyRadius / 3, 0, Math.PI);
  ctx.stroke();

  ctx.strokeStyle = '#1976d2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - bodyRadius + bounceOffset);
  ctx.lineTo(centerX, centerY - bodyRadius - 10 + bounceOffset);
  ctx.stroke();

  const blinkIntensity = (Math.sin(time * 0.01) + 1) / 2;
  ctx.fillStyle = `rgba(255, 87, 87, ${0.5 + blinkIntensity * 0.5})`;
  ctx.beginPath();
  ctx.arc(centerX, centerY - bodyRadius - 10 + bounceOffset, 4, 0, Math.PI * 2);
  ctx.fill();

  const dirX = centerX;
  const dirY = centerY + bounceOffset;
  ctx.fillStyle = '#ff9800';
  ctx.beginPath();
  switch (direction) {
    case 'right':
      ctx.moveTo(dirX + bodyRadius / 2, dirY - 5);
      ctx.lineTo(dirX + bodyRadius / 2 + 10, dirY);
      ctx.lineTo(dirX + bodyRadius / 2, dirY + 5);
      break;
    case 'left':
      ctx.moveTo(dirX - bodyRadius / 2, dirY - 5);
      ctx.lineTo(dirX - bodyRadius / 2 - 10, dirY);
      ctx.lineTo(dirX - bodyRadius / 2, dirY + 5);
      break;
    case 'up':
      ctx.moveTo(dirX - 5, dirY - bodyRadius / 2);
      ctx.lineTo(dirX, dirY - bodyRadius / 2 - 10);
      ctx.lineTo(dirX + 5, dirY - bodyRadius / 2);
      break;
    case 'down':
      ctx.moveTo(dirX - 5, dirY + bodyRadius / 2);
      ctx.lineTo(dirX, dirY + bodyRadius / 2 + 10);
      ctx.lineTo(dirX + 5, dirY + bodyRadius / 2);
      break;
  }
  ctx.closePath();
  ctx.fill();
};

const drawStar = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  time: number,
) => {
  const centerX = PADDING + x + cellSize / 2;
  const centerY = PADDING + y + cellSize / 2;
  const radius = cellSize / 3;
  const scale = 0.9 + ((Math.sin(time * 0.008) + 1) / 2) * 0.2;
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  gradient.addColorStop(0, '#ffeb3b');
  gradient.addColorStop(1, '#ffc107');

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const outerX = Math.cos(angle) * radius;
    const outerY = Math.sin(angle) * radius;
    const innerAngle = angle + (2 * Math.PI) / 10;
    const innerX = Math.cos(innerAngle) * (radius / 2);
    const innerY = Math.sin(innerAngle) * (radius / 2);
    if (i === 0) {
      ctx.moveTo(outerX, outerY);
    } else {
      ctx.lineTo(outerX, outerY);
    }
    ctx.lineTo(innerX, innerY);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = '#ffeb3b';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
};

const drawStaticMap = (ctx: CanvasRenderingContext2D, map: MapData) => {
  const cellSize = getCellSize(map, CANVAS_SIZE);

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#e8f5e9' : '#c8e6c9';
      ctx.fillRect(
        PADDING + x * cellSize,
        PADDING + y * cellSize,
        cellSize,
        cellSize,
      );
    }
  }

  ctx.strokeStyle = '#a5d6a7';
  ctx.lineWidth = 1;
  for (let i = 0; i <= map.width; i++) {
    ctx.beginPath();
    ctx.moveTo(PADDING + i * cellSize, PADDING);
    ctx.lineTo(PADDING + i * cellSize, PADDING + map.height * cellSize);
    ctx.stroke();
  }
  for (let i = 0; i <= map.height; i++) {
    ctx.beginPath();
    ctx.moveTo(PADDING, PADDING + i * cellSize);
    ctx.lineTo(PADDING + map.width * cellSize, PADDING + i * cellSize);
    ctx.stroke();
  }

  map.cells.forEach((cell) => {
    const x = PADDING + cell.x * cellSize;
    const y = PADDING + cell.y * cellSize;
    if (cell.type === 'wall') {
      const wallGradient = ctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
      wallGradient.addColorStop(0, '#78909c');
      wallGradient.addColorStop(1, '#546e7a');
      ctx.fillStyle = wallGradient;
      ctx.fillRect(x, y, cellSize, cellSize);
      ctx.strokeStyle = '#455a64';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cellSize, cellSize);
    }
    if (cell.type === 'goal') {
      const centerX = x + cellSize / 2;
      const centerY = y + cellSize / 2;
      const radius = cellSize / 2;

      ctx.fillStyle = 'rgba(67, 160, 71, 0.2)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(67, 160, 71, 0.3)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 3, 0, Math.PI * 2);
      ctx.fill();

      const goalGradient = ctx.createRadialGradient(
        centerX,
        centerY - radius * 0.3,
        0,
        centerX,
        centerY,
        radius,
      );
      goalGradient.addColorStop(0, '#66bb6a');
      goalGradient.addColorStop(1, '#43a047');
      ctx.fillStyle = goalGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(67, 160, 71, 0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = `bold ${cellSize / 2.5}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏁', centerX, centerY);
    }
  });
};

const GameCanvas: React.FC<GameCanvasProps> = React.memo(
  ({ map, robot, collectedStars = [] }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const offscreenRef = useRef<HTMLCanvasElement | null>(null);
    const animatedRobotRef = useRef(robot);
    const starsRef = useRef(collectedStars);
    const tweenFrameRef = useRef<number | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // 让绘制循环读取最新数据，而不必重启 requestAnimationFrame
    starsRef.current = collectedStars;

    // 机器人位置补间动画
    useEffect(() => {
      const start = { ...animatedRobotRef.current };
      const target = { ...robot };
      const distance = Math.hypot(target.x - start.x, target.y - start.y);

      if (distance < 0.001) {
        animatedRobotRef.current = target;
        return;
      }

      const duration = Math.min(400, Math.max(120, distance * 180));
      const startTime = performance.now();

      const tick = (now: number) => {
        const progress = Math.min(1, (now - startTime) / duration);
        const eased = 1 - (1 - progress) * (1 - progress);
        animatedRobotRef.current = {
          x: start.x + (target.x - start.x) * eased,
          y: start.y + (target.y - start.y) * eased,
          dir: target.dir,
        };
        if (progress < 1) {
          tweenFrameRef.current = requestAnimationFrame(tick);
        }
      };

      tweenFrameRef.current = requestAnimationFrame(tick);
      return () => {
        if (tweenFrameRef.current !== null) {
          cancelAnimationFrame(tweenFrameRef.current);
          tweenFrameRef.current = null;
        }
      };
    }, [robot]);

    // 单一渲染循环：静态地图离屏缓存，动态元素每帧绘制
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = CANVAS_SIZE * dpr;
      canvas.height = CANVAS_SIZE * dpr;
      canvas.style.width = 'min(100%, 400px)';
      canvas.style.height = 'auto';

      const offscreen = document.createElement('canvas');
      offscreen.width = CANVAS_SIZE * dpr;
      offscreen.height = CANVAS_SIZE * dpr;
      const offscreenCtx = offscreen.getContext('2d');
      if (!offscreenCtx) return;
      offscreenCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawStaticMap(offscreenCtx, map);
      offscreenRef.current = offscreen;

      const cellSize = getCellSize(map, CANVAS_SIZE);

      const animate = (time: number) => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.drawImage(offscreen, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

        const collected = starsRef.current;
        map.stars.forEach((star) => {
          const isCollected = collected.some(
            (item) => item.x === star.x && item.y === star.y,
          );
          if (!isCollected) {
            drawStar(ctx, star.x, star.y, cellSize, time);
          }
        });

        const animated = animatedRobotRef.current;
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        drawRobot(ctx, animated.x, animated.y, animated.dir, cellSize, time);
        ctx.restore();

        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        offscreenRef.current = null;
      };
    }, [map]);

    return (
      <div className={styles.gameCanvasContainer}>
        <canvas
          ref={canvasRef}
          className={styles.gameCanvas}
          role="img"
          aria-label="游戏地图"
        />
      </div>
    );
  },
);

export default GameCanvas;