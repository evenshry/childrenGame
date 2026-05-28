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
      setIsCustomLevel(false);
      onMapChange(firstLevel.map);
      if (onLevelSelect) {
        onLevelSelect(firstLevel.id);
      }
    }
  }, [levels]);

  useEffect(() => {
    if (currentLevelId) {
      setWidth(map.width);
      setHeight(map.height);
      setCells(map.cells);
      setStars(map.stars);
      setEditingLevelId(currentLevelId);
      const isCustom = !levels.some(l => l.id === currentLevelId);
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
      setIsCustomLevel(false);
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
 
    const newLevelId = `custom_${generateId()}`;
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
 
  const saveCurrentCustomLevel = () => {
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
        map: { width, height, cells, stars },
        minCommands: originalLevel?.minCommands || 1,
        hint: originalLevel?.hint || '自定义关卡',
      };
      customLevelStorage.save(updatedLevel);
      
      if (!isCustomLevel) {
        setIsCustomLevel(true);
      }
      
      const updatedMap = { width, height, cells, stars };
      onMapChange(updatedMap);
      
      if (onCreateNewLevel) {
        onCreateNewLevel();
      }
      
      setNotification({
        message: `已保存关卡 "${editingLevelName.trim()}"`,
        type: 'success'
      });
    } else {
      const newLevelId = `custom_${generateId()}`;
      const newLevel: Level = {
        id: newLevelId,
        name: editingLevelName.trim(),
        map: { width, height, cells, stars },
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
    const newLevelId = `custom_${generateId()}`;
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
      saveCurrentCustomLevel();
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
        saveCurrentCustomLevel();
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
              onClick={() => {
                playClickSound();
                setSelectedTool('wall');
              }}
              title="墙壁"
            >
              🧱
            </button>
            <button
              className={`${styles.toolButton} ${selectedTool === 'goal' ? styles.active : ''} ${styles.goalTool}`}
              onClick={() => {
                playClickSound();
                setSelectedTool('goal');
              }}
              title="终点"
            >
              🚩
            </button>
            <button
              className={`${styles.toolButton} ${selectedTool === 'robot' ? styles.active : ''} ${styles.robotTool}`}
              onClick={() => {
                playClickSound();
                setSelectedTool('robot');
              }}
              title="机器人"
            >
              🤖
            </button>
            <button
              className={`${styles.toolButton} ${selectedTool === 'star' ? styles.active : ''} ${styles.starTool}`}
              onClick={() => {
                playClickSound();
                setSelectedTool('star');
              }}
              title="星星"
            >
              ⭐
            </button>
            <button
              className={`${styles.toolButton} ${selectedTool === 'empty' ? styles.active : ''} ${styles.emptyTool}`}
              onClick={() => {
                playClickSound();
                setSelectedTool('empty');
              }}
              title="清除"
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
 
              let cellClass = styles.gridCell;
              let cellContent: React.ReactNode = '';
 
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
                case 'robot':
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
              } else if (star) {
                cellClass += ` ${styles.star}`;
                cellContent = '⭐';
              }
 
              return (
                <div
                  key={`${x}-${y}`}
                  className={cellClass}
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