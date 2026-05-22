import React, { useRef, useEffect, useState } from 'react';
import { Direction, MapData } from '@/types/global';
import styles from './index.module.scss';

export interface GameCanvasProps {
  map: MapData;
  robot: { x: number; y: number; dir: Direction };
  collectedStars?: {x: number, y: number}[];
  isExecuting?: boolean;
}

const GameCanvas: React.FC<GameCanvasProps> = React.memo(({ map, robot, collectedStars = [], isExecuting = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>();
  const [animatedRobot, setAnimatedRobot] = useState(robot);
  const [isAnimating, setIsAnimating] = useState(false);

  // 绘制可爱的机器人
  const drawRobot = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    direction: Direction,
    cellSize: number,
    time: number = 0,
    padding: number = 20
  ) => {
    // 计算单元格中心，确保机器人在单元格内居中（加上内边距）
    const centerX = padding + x + cellSize / 2;
    const centerY = padding + y + cellSize / 2;
    // 调整机器人大小，确保不会被边框遮挡
    const bodyRadius = cellSize / 2.5;
    // 确保机器人在单元格内居中，避免被边框遮挡
    const adjustedX = centerX;
    const adjustedY = centerY;

    // 轻微的弹跳动画
    const bounceOffset = Math.sin(time * 0.005) * 3;

    // 绘制机器人身体（圆形）
    const gradient = ctx.createRadialGradient(
      adjustedX - 5,
      adjustedY - 5 + bounceOffset,
      0,
      adjustedX,
      adjustedY + bounceOffset,
      bodyRadius
    );
    gradient.addColorStop(0, '#64b5f6');
    gradient.addColorStop(1, '#1976d2');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(adjustedX, adjustedY + bounceOffset, bodyRadius, 0, Math.PI * 2);
    ctx.fill();

    // 绘制机器人眼睛
    ctx.fillStyle = '#fff';
    const eyeOffset = bodyRadius / 3;
    ctx.beginPath();
    ctx.arc(adjustedX - eyeOffset, adjustedY - 5 + bounceOffset, bodyRadius / 4, 0, Math.PI * 2);
    ctx.arc(adjustedX + eyeOffset, adjustedY - 5 + bounceOffset, bodyRadius / 4, 0, Math.PI * 2);
    ctx.fill();

    // 绘制瞳孔（跟随方向）
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
      adjustedX - eyeOffset + pupilOffsetX,
      adjustedY - 5 + bounceOffset,
      bodyRadius / 8,
      0,
      Math.PI * 2
    );
    ctx.arc(
      adjustedX + eyeOffset + pupilOffsetX,
      adjustedY - 5 + bounceOffset,
      bodyRadius / 8,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // 绘制微笑嘴巴
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(adjustedX, adjustedY + 3 + bounceOffset, bodyRadius / 3, 0, Math.PI);
    ctx.stroke();

    // 绘制小天线
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(adjustedX, adjustedY - bodyRadius + bounceOffset);
    ctx.lineTo(adjustedX, adjustedY - bodyRadius - 10 + bounceOffset);
    ctx.stroke();

    // 绘制天线顶端的小球（闪烁效果）
    const blinkIntensity = (Math.sin(time * 0.01) + 1) / 2;
    ctx.fillStyle = `rgba(255, 87, 87, ${0.5 + blinkIntensity * 0.5})`;
    ctx.beginPath();
    ctx.arc(adjustedX, adjustedY - bodyRadius - 10 + bounceOffset, 4, 0, Math.PI * 2);
    ctx.fill();

    // 绘制方向指示器
    const dirX = adjustedX;
    const dirY = adjustedY + bounceOffset;
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

  // 绘制星星
  const drawStar = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    cellSize: number,
    time: number,
    padding: number = 20
  ) => {
    const centerX = padding + x + cellSize / 2;
    const centerY = padding + y + cellSize / 2;
    const radius = cellSize / 3;

    // 闪烁效果
    const scale = 0.9 + ((Math.sin(time * 0.008) + 1) / 2) * 0.2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    // 星星渐变
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    gradient.addColorStop(0, '#ffeb3b');
    gradient.addColorStop(1, '#ffc107');

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

    // 星星发光效果
    ctx.shadowColor = '#ffeb3b';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  };

  // 机器人状态变化时的动画效果
  useEffect(() => {
    setIsAnimating(true);
    
    // 计算动画时间
    const distance = Math.sqrt(
      Math.pow(robot.x - animatedRobot.x, 2) + Math.pow(robot.y - animatedRobot.y, 2)
    );
    const duration = Math.max(300, distance * 200); // 基础动画时间，根据距离调整
    
    const startTime = Date.now();
    const startRobot = { ...animatedRobot };
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 缓动函数
      const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);
      const easedProgress = easeOutQuad(progress);
      
      // 插值计算新位置
      const newX = startRobot.x + (robot.x - startRobot.x) * easedProgress;
      const newY = startRobot.y + (robot.y - startRobot.y) * easedProgress;
      
      setAnimatedRobot({
        x: newX,
        y: newY,
        dir: robot.dir // 直接切换方向，不做动画
      });
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setAnimatedRobot(robot);
        setIsAnimating(false);
      }
    };
    
    animate();
  }, [robot]);

  // 离屏渲染 - 绘制静态元素
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 创建离屏Canvas
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = canvas.width;
    offscreenCanvas.height = canvas.height;
    offscreenCanvasRef.current = offscreenCanvas;

    const offscreenCtx = offscreenCanvas.getContext('2d');
    if (!offscreenCtx) return;

    // 设定内边距，用于容纳机器人天线
    const padding = 20;
    // 计算单元格大小（考虑内边距）
    const cellSize = Math.min((canvas.width - padding * 2) / map.width, (canvas.height - padding * 2) / map.height);

    // 绘制背景网格
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const isEven = (x + y) % 2 === 0;
        offscreenCtx.fillStyle = isEven ? '#e8f5e9' : '#c8e6c9';
        offscreenCtx.fillRect(padding + x * cellSize, padding + y * cellSize, cellSize, cellSize);
      }
    }

    // 绘制网格线
    offscreenCtx.strokeStyle = '#a5d6a7';
    offscreenCtx.lineWidth = 1;
    for (let i = 0; i <= map.width; i++) {
      offscreenCtx.beginPath();
      offscreenCtx.moveTo(padding + i * cellSize, padding);
      offscreenCtx.lineTo(padding + i * cellSize, padding + map.height * cellSize);
      offscreenCtx.stroke();
    }
    for (let i = 0; i <= map.height; i++) {
      offscreenCtx.beginPath();
      offscreenCtx.moveTo(padding, padding + i * cellSize);
      offscreenCtx.lineTo(padding + map.width * cellSize, padding + i * cellSize);
      offscreenCtx.stroke();
    }

    // 绘制障碍物
    map.cells.forEach((cell) => {
      if (cell.type === 'wall') {
        // 障碍物渐变
        const wallGradient = offscreenCtx.createLinearGradient(
          padding + cell.x * cellSize,
          padding + cell.y * cellSize,
          padding + cell.x * cellSize + cellSize,
          padding + cell.y * cellSize + cellSize
        );
        wallGradient.addColorStop(0, '#78909c');
        wallGradient.addColorStop(1, '#546e7a');

        offscreenCtx.fillStyle = wallGradient;
        offscreenCtx.fillRect(padding + cell.x * cellSize, padding + cell.y * cellSize, cellSize, cellSize);

        // 障碍物边框
        offscreenCtx.strokeStyle = '#455a64';
        offscreenCtx.lineWidth = 2;
        offscreenCtx.strokeRect(padding + cell.x * cellSize, padding + cell.y * cellSize, cellSize, cellSize);
      }
      if (cell.type === 'goal') {
        const centerX = padding + cell.x * cellSize + cellSize / 2;
        const centerY = padding + cell.y * cellSize + cellSize / 2;
        const radius = cellSize / 2;

        offscreenCtx.fillStyle = 'rgba(67, 160, 71, 0.2)';
        offscreenCtx.beginPath();
        offscreenCtx.arc(centerX, centerY, radius + 6, 0, Math.PI * 2);
        offscreenCtx.fill();

        offscreenCtx.fillStyle = 'rgba(67, 160, 71, 0.3)';
        offscreenCtx.beginPath();
        offscreenCtx.arc(centerX, centerY, radius + 3, 0, Math.PI * 2);
        offscreenCtx.fill();

        const goalGradient = offscreenCtx.createRadialGradient(
          centerX,
          centerY - radius * 0.3,
          0,
          centerX,
          centerY,
          radius
        );
        goalGradient.addColorStop(0, '#66bb6a');
        goalGradient.addColorStop(1, '#43a047');

        offscreenCtx.fillStyle = goalGradient;
        offscreenCtx.beginPath();
        offscreenCtx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
        offscreenCtx.fill();

        offscreenCtx.strokeStyle = 'rgba(67, 160, 71, 0.5)';
        offscreenCtx.lineWidth = 3;
        offscreenCtx.beginPath();
        offscreenCtx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
        offscreenCtx.stroke();

        offscreenCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        offscreenCtx.font = `bold ${cellSize / 2.5}px Arial`;
        offscreenCtx.textAlign = 'center';
        offscreenCtx.textBaseline = 'middle';
        offscreenCtx.fillText(
          '🏁',
          centerX,
          centerY
        );
      }
    });

  }, [map]);

  // 主渲染循环 - 绘制动态元素
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationTime = 0;
    const padding = 20;

    const animate = () => {
      // 清空画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 计算单元格大小（考虑内边距）
      const cellSize = Math.min((canvas.width - padding * 2) / map.width, (canvas.height - padding * 2) / map.height);

      // 绘制离屏Canvas内容（静态元素）
      if (offscreenCanvasRef.current) {
        ctx.drawImage(offscreenCanvasRef.current, 0, 0);
      }

      // 绘制星星（有动画效果）
      map.stars.forEach((star) => {
        // 检查星星是否已被收集
        const isCollected = collectedStars.some((collected) => collected.x === star.x && collected.y === star.y);
        if (!isCollected) {
          drawStar(ctx, star.x * cellSize, star.y * cellSize, cellSize, animationTime, padding);
        }
      });

      // 绘制机器人（确保在最顶层）
      ctx.save();
      ctx.globalCompositeOperation = 'source-over'; // 确保机器人绘制在所有元素之上
      drawRobot(
        ctx,
        animatedRobot.x * cellSize,
        animatedRobot.y * cellSize,
        animatedRobot.dir,
        cellSize,
        animationTime,
        padding
      );
      ctx.restore();

      animationTime += 16; // 约60fps
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [map, animatedRobot, collectedStars]);

  return (
    <div className={styles.gameCanvasContainer}>
      <canvas ref={canvasRef} width={400} height={400} className={styles.gameCanvas} />
    </div>
  );
});

export default GameCanvas;
