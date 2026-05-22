export interface CanvasRenderConfig {
  width: number;
  height: number;
  pixelRatio?: number;
  antialias?: boolean;
  alpha?: boolean;
}

export class OptimizedCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offScreenCanvas: HTMLCanvasElement;
  private offScreenCtx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private pixelRatio: number;
  private needsRedraw: boolean = true;
  private animationFrameId: number | null = null;
  private layers: Map<string, HTMLCanvasElement> = new Map();
  private renderQueue: Map<string, () => void> = new Map();
  private lastRenderTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;
  private readonly targetFPS: number = 60;
  private readonly frameInterval: number = 1000 / 60;

  constructor(canvas: HTMLCanvasElement, config: CanvasRenderConfig) {
    this.canvas = canvas;
    this.width = config.width;
    this.height = config.height;
    this.pixelRatio = config.pixelRatio || Math.min(window.devicePixelRatio || 1, 2);

    this.setupCanvas();
    this.ctx = this.canvas.getContext('2d', {
      alpha: config.alpha ?? false,
      desynchronized: true,
    })!;

    this.offScreenCanvas = document.createElement('canvas');
    this.offScreenCanvas.width = this.width * this.pixelRatio;
    this.offScreenCanvas.height = this.height * this.pixelRatio;
    this.offScreenCtx = this.offScreenCanvas.getContext('2d', {
      alpha: true,
      desynchronized: true,
    })!;

    this.setupLayers();
  }

  private setupCanvas() {
    this.canvas.width = this.width * this.pixelRatio;
    this.canvas.height = this.height * this.pixelRatio;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.canvas.getContext('2d', { alpha: false });
  }

  private setupLayers() {
    const layerNames = ['background', 'grid', 'obstacles', 'stars', 'robot', 'effects', 'ui'];
    layerNames.forEach(name => {
      const layerCanvas = document.createElement('canvas');
      layerCanvas.width = this.width * this.pixelRatio;
      layerCanvas.height = this.height * this.pixelRatio;
      const layerCtx = layerCanvas.getContext('2d', { alpha: true })!;
      this.layers.set(name, layerCanvas);
    });
  }

  public getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  public getLayer(name: string): HTMLCanvasElement | undefined {
    return this.layers.get(name);
  }

  public queueRender(layerName: string, renderFn: () => void) {
    this.renderQueue.set(layerName, renderFn);
    this.needsRedraw = true;
  }

  public render() {
    const now = performance.now();
    const elapsed = now - this.lastRenderTime;

    if (elapsed < this.frameInterval) {
      return;
    }

    this.frameCount++;
    if (this.frameCount >= 60) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
    }

    this.lastRenderTime = now - (elapsed % this.frameInterval);

    if (!this.needsRedraw) {
      return;
    }

    this.renderQueue.forEach((renderFn, layerName) => {
      const layerCanvas = this.layers.get(layerName);
      if (layerCanvas) {
        const layerCtx = layerCanvas.getContext('2d')!;
        layerCtx.clearRect(0, 0, layerCanvas.width, layerCanvas.height);
        renderFn();
      }
    });

    this.compose();
    this.needsRedraw = false;
  }

  private compose() {
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.layers.forEach((layerCanvas) => {
      this.ctx.drawImage(layerCanvas, 0, 0, this.width, this.height);
    });
  }

  public startAnimation(callback: () => void) {
    const animate = () => {
      this.render();
      callback();
      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  public stopAnimation() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public markDirty() {
    this.needsRedraw = true;
  }

  public clear() {
    this.layers.forEach(layerCanvas => {
      const layerCtx = layerCanvas.getContext('2d')!;
      layerCtx.clearRect(0, 0, layerCanvas.width, layerCanvas.height);
    });
    this.renderQueue.clear();
    this.markDirty();
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.setupCanvas();

    this.layers.forEach(layerCanvas => {
      layerCanvas.width = width * this.pixelRatio;
      layerCanvas.height = height * this.pixelRatio;
    });

    this.markDirty();
  }

  public getFPS(): number {
    return this.fps;
  }

  public destroy() {
    this.stopAnimation();
    this.clear();
    this.layers.clear();
    this.renderQueue.clear();
  }
}

export const createOffscreenRenderer = (
  width: number,
  height: number,
  pixelRatio: number = 1
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } => {
  const canvas = document.createElement('canvas');
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;

  const ctx = canvas.getContext('2d', {
    alpha: true,
    desynchronized: true,
  })!;

  return { canvas, ctx };
};

export const renderToOffscreen = async <T>(
  width: number,
  height: number,
  renderFn: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => T
): Promise<{ canvas: HTMLCanvasElement; result: T }> => {
  const { canvas, ctx } = createOffscreenRenderer(width, height);

  const result = renderFn(ctx, canvas);

  return { canvas, result };
};

export const optimizeSpriteDrawing = (
  ctx: CanvasRenderingContext2D,
  sprite: HTMLImageElement | HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    rotation?: number;
    scale?: number;
    alpha?: number;
    flipX?: boolean;
    flipY?: boolean;
  } = {}
) => {
  ctx.save();

  const centerX = x + width / 2;
  const centerY = y + height / 2;

  ctx.translate(centerX, centerY);

  if (options.rotation) {
    ctx.rotate(options.rotation);
  }

  if (options.scale) {
    ctx.scale(options.scale, options.scale);
  }

  if (options.flipX || options.flipY) {
    ctx.scale(options.flipX ? -1 : 1, options.flipY ? -1 : 1);
  }

  if (options.alpha !== undefined) {
    ctx.globalAlpha = options.alpha;
  }

  ctx.drawImage(
    sprite,
    -width / 2,
    -height / 2,
    width,
    height
  );

  ctx.restore();
};

export class SpriteCache {
  private cache: Map<string, HTMLCanvasElement> = new Map();
  private maxSize: number;
  private accessOrder: string[] = [];

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  public get(key: string): HTMLCanvasElement | undefined {
    const cached = this.cache.get(key);
    if (cached) {
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      this.accessOrder.push(key);
    }
    return cached;
  }

  public set(key: string, canvas: HTMLCanvasElement) {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, canvas);
    this.accessOrder.push(key);
  }

  public clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  public get size(): number {
    return this.cache.size;
  }
}

export const drawGrid = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cellSize: number,
  options: {
    strokeStyle?: string;
    lineWidth?: number;
    alpha?: number;
  } = {}
) => {
  ctx.save();

  if (options.alpha !== undefined) {
    ctx.globalAlpha = options.alpha;
  }

  ctx.strokeStyle = options.strokeStyle || '#e0e0e0';
  ctx.lineWidth = options.lineWidth || 1;

  ctx.beginPath();

  for (let x = 0; x <= width; x += cellSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }

  for (let y = 0; y <= height; y += cellSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }

  ctx.stroke();
  ctx.restore();
};

export const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle?: string,
  strokeStyle?: string,
  lineWidth?: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }

  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth || 1;
    ctx.stroke();
  }
};

export const performanceMonitor = {
  frameCount: 0,
  lastTime: 0,
  fps: 0,

  update() {
    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastTime;

    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastTime = now;

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Canvas FPS] ${this.fps}`);
      }
    }
  },

  reset() {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fps = 0;
  },
};
