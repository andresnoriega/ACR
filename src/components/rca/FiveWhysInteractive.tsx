'use client';
import type { FC } from 'react';
import { FiveWhysData, FiveWhyBecause, FiveWhyEntry } from '@/types/rca';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2, HelpCircle, MessageCircle } from 'lucide-react';

interface FiveWhysInteractiveProps {
  focusEventDescription: string;
  fiveWhysData: FiveWhysData;
  onSetFiveWhysData: (data: FiveWhysData) => void;
}

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// Recursive renderer for the tree structure
const FiveWhysRecursiveRenderer: FC<{
  entry: FiveWhyEntry;
  level: number;
  path: (string | number)[];
  onUpdate: (path: (string | number)[], value: any) => void;
  onAdd: (path: (string | number)[], type: 'why' | 'because') => void;
  onRemove: (path: (string | number)[]) => void;
}> = ({ entry, level, path, onUpdate, onAdd, onRemove }) => {
  return (
    <Card className="bg-secondary/30 w-full">
      <CardHeader className="p-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-semibold text-primary flex items-center">
            <HelpCircle className="mr-1.5 h-4 w-4" /> ¿Por qué? #{level}
          </CardTitle>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onRemove(path)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
        <Textarea
          value={entry.why}
          onChange={(e) => onUpdate([...path, 'why'], e.target.value)}
          placeholder={`¿Por qué ocurrió el evento anterior?`}
          rows={2}
          className="text-sm bg-background"
        />
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
         <div className="flex flex-wrap gap-3">
          {(entry.becauses || []).map((because, becauseIndex) => (
            <div key={because.id} className="flex-1 min-w-[250px] p-3 rounded-lg border bg-background/50">
               <div className="flex justify-between items-center mb-1">
                  <Label htmlFor={`because-${because.id}`} className="text-sm font-semibold flex items-center text-foreground">
                    <MessageCircle className="mr-1.5 h-4 w-4" /> Porque...
                  </Label>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onRemove([...path, 'becauses', becauseIndex])}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
                <Textarea
                  id={`because-${because.id}`}
                  value={because.description}
                  onChange={(e) => onUpdate([...path, 'becauses', becauseIndex, 'description'], e.target.value)}
                  placeholder="Describa la razón..."
                  rows={2}
                  className="text-sm"
                />
                
                <div className="mt-3 space-y-3">
                    {because.subWhys?.map((subWhy, subWhyIndex) => (
                        <FiveWhysRecursiveRenderer
                            key={subWhy.id}
                            entry={subWhy}
                            level={level + 1}
                            path={[...path, 'becauses', becauseIndex, 'subWhys', subWhyIndex]}
                            onUpdate={onUpdate}
                            onAdd={onAdd}
                            onRemove={onRemove}
                        />
                    ))}
                </div>

                <Button size="sm" variant="outline" className="text-xs h-7 mt-3" onClick={() => onAdd([...path, 'becauses', becauseIndex], 'why')}>
                    <PlusCircle className="mr-1 h-3 w-3" /> Añadir Siguiente ¿Por qué?
                </Button>
            </div>
          ))}
        </div>
        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onAdd(path, 'because')}>
          <PlusCircle className="mr-1 h-3 w-3" /> Añadir 'Porque...'
        </Button>
      </CardContent>
    </Card>
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
          current[key] = isNaN(Number(path[i+1])) ? {} : [];
        }
        current = current[key];
    }
    const finalKey = path[path.length - 1];
    if (typeof finalKey === 'string') {
        current[finalKey] = value;
    }
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
    if (path.length === 0) return;
    const newData = JSON.parse(JSON.stringify(fiveWhysData));
    
    let current = newData;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i] as any];
    }
    
    const indexToRemove = path[path.length - 1] as number;

    if (Array.isArray(current)) {
        current.splice(indexToRemove, 1);
    } else {
        console.error("Error on handleRemove: Parent is not an array for path:", path);
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
              entry={rootWhy}
              level={1}
              path={[index]} 
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
