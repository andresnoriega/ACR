
'use client';
import type { FC } from 'react';
import { FiveWhysData, FiveWhyBecause, FiveWhyEntry } from '@/types/rca';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2, HelpCircle, ArrowRight, MessageCircle } from 'lucide-react';

interface FiveWhysInteractiveProps {
  focusEventDescription: string;
  fiveWhysData: FiveWhysData;
  onSetFiveWhysData: (data: FiveWhysData) => void;
}

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// Recursive renderer for the tree structure
const FiveWhysRecursiveRenderer: FC<{
  entries: FiveWhyEntry[];
  level: number;
  basePath: (string | number)[];
  onUpdate: (path: (string | number)[], value: any) => void;
  onAdd: (path: (string | number)[], type: 'why' | 'because') => void;
  onRemove: (path: (string | number)[]) => void;
}> = ({ entries, level, basePath, onUpdate, onAdd, onRemove }) => {
  return (
    <div className="space-y-4">
      {(entries || []).map((entry, entryIndex) => (
        <Card key={entry.id} className="bg-secondary/30">
          <CardHeader className="p-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-semibold text-primary flex items-center">
                <HelpCircle className="mr-1.5 h-4 w-4" /> Porque #{level}
              </CardTitle>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onRemove([...basePath, entryIndex])}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <Textarea
              value={entry.why}
              onChange={(e) => onUpdate([...basePath, entryIndex, 'why'], e.target.value)}
              placeholder={`¿Por qué ocurrió el evento anterior?`}
              rows={2}
              className="text-sm bg-background"
            />
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-3">
            {(entry.becauses || []).map((because, becauseIndex) => (
              <div key={because.id} className="pl-4 border-l-2 border-primary/30 ml-4 space-y-2 py-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor={`because-${because.id}`} className="text-sm font-semibold flex items-center text-foreground">
                    <MessageCircle className="mr-1.5 h-4 w-4" /> Sub-Porque {level}.{becauseIndex + 1}
                  </Label>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onRemove([...basePath, entryIndex, 'becauses', becauseIndex])}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <Textarea
                  id={`because-${because.id}`}
                  value={because.description}
                  onChange={(e) => onUpdate([...basePath, entryIndex, 'becauses', becauseIndex, 'description'], e.target.value)}
                  placeholder="Describa la razón..."
                  rows={2}
                  className="text-sm bg-background"
                />
                
                <FiveWhysRecursiveRenderer
                  entries={because.subWhys || []}
                  level={level + 1}
                  basePath={[...basePath, entryIndex, 'becauses', becauseIndex, 'subWhys']}
                  onUpdate={onUpdate}
                  onAdd={onAdd}
                  onRemove={onRemove}
                />

                {(because.subWhys || []).length === 0 && (
                   <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onAdd([...basePath, entryIndex, 'becauses', becauseIndex], 'why')}>
                     <PlusCircle className="mr-1 h-3 w-3" /> Añadir Siguiente ¿Por qué?
                   </Button>
                )}
              </div>
            ))}
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onAdd([...basePath, entryIndex], 'because')}>
              <PlusCircle className="mr-1 h-3 w-3" /> Añadir Sub-Porque
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};


export const FiveWhysInteractive: FC<FiveWhysInteractiveProps> = ({
  focusEventDescription,
  fiveWhysData,
  onSetFiveWhysData,
}) => {
  const handleUpdate = (path: (string | number)[], value: any) => {
    const newData = JSON.parse(JSON.stringify(fiveWhysData));
    let current: any = newData;
    for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (current[key] === undefined) {
          // If path doesn't exist, create it (e.g., becauses array)
          current[key] = isNaN(Number(path[i+1])) ? {} : [];
        }
        current = current[key];
    }
    const finalKey = path[path.length - 1];
    current[finalKey] = value;
    onSetFiveWhysData(newData);
  };
  
  const handleAdd = (path: (string | number)[], type: 'why' | 'because') => {
    const newData = JSON.parse(JSON.stringify(fiveWhysData));
    let parent: any = newData;

    for (let i = 0; i < path.length; i++) {
        if(parent === undefined) return;
        parent = parent[path[i]];
    }

    if (type === 'because') {
      if (!parent.becauses) parent.becauses = [];
      parent.becauses.push({ id: generateId('bec'), description: '', subWhys: [] });
    } else if (type === 'why') {
      if (!parent.subWhys) parent.subWhys = [];
      const previousBecause = parent.description || 'evento anterior';
      parent.subWhys.push({ id: generateId('why'), why: `¿Por qué: "${previousBecause.substring(0,50)}..."?`, becauses: [] });
    }
    onSetFiveWhysData(newData);
  };
  
  const handleAddToRoot = () => {
    const newData = JSON.parse(JSON.stringify(fiveWhysData || []));
    const whyText = focusEventDescription ? `¿Por qué ocurrió: "${focusEventDescription.substring(0,70)}..."?` : '¿Por qué ocurrió el evento?';
    newData.push({
      id: generateId('why'),
      why: whyText,
      becauses: [],
    });
    onSetFiveWhysData(newData);
  };

  const handleRemove = (path: (string | number)[]) => {
    const newData = JSON.parse(JSON.stringify(fiveWhysData));
    let parent: any = newData;
    
    for (let i = 0; i < path.length - 1; i++) {
        if (parent === undefined) return;
        parent = parent[path[i]];
    }
    
    const finalKey = path[path.length - 1];
    if (Array.isArray(parent) && typeof finalKey === 'number') {
        parent.splice(finalKey, 1);
    } else if (typeof parent === 'object' && parent !== null) {
        delete parent[finalKey];
    }
    onSetFiveWhysData(newData);
  };

  return (
    <div className="space-y-6 mt-4 p-4 border rounded-lg shadow-sm bg-background">
      <h3 className="text-lg font-semibold font-headline text-center text-primary flex items-center justify-center">
        <HelpCircle className="mr-2 h-5 w-5" /> Análisis de los 5 Porqués
      </h3>

      <Card className="bg-primary/10">
        <CardHeader>
          <CardTitle className="text-md font-semibold text-primary text-center">Evento Foco Inicial</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground text-center">{focusEventDescription || "Defina el evento foco en el Paso 1."}</p>
        </CardContent>
      </Card>
      
      <div className="space-y-4">
        {(fiveWhysData || []).map((rootWhy, index) => (
            <FiveWhysRecursiveRenderer
              key={rootWhy.id}
              entries={[rootWhy]}
              level={1}
              basePath={[index]}
              onUpdate={handleUpdate}
              onAdd={handleAdd}
              onRemove={handleRemove}
            />
        ))}
        <div className="text-center pt-2">
            <Button onClick={handleAddToRoot} variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" /> Iniciar nueva línea de análisis de Porqués
            </Button>
        </div>
      </div>
    </div>
  );
};
