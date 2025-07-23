
'use client';
import { FC, useState, useEffect } from 'react';
import type { FiveWhys2Data, WhyNode, WhyBecausePair } from '@/types/rca';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { PlusCircle, Trash2, GitBranchPlus, HelpCircle, CornerDownRight } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

// A simple client-side ID generator to prevent hydration issues.
let idCounter = Date.now();
const generateClientSideId = (prefix: string) => `_why2_${prefix}_${idCounter++}`;

// --- Recursive Component for Rendering a "Why" Node ---
interface WhyNodeComponentProps {
    node: WhyNode;
    level: number;
    path: number[]; // e.g., [0] for the first root, [0, 0] for the first because of the first root
    onUpdate: (path: number[], newWhyText: string) => void;
    onUpdateBecause: (path: number[], becauseIndex: number, newBecauseText: string) => void;
    onAddBecause: (path: number[]) => void;
    onRemoveBecause: (path: number[], becauseIndex: number) => void;
    onAddNextWhy: (path: number[], becauseIndex: number) => void;
    onRemoveNode: (path: number[]) => void;
}

const WhyNodeComponent: FC<WhyNodeComponentProps> = ({ 
    node, level, path, onUpdate, onUpdateBecause, onAddBecause, onRemoveBecause, onAddNextWhy, onRemoveNode
}) => {
    return (
        <Card className="p-3 bg-card shadow-sm w-full">
            <div className="flex justify-between items-start mb-2">
                <Label htmlFor={`why-desc-${node.id}`} className="font-semibold text-primary flex items-center">
                    <GitBranchPlus className="mr-2 h-4 w-4" /> ¿Por qué #{level}?
                </Label>
                {level > 1 && (
                    <Button
                        variant="ghost" size="icon" onClick={() => onRemoveNode(path)}
                        aria-label={`Eliminar por qué #${level}`} className="h-7 w-7"
                    >
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                )}
            </div>
            <Textarea
                id={`why-desc-${node.id}`}
                value={node.why}
                onChange={(e) => onUpdate(path, e.target.value)}
                placeholder="Describa el porqué o la causa..."
                rows={2}
                className="text-sm w-full"
            />
            
            <div className="pl-6 mt-3 border-l-2 border-primary/20 space-y-3">
                {node.becauses.map((becausePair, becauseIndex) => (
                    <div key={becausePair.id}>
                        <div className="flex items-center gap-2">
                            <CornerDownRight className="h-4 w-4 text-muted-foreground shrink-0"/>
                            <Textarea
                                value={becausePair.because}
                                onChange={(e) => onUpdateBecause(path, becauseIndex, e.target.value)}
                                placeholder="Porque... (describa la causa)"
                                rows={1}
                                className="text-sm flex-grow"
                            />
                            <Button variant="ghost" size="icon" onClick={() => onRemoveBecause(path, becauseIndex)} className="h-7 w-7">
                                <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                        </div>
                        <div className="pl-8 mt-2">
                            {becausePair.nextWhy ? (
                                <WhyNodeComponent 
                                    node={becausePair.nextWhy}
                                    level={level + 1}
                                    path={[...path, becauseIndex]}
                                    onUpdate={onUpdate}
                                    onUpdateBecause={onUpdateBecause}
                                    onAddBecause={onAddBecause}
                                    onRemoveBecause={onRemoveBecause}
                                    onAddNextWhy={onAddNextWhy}
                                    onRemoveNode={onRemoveNode}
                                />
                            ) : (
                                <Button
                                    size="sm" variant="outline" className="text-xs h-7"
                                    onClick={() => onAddNextWhy(path, becauseIndex)}
                                    disabled={!becausePair.because.trim()}
                                >
                                    <PlusCircle className="mr-1 h-3 w-3" /> Añadir Siguiente ¿Por qué?
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
                 <Button
                    size="sm" variant="outline" className="text-xs h-7 ml-6"
                    onClick={() => onAddBecause(path)}
                >
                    <PlusCircle className="mr-1 h-3 w-3" /> Añadir Causa (Porque...)
                </Button>
            </div>
        </Card>
    );
};

// --- Main Component ---
interface FiveWhys2InteractiveProps {
  whyWhy2Data: FiveWhys2Data;
  onSetWhyWhy2Data: (data: FiveWhys2Data) => void;
  focusEventDescription: string;
}

export const FiveWhys2Interactive: FC<FiveWhys2InteractiveProps> = ({ whyWhy2Data, onSetWhyWhy2Data, focusEventDescription }) => {
  
  const [internalData, setInternalData] = useState<FiveWhys2Data>([]);

  useEffect(() => {
    setInternalData(whyWhy2Data || []);
  }, [whyWhy2Data]);

  const updateParentState = (newData: FiveWhys2Data) => {
    setInternalData(newData);
    onSetWhyWhy2Data(newData);
  };

  const handleUpdateNode = (path: number[], newWhyText: string) => {
      const newData = JSON.parse(JSON.stringify(internalData));
      let currentNode: any = newData;
      for (const index of path.slice(0, -1)) {
          currentNode = currentNode[index].becauses[0].nextWhy;
      }
      currentNode[path[path.length - 1]].why = newWhyText;
      updateParentState(newData);
  };

  const handleUpdateBecause = (path: number[], becauseIndex: number, newBecauseText: string) => {
      const newData = JSON.parse(JSON.stringify(internalData));
      let currentNode = newData[path[0]];
      for (let i = 1; i < path.length; i++) {
          currentNode = currentNode.becauses[path[i-1]].nextWhy!;
      }
      currentNode.becauses[becauseIndex].because = newBecauseText;
      updateParentState(newData);
  };

  const handleAddBecause = (path: number[]) => {
      const newData = JSON.parse(JSON.stringify(internalData));
      let currentNode = newData[path[0]];
      for (let i = 1; i < path.length; i++) {
          currentNode = currentNode.becauses[path[i - 1]].nextWhy!;
      }
      currentNode.becauses.push({ id: generateClientSideId('bc'), because: '', nextWhy: undefined });
      updateParentState(newData);
  };

  const handleRemoveBecause = (path: number[], becauseIndex: number) => {
      const newData = JSON.parse(JSON.stringify(internalData));
      let currentNode = newData[path[0]];
      for (let i = 1; i < path.length; i++) {
          currentNode = currentNode.becauses[path[i - 1]].nextWhy!;
      }
      currentNode.becauses.splice(becauseIndex, 1);
      updateParentState(newData);
  };

  const handleAddNextWhy = (path: number[], becauseIndex: number) => {
      const newData = JSON.parse(JSON.stringify(internalData));
      let currentNode = newData[path[0]];
      for (let i = 1; i < path.length; i++) {
          currentNode = currentNode.becauses[path[i - 1]].nextWhy!;
      }
      const becauseText = currentNode.becauses[becauseIndex].because;
      currentNode.becauses[becauseIndex].nextWhy = {
          id: generateClientSideId('why'),
          why: `¿Por qué: "${becauseText}"?`,
          becauses: [{ id: generateClientSideId('bc'), because: '', nextWhy: undefined }]
      };
      updateParentState(newData);
  };

  const handleRemoveNode = (path: number[]) => {
      const newData = JSON.parse(JSON.stringify(internalData));
      if (path.length === 1) { // Root node
          newData.splice(path[0], 1);
      } else { // Nested node
          let parentNode = newData[path[0]];
          for (let i = 1; i < path.length - 1; i++) {
              parentNode = parentNode.becauses[path[i - 1]].nextWhy!;
          }
          parentNode.becauses[path[path.length - 2]].nextWhy = undefined;
      }
      updateParentState(newData);
  };

  const addRootWhy = () => {
    const whyText = `¿Por qué ocurrió: "${focusEventDescription}"?`;
    const newRoot: WhyNode = {
      id: generateClientSideId('why'),
      why: whyText,
      becauses: [{ id: generateClientSideId('bc'), because: '', nextWhy: undefined }],
    };
    updateParentState([...internalData, newRoot]);
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
          internalData.map((rootNode, index) => (
            <WhyNodeComponent
              key={rootNode.id}
              node={rootNode}
              level={1}
              path={[index]}
              onUpdate={handleUpdateNode}
              onUpdateBecause={handleUpdateBecause}
              onAddBecause={handleAddBecause}
              onRemoveBecause={handleRemoveBecause}
              onAddNextWhy={handleAddNextWhy}
              onRemoveNode={handleRemoveNode}
            />
          ))
        ) : (
          <div className="text-center text-muted-foreground italic py-4 w-full">
            Haga clic en "Añadir Por qué Inicial" para comenzar.
          </div>
        )}
        <Button onClick={addRootWhy} variant="outline" className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" /> {internalData.length === 0 ? 'Añadir Por qué Inicial' : 'Añadir Otro Problema Raíz'}
        </Button>
      </div>
    </div>
  );
};
