
'use client';
import type { FC } from 'react';
import { FiveWhysData, FiveWhyEntry, FiveWhyBecause } from '@/types/rca';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2, GitBranchPlus, MessageCircle, HelpCircle } from 'lucide-react';

interface FiveWhysInteractiveProps {
  focusEventDescription: string;
  fiveWhysData: FiveWhysData;
  onSetFiveWhysData: (data: FiveWhysData) => void;
}

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

const FiveWhysRecursiveRenderer: FC<{
  entries: FiveWhyEntry[];
  level: number;
  onUpdate: (path: (string | number)[], value: string, field: 'why' | 'because') => void;
  onAdd: (path: (string | number)[], type: 'why' | 'because') => void;
  onRemove: (path: (string | number)[]) => void;
}> = ({ entries, level, onUpdate, onAdd, onRemove }) => {
  return (
    <div className={`space-y-4 ${level > 0 ? 'pl-4 border-l-2 ml-4' : ''}`}>
      {entries.map((entry, entryIndex) => (
        <Card key={entry.id} className="p-3 bg-secondary/30 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <Label htmlFor={`why-${entry.id}`} className="font-semibold flex items-center text-primary">
              <HelpCircle className="mr-2 h-4 w-4" /> ¿Por qué?
            </Label>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onRemove(['entries', entryIndex])}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
          <Textarea
            id={`why-${entry.id}`}
            value={entry.why}
            onChange={(e) => onUpdate(['entries', entryIndex], e.target.value, 'why')}
            placeholder="Describa el 'porqué' aquí..."
            rows={2}
          />
          <div className="mt-3 space-y-2">
            {(entry.becauses || []).map((because, becauseIndex) => (
              <div key={because.id} className="pl-4 border-l-2 border-gray-300 ml-4 space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor={`because-${because.id}`} className="text-sm font-semibold flex items-center text-gray-700 dark:text-gray-300">
                    <MessageCircle className="mr-2 h-4 w-4" /> Porque...
                  </Label>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onRemove(['entries', entryIndex, 'becauses', becauseIndex])}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
                <Textarea
                  id={`because-${because.id}`}
                  value={because.description}
                  onChange={(e) => onUpdate(['entries', entryIndex, 'becauses', becauseIndex], e.target.value, 'because')}
                  placeholder="Describa la razón o el 'porque'..."
                  rows={2}
                  className="text-sm"
                />
                <FiveWhysRecursiveRenderer
                  entries={because.subWhys || []}
                  level={level + 1}
                  onUpdate={(subPath, value, field) => onUpdate(['entries', entryIndex, 'becauses', becauseIndex, 'subWhys', ...subPath], value, field)}
                  onAdd={(subPath, type) => onAdd(['entries', entryIndex, 'becauses', becauseIndex, 'subWhys', ...subPath], type)}
                  onRemove={(subPath) => onRemove(['entries', entryIndex, 'becauses', becauseIndex, 'subWhys', ...subPath])}
                />
                 <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onAdd(['entries', entryIndex, 'becauses', becauseIndex], 'why')}>
                    <GitBranchPlus className="mr-1 h-3 w-3" /> Añadir ¿Por qué?
                </Button>
              </div>
            ))}
             <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onAdd(['entries', entryIndex], 'because')}>
                <PlusCircle className="mr-1 h-3 w-3" /> Añadir Porque...
            </Button>
          </div>
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

  const handleUpdate = (path: (string | number)[], value: string, field: 'why' | 'because') => {
    const newData = JSON.parse(JSON.stringify(fiveWhysData));
    let current = newData;
    for (let i = 1; i < path.length - 1; i++) { // Start from 1 to skip 'entries'
        current = current[path[i]];
    }
    const target = current[path[path.length - 1]];
    if(field === 'why') {
        target.why = value;
    } else if(field === 'because') {
        target.description = value;
    }

    onSetFiveWhysData(newData);
  };
  
  const handleAdd = (path: (string | number)[], type: 'why' | 'because') => {
    const newData = JSON.parse(JSON.stringify(fiveWhysData));
    let current = newData;
    
    // Start from 1 to skip the initial 'entries' string in the path
    for (let i = 1; i < path.length; i++) {
      current = current[path[i]];
    }
    
    if (type === 'why') { // Adding a sub-why to a 'because'
      if (!current.subWhys) current.subWhys = [];
      current.subWhys.push({ id: generateId('why'), why: '', becauses: [] });
    } else { // Adding a 'because' to a 'why'
       if (!current.becauses) current.becauses = [];
       current.becauses.push({ id: generateId('because'), description: '', subWhys: [] });
    }
    onSetFiveWhysData(newData);
  };

  const handleRemove = (path: (string | number)[]) => {
      const newData = JSON.parse(JSON.stringify(fiveWhysData));
      let current = newData;
      // Navigate to the parent array
      for (let i = 1; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      const indexToRemove = path[path.length - 1] as number;
      current.splice(indexToRemove, 1);
      onSetFiveWhysData(newData);
  };
  
  const handleAddRootWhy = () => {
    onSetFiveWhysData([...(fiveWhysData || []), { id: generateId('why'), why: '', becauses: [] }]);
  }

  const handleRootUpdate = (path: (string|number)[], value: string, field: 'why' | 'because') => {
      const index = path[1] as number;
      const newData = [...(fiveWhysData || [])].map((item, i) => i === index ? {...item, why: value} : item);
      onSetFiveWhysData(newData);
  }

  const handleRootRemove = (path: (string|number)[]) => {
      const index = path[1] as number;
      onSetFiveWhysData([...(fiveWhysData || [])].filter((_, i) => i !== index));
  }
  
  const handleRootAdd = (path: (string|number)[], type: 'why' | 'because') => {
      const index = path[1] as number;
      const newData = JSON.parse(JSON.stringify(fiveWhysData || []));
      if (!newData[index].becauses) newData[index].becauses = [];
      newData[index].becauses.push({ id: generateId('because'), description: '', subWhys: [] });
      onSetFiveWhysData(newData);
  }

  return (
    <div className="space-y-6 mt-4 p-4 border rounded-lg shadow-sm bg-background">
      <h3 className="text-lg font-semibold font-headline text-center text-primary flex items-center justify-center">
        <HelpCircle className="mr-2 h-5 w-5" /> Análisis de los 5 Porqués (en Árbol)
      </h3>

      <Card className="bg-primary/10">
        <CardHeader>
          <CardTitle className="text-md font-semibold text-primary text-center">Evento Foco Inicial</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground text-center">{focusEventDescription || "Defina el evento foco en el Paso 1."}</p>
        </CardContent>
      </Card>
      
      <FiveWhysRecursiveRenderer
          entries={fiveWhysData || []}
          level={0}
          onUpdate={handleRootUpdate}
          onAdd={handleRootAdd}
          onRemove={handleRootRemove}
       />

      <Button onClick={handleAddRootWhy} variant="outline" className="w-full mt-4">
        <PlusCircle className="mr-2 h-4 w-4" /> Añadir Otro Punto de Partida (¿Por qué?)
      </Button>
    </div>
  );
};
