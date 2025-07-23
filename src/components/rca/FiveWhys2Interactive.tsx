
'use client';
import { FC, useCallback, useState, useEffect } from 'react';
import type { CTMData, FailureMode } from '@/types/rca';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { PlusCircle, Trash2, GitBranchPlus, HelpCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

let idCounter = Date.now();
const generateClientSideId = (prefix: string) => {
    idCounter++;
    return `${prefix}-${idCounter}`;
};

interface FiveWhys2InteractiveProps {
  whyWhy2Data: CTMData;
  onSetWhyWhy2Data: (data: CTMData) => void;
  focusEventDescription: string;
}

interface WhyLevelProps {
  levelData: FailureMode;
  path: number[];
  level: number;
  onUpdate: (path: number[], newDescription: string) => void;
  onAdd: (path: number[]) => void;
  onRemove: (path: number[]) => void;
}

const WhyLevel: FC<WhyLevelProps> = ({ levelData, path, level, onUpdate, onAdd, onRemove }) => {
  return (
    <Card className="p-3 bg-card shadow-sm w-full">
      <div className="flex justify-between items-start mb-2">
        <Label htmlFor={`why-desc-${levelData.id}`} className="font-semibold text-primary flex items-center">
          <GitBranchPlus className="mr-2 h-4 w-4" /> Por qué #{level}
        </Label>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(path)}
          aria-label={`Eliminar por qué #${level}`}
          className="h-7 w-7"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <Textarea
        id={`why-desc-${levelData.id}`}
        value={levelData.description}
        onChange={(e) => onUpdate(path, e.target.value)}
        placeholder="Describa el porqué o la causa..."
        rows={2}
        className="text-sm w-full"
      />
      <div className="pl-6 mt-3 border-l-2 border-primary/20 space-y-3">
        {levelData.nestedWhys?.map((nestedWhy, index) => (
          <WhyLevel
            key={nestedWhy.id}
            levelData={nestedWhy}
            path={[...path, index]}
            level={level + 1}
            onUpdate={onUpdate}
            onAdd={onAdd}
            onRemove={onRemove}
          />
        ))}
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7"
          onClick={() => onAdd(path)}
        >
          <PlusCircle className="mr-1 h-3 w-3" /> Añadir Causa (siguiente Por qué)
        </Button>
      </div>
    </Card>
  );
};


export const FiveWhys2Interactive: FC<FiveWhys2InteractiveProps> = ({ whyWhy2Data, onSetWhyWhy2Data, focusEventDescription }) => {
  
  const [internalData, setInternalData] = useState<CTMData>(() => whyWhy2Data || []);

  useEffect(() => {
    setInternalData(whyWhy2Data || []);
  }, [whyWhy2Data]);

  const updateParentState = (newData: CTMData) => {
    setInternalData(newData);
    onSetWhyWhy2Data(newData);
  };
  
  const handleUpdate = (path: number[], newDescription: string) => {
    const newData = JSON.parse(JSON.stringify(internalData));
    let currentLevel = newData;
    for (let i = 0; i < path.length -1; i++) {
        currentLevel = currentLevel[path[i]].nestedWhys!;
    }
    currentLevel[path[path.length - 1]].description = newDescription;
    updateParentState(newData);
  };

  const handleAdd = (path: number[]) => {
      const newData = JSON.parse(JSON.stringify(internalData));
      
      if (path.length === 0) { // Adding a root "why"
          const description = newData.length === 0 ? `¿Por qué ocurrió: "${focusEventDescription}"?` : 'Nuevo Por qué';
          newData.push({
              id: generateClientSideId('fm'),
              description: description,
              hypotheses: [], // Kept for type compatibility, but not used visually
              nestedWhys: []
          });
      } else { // Adding a nested "why"
          let currentLevel = newData;
          for (let i = 0; i < path.length; i++) {
              if (!currentLevel[path[i]].nestedWhys) {
                  currentLevel[path[i]].nestedWhys = [];
              }
              if (i < path.length - 1) {
                  currentLevel = currentLevel[path[i]].nestedWhys!;
              } else {
                   currentLevel[path[i]].nestedWhys!.push({
                      id: generateClientSideId('fm'),
                      description: 'Nueva Causa...',
                      hypotheses: [],
                      nestedWhys: []
                  });
              }
          }
      }
      updateParentState(newData);
  };

  const handleRemove = (path: number[]) => {
    const newData = JSON.parse(JSON.stringify(internalData));
    if (path.length === 1) { // Removing a root "why"
        newData.splice(path[0], 1);
    } else { // Removing a nested "why"
        let currentLevel = newData;
        for (let i = 0; i < path.length - 2; i++) {
            currentLevel = currentLevel[path[i]].nestedWhys!;
        }
        currentLevel[path[path.length - 2]].nestedWhys!.splice(path[path.length - 1], 1);
    }
    updateParentState(newData);
  };

  return (
    <div className="space-y-4 mt-4 p-4 border rounded-lg shadow-sm bg-background">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-lg font-semibold font-headline text-primary flex items-center">
          <HelpCircle className="mr-2 h-5 w-5" /> 5 Porqués 2.0 (Anidado)
        </h3>
      </div>
      <div className="space-y-4">
        {internalData.length > 0 ? (
          internalData.map((rootWhy, index) => (
            <WhyLevel
              key={rootWhy.id}
              levelData={rootWhy}
              path={[index]}
              level={1}
              onUpdate={handleUpdate}
              onAdd={handleAdd}
              onRemove={handleRemove}
            />
          ))
        ) : (
          <div className="text-center text-muted-foreground italic py-4 w-full">
            Haga clic en "Añadir Por qué" para comenzar. El primero se basará en la Descripción del Evento Foco.
          </div>
        )}
        <Button onClick={() => handleAdd([])} variant="outline" className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Por qué
        </Button>
      </div>
    </div>
  );
};
