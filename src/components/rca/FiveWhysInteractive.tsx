
'use client';
import { FC, useState } from 'react';
import { FiveWhysData, FiveWhyBecause, FiveWhyEntry } from '@/types/rca';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2, HelpCircle, MessageCircle, Check, X, ClipboardCheck, ClipboardX } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

interface FiveWhysInteractiveProps {
  focusEventDescription: string;
  fiveWhysData: FiveWhysData;
  onSetFiveWhysData: (data: FiveWhysData) => void;
}

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// --- Validation Dialog ---
const ValidationDialog: FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (method: string) => void;
  statusToSet: 'accepted' | 'rejected';
}> = ({ isOpen, onClose, onConfirm, statusToSet }) => {
  const [method, setMethod] = useState('');
  const { toast } = useToast();

  const handleConfirm = () => {
    if (!method.trim()) {
      toast({ title: "Método Requerido", description: "Debe especificar el método de validación o rechazo.", variant: "destructive" });
      return;
    }
    onConfirm(method);
    onClose();
    setMethod('');
  };
  
  return (
      <AlertDialog open={isOpen} onOpenChange={onClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              {statusToSet === 'accepted' ? <ClipboardCheck className="mr-2 h-5 w-5 text-green-600"/> : <ClipboardX className="mr-2 h-5 w-5 text-destructive"/>}
              Confirmar {statusToSet === 'accepted' ? 'Aceptación' : 'Rechazo'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Por favor, describa el método utilizado para {statusToSet === 'accepted' ? 'validar esta causa' : 'rechazar esta causa'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
              <Label htmlFor="validation-method">Método de Validación/Rechazo <span className="text-destructive">*</span></Label>
              <Textarea
                  id="validation-method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  placeholder="Ej: Revisión de bitácora, entrevista con operador, simulación, etc."
                  className="mt-1"
                  rows={3}
              />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onClose}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={!method.trim()}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
  )
}

// Recursive renderer for the tree structure
const FiveWhysRecursiveRenderer: FC<{
  entry: FiveWhyEntry;
  level: number;
  path: (string | number)[];
  onUpdate: (path: (string | number)[], value: any, field?: string) => void;
  onAdd: (path: (string | number)[], type: 'why' | 'because') => void;
  onRemove: (path: (string | number)[]) => void;
  onOpenValidationDialog: (path: (string | number)[], statusToSet: 'accepted' | 'rejected') => void;
}> = ({ entry, level, path, onUpdate, onAdd, onRemove, onOpenValidationDialog }) => {
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
          onChange={(e) => onUpdate(path, e.target.value, 'why')}
          placeholder={`¿Por qué ocurrió el evento anterior?`}
          rows={2}
          className="text-sm bg-background"
        />
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        <div className="flex flex-row flex-wrap gap-3">
          {(entry.becauses || []).map((because, becauseIndex) => {
            const becausePath = [...path, 'becauses', becauseIndex];
            const isRejected = because.status === 'rejected';
            return (
              <div 
                key={because.id} 
                className={cn(
                    "flex-1 min-w-[250px] p-3 rounded-lg border",
                    because.status === 'accepted' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' :
                    isRejected ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 opacity-80' :
                    'bg-background/50'
                )}
              >
                 <div className="flex justify-between items-center mb-1">
                    <Label htmlFor={`because-${because.id}`} className="text-sm font-semibold flex items-center text-foreground">
                      <MessageCircle className="mr-1.5 h-4 w-4" /> Porque...
                    </Label>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant={because.status === 'accepted' ? 'secondary' : 'ghost'} className="h-6 w-6" onClick={() => onOpenValidationDialog(becausePath, 'accepted')}><Check className="h-3.5 w-3.5 text-green-600"/></Button>
                      <Button size="icon" variant={because.status === 'rejected' ? 'secondary' : 'ghost'} className="h-6 w-6" onClick={() => onOpenValidationDialog(becausePath, 'rejected')}><X className="h-3.5 w-3.5 text-destructive"/></Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onRemove(becausePath)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                  <Textarea
                    id={`because-${because.id}`}
                    value={because.description}
                    onChange={(e) => onUpdate(becausePath, e.target.value, 'description')}
                    placeholder="Describa la razón..."
                    rows={2}
                    className="text-sm"
                  />
                  
                  {because.validationMethod && (
                    <div className="text-xs mt-2 text-muted-foreground bg-muted/50 p-1.5 rounded-md">
                        <strong>Método de V/R:</strong> {because.validationMethod}
                    </div>
                  )}

                  <div className="mt-3 space-y-3">
                      {because.subWhys?.map((subWhy, subWhyIndex) => (
                          <FiveWhysRecursiveRenderer
                              key={subWhy.id}
                              entry={subWhy}
                              level={level + 1}
                              path={[...becausePath, 'subWhys', subWhyIndex]}
                              onUpdate={onUpdate}
                              onAdd={onAdd}
                              onRemove={onRemove}
                              onOpenValidationDialog={onOpenValidationDialog}
                          />
                      ))}
                  </div>
                  
                  {!isRejected && (
                    <Button size="sm" variant="outline" className="text-xs h-7 mt-3" onClick={() => onAdd([...path, 'becauses', becauseIndex], 'why')}>
                        <PlusCircle className="mr-1 h-3 w-3" /> Añadir Siguiente ¿Por qué?
                    </Button>
                  )}
              </div>
            )
          })}
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
  const [validationState, setValidationState] = useState<{path: (string|number)[], status: 'accepted' | 'rejected'} | null>(null);

  const handleUpdate = (path: (string | number)[], value: any, field: string = 'description') => {
    const newData = JSON.parse(JSON.stringify(fiveWhysData));
    let current: any = newData;
    for (let i = 0; i < path.length; i++) {
        current = current[path[i] as any];
    }
    current[field] = value;
    onSetFiveWhysData(newData);
  };
  
  const handleAdd = (path: (string | number)[], type: 'why' | 'because') => {
    const newData = JSON.parse(JSON.stringify(fiveWhysData));
    let parent: any = newData;

    for (let i = 0; i < path.length; i++) {
        if(parent === undefined) return;
        parent = parent[path[i] as any];
    }

    if (type === 'because') {
      if (!parent.becauses) parent.becauses = [];
      parent.becauses.push({ id: generateId('bec'), description: '', subWhys: [], status: 'pending', validationMethod: '' });
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

    // Traverse to the parent array
    for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i] as any];
    }

    const finalKey = path[path.length - 1];

    if (Array.isArray(current) && typeof finalKey === 'number') {
        current.splice(finalKey, 1);
    } else {
        console.error("Error on handleRemove: Parent is not an array or key is not a number for splice.", { path, current });
    }
    
    onSetFiveWhysData(newData);
  };

  const openValidationDialog = (path: (string|number)[], statusToSet: 'accepted' | 'rejected') => {
    setValidationState({ path, status: statusToSet });
  };
  
  const handleConfirmValidation = (method: string) => {
    if (!validationState) return;
    const { path, status } = validationState;
    
    const newData = JSON.parse(JSON.stringify(fiveWhysData));
    let current: any = newData;
    for (let i = 0; i < path.length; i++) {
        current = current[path[i] as any];
    }

    // Toggle logic: if clicking the same status, revert to pending
    if (current.status === status) {
        current.status = 'pending';
        current.validationMethod = '';
    } else {
        current.status = status;
        current.validationMethod = method;
    }
    
    onSetFiveWhysData(newData);
    setValidationState(null);
  };


  return (
    <>
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
                onOpenValidationDialog={openValidationDialog}
              />
          ))}
          <div className="text-center pt-2">
              <Button onClick={handleAddToRoot} variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" /> Iniciar nueva línea de análisis de Porqués
              </Button>
          </div>
        </div>
      </div>
      {validationState && (
          <ValidationDialog 
              isOpen={!!validationState}
              onClose={() => setValidationState(null)}
              onConfirm={handleConfirmValidation}
              statusToSet={validationState.status}
          />
      )}
    </>
  );
};

