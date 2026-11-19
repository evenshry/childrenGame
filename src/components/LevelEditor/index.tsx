import React, { useState, useEffect, useRef } from 'react';
import { Modal, Input, InputNumber, Button, Space } from 'antd';
import { MapData, Cell, CellType, Direction, Level } from '@/types/global';
import Notification from '@/components/Notification';
import LevelPicker from '@/components/LevelPicker';
import AIGenButton from './AIGenButton';
import { playClickSound } from '@/utils/animations';
import { customLevelStorage } from '@/utils/storage';
import { generateId, getLevelById } from '@/utils/constants';
import styles from './index.module.scss';
 
export interface LevelEditorProps {
  map: MapData;
  onMapChange: (map: MapData) => void;
  levels?: Level[];
  onLevelSelect?: (levelId: string) => void;
  onCreateNewLevel?: () => void;
  currentLevelId?: string;
}
 
const isCustomLevelId = (id: string) => id.startsWith('custom_') || id.startsWith('ai_');

const createEmptyMap = (width: number = 6, height: number = 6): MapData => ({
  width,
  height,
  cells: [{ x: 0, y: 0, type: 'robot' as CellType, dir: 'right' as Direction }],
  stars: [],
});
 
const LevelEditor: React.FC<LevelEditorProps> = ({ 
  map, 
  onMapChange, 
  levels = [], 
  onLevelSelect,
  onCreateNewLevel,
  currentLevelId 
}) => {
  const [selectedTool, setSelectedTool] = useState<CellType>('wall');
  const [selectedDirection, setSelectedDirection] = useState<Direction>('right');
  const [width, setWidth] = useState(map.width);
  const [height, setHeight] = useState(map.height);
  const [cells, setCells] = useState<Cell[]>(map.cells);
  const [stars, setStars] = useState<Cell[]>(map.stars);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  } | null>(null);
  const [showNewLevelDialog, setShowNewLevelDialog] = useState(false);
  const [newLevelName, setNewLevelName] = useState('');
  const [newLevelWidth, setNewLevelWidth] = useState(6);
  const [newLevelHeight, setNewLevelHeight] = useState(6);
  const [editingLevelId, setEditingLevelId] = useState<string | null>(currentLevelId || null);
  const [editingLevelName, setEditingLevelName] = useState<string>('未命名关卡');
  const [isCustomLevel, setIsCustomLevel] = useState(false);
  const hasInitializedRef = useRef(false);
  const [dragOverCell, setDragOverCell] = useState<{ x: number; y: number } | null>(null);

  const handleMapChange = (newMap: MapData) => {
    setWidth(newMap.width);
    setHeight(newMap.height);
    setCells(newMap.cells);
    setStars(newMap.stars);
    onMapChange(newMap);
  };

  useEffect(() => {
    if (levels.length > 0 && !hasInitializedRef.current && !editingLevelId && !currentLevelId) {
      hasInitializedRef.current = true;
      const firstLevel = levels[0];
      setEditingLevelId(firstLevel.id);
      setEditingLevelName(firstLevel.name);
      setWidth(firstLevel.map.width);
      setHeight(firstLevel.map.height);
      setCells(firstLevel.map.cells);
      setStars(firstLevel.map.stars);
      setIsCustomLevel(isCustomLevelId(firstLevel.id));
      onMapChange(firstLevel.map);
      if (onLevelSelect) {
        onLevelSelect(firstLevel.id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levels]);

  useEffect(() => {
    if (currentLevelId) {
      setWidth(map.width);
      setHeight(map.height);
      setCells(map.cells);
      setStars(map.stars);
      setEditingLevelId(currentLevelId);
      const isCustom = isCustomLevelId(currentLevelId);
      setIsCustomLevel(isCustom);
    }
  }, [map, currentLevelId, levels]);
 
  const handleSelectLevel = (levelId: string) => {
    playClickSound();
    const selectedLevel = levels.find(l => l.id === levelId);
    if (selectedLevel) {
      setEditingLevelId(levelId);
      setEditingLevelName(selectedLevel.name);
      setWidth(selectedLevel.map.width);
      setHeight(selectedLevel.map.height);
      setCells(selectedLevel.map.cells);
      setStars(selectedLevel.map.stars);
      setIsCustomLevel(isCustomLevelId(selectedLevel.id));
      onMapChange(selectedLevel.map);
    } else {
      const customLevel = customLevelStorage.getById(levelId);
      if (customLevel) {
        setEditingLevelId(levelId);
        setEditingLevelName(customLevel.name);
        setWidth(customLevel.map.width);
        setHeight(customLevel.map.height);
        setCells(customLevel.map.cells);
        setStars(customLevel.map.stars);
        setIsCustomLevel(true);
        onMapChange(customLevel.map);
      }
    }
    if (onLevelSelect) {
      onLevelSelect(levelId);
    }
  };
 
  const handleCreateNewLevel = () => {
    playClickSound();
    if (!newLevelName.trim()) {
      setNotification({
        message: '请输入关卡名称',
        type: 'warning'
      });
      return;
    }
 
    const newLevelId = generateId('custom');
    const newMap = createEmptyMap(newLevelWidth, newLevelHeight);
    const newLevel: Level = {
      id: newLevelId,
      name: newLevelName,
      map: newMap,
      minCommands: 1,
      hint: '自定义关卡',
    };
 
    customLevelStorage.save(newLevel);
 
    setEditingLevelName(newLevelName);
    setWidth(newLevelWidth);
    setHeight(newLevelHeight);
    setCells(newMap.cells);
    setStars(newMap.stars);
    onMapChange(newMap);
    setEditingLevelId(newLevelId);
    setIsCustomLevel(true);
    setShowNewLevelDialog(false);
    setNewLevelName('');
 
    if (onCreateNewLevel) {
      onCreateNewLevel();
    }
 
    setNotification({
      message: `已创建新关卡 "${newLevelName}"`,
      type: 'success'
    });
  };
 
  const saveCurrentCustomLevel = (
    mapToSave: MapData = { width, height, cells, stars },
  ) => {
    if (!editingLevelName.trim()) {
      setNotification({
        message: '请输入关卡名称',
        type: 'warning'
      });
      return;
    }

    if (editingLevelId) {
      const originalLevel = customLevelStorage.getById(editingLevelId) || getLevelById(editingLevelId);
      const updatedLevel: Level = {
        ...(originalLevel || {}),
        id: editingLevelId,
        name: editingLevelName.trim(),
        map: mapToSave,
        minCommands: originalLevel?.minCommands || 1,
        hint: originalLevel?.hint || '自定义关卡',
      };
      customLevelStorage.save(updatedLevel);
      
      if (!isCustomLevel) {
        setIsCustomLevel(true);
      }
      
      onMapChange(mapToSave);
      
      if (onCreateNewLevel) {
        onCreateNewLevel();
      }
      
      setNotification({
        message: `已保存关卡 "${editingLevelName.trim()}"`,
        type: 'success'
      });
    } else {
      const newLevelId = generateId('custom');
      const newLevel: Level = {
        id: newLevelId,
        name: editingLevelName.trim(),
        map: mapToSave,
        minCommands: 1,
        hint: '自定义关卡',
      };
      customLevelStorage.save(newLevel);
      setEditingLevelId(newLevelId);
      setIsCustomLevel(true);
      
      if (onCreateNewLevel) {
        onCreateNewLevel();
      }
      
      setNotification({
        message: `已创建新关卡 "${editingLevelName.trim()}"`,
        type: 'success'
      });
    }
  };

  const handleCreateNewLevelFromAI = (map: MapData) => {
    const newLevelId = generateId('custom');
    const newLevelName = `AI关卡 ${new Date().toLocaleString()}`;
    const newLevel: Level = {
      id: newLevelId,
      name: newLevelName,
      map: map,
      minCommands: 1,
      hint: 'AI生成的关卡',
    };
    
    customLevelStorage.save(newLevel);
    
    setEditingLevelId(newLevelId);
    setEditingLevelName(newLevelName);
    setWidth(map.width);
    setHeight(map.height);
    setCells(map.cells);
    setStars(map.stars);
    setIsCustomLevel(true);
    onMapChange(map);
    
    if (onCreateNewLevel) {
      onCreateNewLevel();
    }
  };
 
  const handleSizeChange = (newWidth: number, newHeight: number) => {
    const validWidth = Math.max(3, Math.min(20, newWidth));
    const validHeight = Math.max(3, Math.min(20, newHeight));
 
    setWidth(validWidth);
    setHeight(validHeight);
 
    const filteredCells = cells.filter(
      (cell) => cell.x < validWidth && cell.y < validHeight
    );
    const filteredStars = stars.filter(
      (star) => star.x < validWidth && star.y < validHeight
    );
 
    setCells(filteredCells);
    setStars(filteredStars);
 
    const newMap = {
      ...map,
      width: validWidth,
      height: validHeight,
      cells: filteredCells,
      stars: filteredStars,
    };
    onMapChange(newMap);
 
    if (isCustomLevel && editingLevelId) {
      saveCurrentCustomLevel(newMap);
    }
  };
 
  const handleCellClick = (x: number, y: number) => {
    playClickSound();
 
    const updateMap = (newCells: Cell[], newStars: Cell[]) => {
      setCells(newCells);
      setStars(newStars);
      const newMap = { ...map, cells: newCells, stars: newStars };
      onMapChange(newMap);
      if (isCustomLevel && editingLevelId) {
        saveCurrentCustomLevel(newMap);
      }
    };
    
    const robotIndex = cells.findIndex(
      (cell) => cell.type === 'robot' && cell.x === x && cell.y === y
    );
    if (robotIndex !== -1) {
      if (selectedTool === 'robot') {
        const updatedCells = cells.filter((_, index) => index !== robotIndex);
        updateMap(updatedCells, stars);
      } else {
        const updatedCells = cells.filter((_, index) => index !== robotIndex);
        if (selectedTool === 'star') {
          const updatedStars: Cell[] = [...stars, { x, y, type: 'star' as CellType }];
          updateMap(updatedCells, updatedStars);
        } else if (selectedTool !== 'empty') {
          const newCell: Cell = { x, y, type: selectedTool };
          updatedCells.push(newCell);
          updateMap(updatedCells, stars);
        } else {
          updateMap(updatedCells, stars);
        }
      }
      return;
    }
 
    const starIndex = stars.findIndex((star) => star.x === x && star.y === y);
    if (starIndex !== -1) {
      if (selectedTool === 'star') {
        const updatedStars = stars.filter((_, index) => index !== starIndex);
        updateMap(cells, updatedStars);
      } else {
        const updatedStars = stars.filter((_, index) => index !== starIndex);
        if (selectedTool !== 'empty') {
          const newCell: Cell = { x, y, type: selectedTool };
          if (selectedTool === 'robot') {
            newCell.dir = selectedDirection;
          }
          let updatedCells = cells;
          if (selectedTool === 'robot') {
            updatedCells = updatedCells.filter((cell) => cell.type !== 'robot');
          }
          updatedCells = [...updatedCells, newCell];
          updateMap(updatedCells, updatedStars);
        } else {
          updateMap(cells, updatedStars);
        }
      }
      return;
    }
 
    const cellIndex = cells.findIndex((cell) => cell.x === x && cell.y === y);
 
    if (cellIndex !== -1) {
      const existingCell = cells[cellIndex];
      if (selectedTool === 'empty' || existingCell.type === selectedTool) {
        const updatedCells = cells.filter((_, index) => index !== cellIndex);
        updateMap(updatedCells, stars);
      } else if (selectedTool === 'robot') {
        let updatedCells = cells.filter((cell) => cell.type !== 'robot');
        updatedCells = updatedCells.filter((_, index) => index !== cellIndex);
        updatedCells.push({ x, y, type: 'robot', dir: selectedDirection });
        updateMap(updatedCells, stars);
      } else {
        const updatedCells = [...cells];
        updatedCells[cellIndex] = {
          ...updatedCells[cellIndex],
          type: selectedTool,
        };
        updateMap(updatedCells, stars);
      }
    } else {
      if (selectedTool === 'star') {
        const updatedStars: Cell[] = [...stars, { x, y, type: 'star' as CellType }];
        updateMap(cells, updatedStars);
      } else if (selectedTool !== 'empty') {
        const newCell: Cell = { x, y, type: selectedTool };
        if (selectedTool === 'robot') {
          newCell.dir = selectedDirection;
        }
        let updatedCells = [...cells];
 
        if (selectedTool === 'robot') {
          updatedCells = updatedCells.filter((cell) => cell.type !== 'robot');
        }
 
        updatedCells.push(newCell);
        updateMap(updatedCells, stars);
      }
    }
  };

  // === 拖拽功能 ===

  const handleToolDragStart = (e: React.DragEvent<HTMLButtonElement>, tool: CellType) => {
    e.dataTransfer.setData('tool', tool);
    e.dataTransfer.setData('direction', selectedDirection);
    e.dataTransfer.effectAllowed = 'copy';
    setSelectedTool(tool);
  };

  const handleCellDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    x: number,
    y: number
  ) => {
    const cell = cells.find((c) => c.x === x && c.y === y);
    const star = stars.find((s) => s.x === x && s.y === y);

    if (cell) {
      e.dataTransfer.setData('source', 'cell');
      e.dataTransfer.setData('tool', cell.type);
      e.dataTransfer.setData('direction', cell.dir || selectedDirection);
      e.dataTransfer.setData('fromX', String(x));
      e.dataTransfer.setData('fromY', String(y));
      e.dataTransfer.effectAllowed = 'move';
    } else if (star) {
      e.dataTransfer.setData('source', 'star');
      e.dataTransfer.setData('tool', 'star');
      e.dataTransfer.setData('fromX', String(x));
      e.dataTransfer.setData('fromY', String(y));
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleGridDragOver = (e: React.DragEvent<HTMLDivElement>, x: number, y: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = e.dataTransfer.getData('source') ? 'move' : 'copy';
    setDragOverCell({ x, y });
  };

  const handleGridDragLeave = () => {
    setDragOverCell(null);
  };

  const handleGridDrop = (e: React.DragEvent<HTMLDivElement>, x: number, y: number) => {
    e.preventDefault();
    setDragOverCell(null);

    const tool = e.dataTransfer.getData('tool') as CellType;
    const direction = e.dataTransfer.getData('direction') as Direction;
    const source = e.dataTransfer.getData('source');
    const fromXStr = e.dataTransfer.getData('fromX');
    const fromYStr = e.dataTransfer.getData('fromY');
    const fromX = fromXStr !== '' ? parseInt(fromXStr, 10) : null;
    const fromY = fromYStr !== '' ? parseInt(fromYStr, 10) : null;

    let updatedCells = [...cells];
    let updatedStars = [...stars];

    // 如果是从网格中移动元素，先移除原位置的元素
    if (source && fromX !== null && fromY !== null) {
      if (source === 'cell') {
        updatedCells = updatedCells.filter((c) => !(c.x === fromX && c.y === fromY));
      } else if (source === 'star') {
        updatedStars = updatedStars.filter((s) => !(s.x === fromX && s.y === fromY));
      }
    }

    // 如果目标位置已有元素，移除它
    updatedCells = updatedCells.filter((c) => !(c.x === x && c.y === y));
    updatedStars = updatedStars.filter((s) => !(s.x === x && s.y === y));

    if (tool === 'star') {
      updatedStars.push({ x, y, type: 'star' });
    } else if (tool === 'robot') {
      updatedCells = updatedCells.filter((c) => c.type !== 'robot');
      updatedCells.push({ x, y, type: 'robot', dir: direction });
    } else if (tool === 'wall' || tool === 'goal') {
      updatedCells.push({ x, y, type: tool });
    }

    setCells(updatedCells);
    setStars(updatedStars);

    const newMap = {
      ...map,
      cells: updatedCells,
      stars: updatedStars,
    };
    onMapChange(newMap);

    if (isCustomLevel && editingLevelId) {
      saveCurrentCustomLevel(newMap);
    }
  };

  return (
    <div className={styles.levelEditor}>
      <h3 className={styles.editorTitle}>🎨 关卡编辑器</h3>
      
      <div className={styles.toolbar}>
        <div className={styles.toolbarSection}>
          <div className={styles.toolbarLabel}>📋 关卡</div>
          <div className={styles.levelSelection}>
            <LevelPicker
              levels={levels}
              currentLevelId={editingLevelId}
              onSelectLevel={handleSelectLevel}
              onCreateNewLevel={() => {
                playClickSound();
                setShowNewLevelDialog(true);
              }}
              onDeleteLevel={() => {
                playClickSound();
              }}
            />
          </div>
        </div>
 
        <div className={styles.toolbarDivider}></div>
        <div className={styles.toolbarSection}>
          <div className={styles.toolbarLabel}>✏️ 名称</div>
          <div className={styles.levelNameInput}>
            <input
              type="text"
              placeholder="输入关卡名称"
              value={editingLevelName}
              onChange={(e) => setEditingLevelName(e.target.value)}
              className={styles.nameInput}
            />
          </div>
        </div>
        <div className={styles.toolbarSection}>
          <button
            className={styles.saveButton}
            onClick={() => {
              playClickSound();
              saveCurrentCustomLevel();
            }}
          >
            💾 保存
          </button>
          <AIGenButton 
            onMapChange={handleMapChange} 
            onCreateNewLevel={handleCreateNewLevelFromAI}
            currentLevelId={editingLevelId}
          />
        </div>
 
        <div className={styles.toolbarDivider}></div>
 
        <div className={styles.toolbarSection}>
          <div className={styles.toolbarLabel}>🛠️ 工具</div>
          <div className={styles.toolButtons}>
            <button
              className={`${styles.toolButton} ${selectedTool === 'wall' ? styles.active : ''} ${styles.wallTool}`}
              draggable
              onDragStart={(e) => handleToolDragStart(e, 'wall')}
              onClick={() => {
                playClickSound();
                setSelectedTool('wall');
              }}
              title="墙壁（可拖拽到网格）"
            >
              🧱
            </button>
            <button
              className={`${styles.toolButton} ${selectedTool === 'goal' ? styles.active : ''} ${styles.goalTool}`}
              draggable
              onDragStart={(e) => handleToolDragStart(e, 'goal')}
              onClick={() => {
                playClickSound();
                setSelectedTool('goal');
              }}
              title="终点（可拖拽到网格）"
            >
              🚩
            </button>
            <button
              className={`${styles.toolButton} ${selectedTool === 'robot' ? styles.active : ''} ${styles.robotTool}`}
              draggable
              onDragStart={(e) => handleToolDragStart(e, 'robot')}
              onClick={() => {
                playClickSound();
                setSelectedTool('robot');
              }}
              title="机器人（可拖拽到网格）"
            >
              🤖
            </button>
            <button
              className={`${styles.toolButton} ${selectedTool === 'star' ? styles.active : ''} ${styles.starTool}`}
              draggable
              onDragStart={(e) => handleToolDragStart(e, 'star')}
              onClick={() => {
                playClickSound();
                setSelectedTool('star');
              }}
              title="星星（可拖拽到网格）"
            >
              ⭐
            </button>
            <button
              className={`${styles.toolButton} ${selectedTool === 'empty' ? styles.active : ''} ${styles.emptyTool}`}
              draggable
              onDragStart={(e) => handleToolDragStart(e, 'empty')}
              onClick={() => {
                playClickSound();
                setSelectedTool('empty');
              }}
              title="清除（可拖拽到网格）"
            >
              🗑️
            </button>
          </div>
        </div>
 
        {selectedTool === 'robot' && (
          <>
            <div className={styles.toolbarDivider}></div>
            <div className={styles.toolbarSection}>
              <div className={styles.toolbarLabel}>🧭 方向</div>
              <div className={styles.directionButtons}>
                <button
                  className={`${styles.dirButton} ${selectedDirection === 'up' ? styles.active : ''}`}
                  onClick={() => {
                    playClickSound();
                    setSelectedDirection('up');
                  }}
                  title="向上"
                >
                  ⬆️
                </button>
                <button
                  className={`${styles.dirButton} ${selectedDirection === 'down' ? styles.active : ''}`}
                  onClick={() => {
                    playClickSound();
                    setSelectedDirection('down');
                  }}
                  title="向下"
                >
                  ⬇️
                </button>
                <button
                  className={`${styles.dirButton} ${selectedDirection === 'left' ? styles.active : ''}`}
                  onClick={() => {
                    playClickSound();
                    setSelectedDirection('left');
                  }}
                  title="向左"
                >
                  ⬅️
                </button>
                <button
                  className={`${styles.dirButton} ${selectedDirection === 'right' ? styles.active : ''}`}
                  onClick={() => {
                    playClickSound();
                    setSelectedDirection('right');
                  }}
                  title="向右"
                >
                  ➡️
                </button>
              </div>
            </div>
          </>
        )}
 
        <div className={styles.toolbarDivider}></div>
 
        <div className={styles.toolbarSection}>
          <div className={styles.toolbarLabel}>📐 大小</div>
          <div className={styles.sizeControls}>
            <div className={styles.sizeInput}>
              <label>宽</label>
              <input
                type="number"
                min="3"
                max="20"
                value={width}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*$/.test(value) || value === '') {
                    handleSizeChange(value === '' ? 3 : parseInt(value), height);
                  }
                }}
                className={styles.numberInput}
              />
            </div>
            <div className={styles.sizeInput}>
              <label>高</label>
              <input
                type="number"
                min="3"
                max="20"
                value={height}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*$/.test(value) || value === '') {
                    handleSizeChange(width, value === '' ? 3 : parseInt(value));
                  }
                }}
                className={styles.numberInput}
              />
            </div>
          </div>
        </div>
      </div>
 
      <div className={styles.editorCanvas}>
        <div
          className={styles.gridContainer}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${width}, 50px)`,
            gridTemplateRows: `repeat(${height}, 50px)`,
          }}
        >
          {Array.from({ length: height }).map((_, y) =>
            Array.from({ length: width }).map((_, x) => {
              const cell = cells.find((c) => c.x === x && c.y === y);
              const star = stars.find((s) => s.x === x && s.y === y);
              const isDragOver =
                dragOverCell && dragOverCell.x === x && dragOverCell.y === y;

              let cellClass = styles.gridCell;
              let cellContent: React.ReactNode = '';
              const isDraggable = !!(cell || star);

              if (cell) {
                switch (cell.type) {
                case 'wall':
                  cellClass += ` ${styles.wall}`;
                  cellContent = '🧱';
                  break;
                case 'goal':
                  cellClass += ` ${styles.goal}`;
                  cellContent = '🚩';
                  break;
                case 'robot': {
                  cellClass += ` ${styles.robot}`;
                  const dirClass = {
                    up: styles.dirUp,
                    down: styles.dirDown,
                    left: styles.dirLeft,
                    right: styles.dirRight,
                  }[cell.dir || 'right'];
                  cellContent = (
                    <div className={styles.robotCell}>
                      <div className={styles.robotBody}>
                        <div className={styles.robotEyes}>
                          <span className={styles.robotEye}></span>
                          <span className={styles.robotEye}></span>
                        </div>
                        <div className={styles.robotMouth}></div>
                        <div className={styles.robotAntenna}>
                          <div className={styles.robotAntennaBall}></div>
                        </div>
                      </div>
                      <div className={`${styles.robotDirection} ${dirClass}`}></div>
                    </div>
                  );
                  break;
                }
                }
              } else if (star) {
                cellClass += ` ${styles.star}`;
                cellContent = '⭐';
              }

              if (isDragOver) {
                cellClass += ` ${styles.dragOver}`;
              }

              return (
                <div
                  key={`${x}-${y}`}
                  className={cellClass}
                  draggable={isDraggable}
                  onDragStart={(e) => isDraggable && handleCellDragStart(e, x, y)}
                  onDragOver={(e) => handleGridDragOver(e, x, y)}
                  onDragLeave={handleGridDragLeave}
                  onDrop={(e) => handleGridDrop(e, x, y)}
                  onClick={() => handleCellClick(x, y)}
                >
                  {cellContent}
                </div>
              );
            })
          )}
        </div>
      </div>
 
      <Modal
        title="🆕 创建新关卡"
        open={showNewLevelDialog}
        onCancel={() => setShowNewLevelDialog(false)}
        footer={null}
        width={400}
      >
        <div className={styles.newLevelModal}>
          <div className={styles.modalField}>
            <label>关卡名称</label>
            <Input
              placeholder="请输入关卡名称"
              value={newLevelName}
              onChange={(e) => setNewLevelName(e.target.value)}
              onPressEnter={handleCreateNewLevel}
            />
          </div>
          <div className={styles.modalSizeFields}>
            <div className={styles.modalField}>
              <label>宽度</label>
              <InputNumber
                min={3}
                max={20}
                value={newLevelWidth}
                onChange={(value) => setNewLevelWidth(value || 6)}
                style={{ width: '100%' }}
              />
            </div>
            <div className={styles.modalField}>
              <label>高度</label>
              <InputNumber
                min={3}
                max={20}
                value={newLevelHeight}
                onChange={(value) => setNewLevelHeight(value || 6)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <div className={styles.modalActions}>
            <Space>
              <Button onClick={() => setShowNewLevelDialog(false)}>取消</Button>
              <Button type="primary" onClick={handleCreateNewLevel}>
                创建
              </Button>
            </Space>
          </div>
        </div>
      </Modal>
 
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};
 
export default LevelEditor;