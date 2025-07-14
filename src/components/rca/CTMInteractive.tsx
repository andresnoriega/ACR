
'use client';
import { FC, useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  addEdge,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';

import type { CTMData, FailureMode, Hypothesis, PhysicalCause, HumanCause, LatentCause } from '@/types/rca';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, Share2, Check, X, GitBranchPlus, BrainCircuit, Wrench, User, Building } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";


interface CTMInteractiveProps {
  focusEventDescription: string;
  ctmData: CTMData;
  onSetCtmData: (data: CTMData) => void;
}

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

const NodeEditor: FC<{
  id: string;
  label: string;
  description: string;
  onDescriptionChange: (newDesc: string) => void;
  onClose: () => void;
}> = ({ id, label, description, onDescriptionChange, onClose }) => (
  <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Editar: {label}</DialogTitle>
      </DialogHeader>
      <div className="py-4">
        <Label htmlFor={`desc-editor-${id}`}>Descripción</Label>
        <Textarea
          id={`desc-editor-${id}`}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={4}
        />
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" onClick={onClose}>Cerrar</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const CTMInteractive: FC<CTMInteractiveProps> = ({
  focusEventDescription,
  ctmData,
  onSetCtmData,
}) => {
  const [editingNode, setEditingNode] = useState<{ id: string; label: string; description: string; path: string[] } | null>(null);

  const getElementByPath = (path: string[]) => {
    let currentLevel: any = ctmData;
    let element: any = null;

    for (const part of path) {
      if (currentLevel && typeof currentLevel.find === 'function') {
        const [prefix, id] = part.split(/-(.+)/);
        element = currentLevel.find((item: any) => item.id === part);
        if (element) {
            if (prefix === 'fm') currentLevel = element.hypotheses;
            else if (prefix === 'hyp') currentLevel = element.physicalCauses;
            else if (prefix === 'pc') currentLevel = element.humanCauses;
            else if (prefix === 'hc') currentLevel = element.latentCauses;
            else currentLevel = null;
        } else {
          currentLevel = null;
          break;
        }
      } else {
        element = null;
        break;
      }
    }
    return element;
  };

  const updateElementByPath = (path: string[], newProps: Partial<any>) => {
    const newCtmData = JSON.parse(JSON.stringify(ctmData));
    let currentLevel: any[] = newCtmData;
    
    for (let i = 0; i < path.length; i++) {
        const part = path[i];
        const [prefix] = part.split(/-(.+)/);
        const index = currentLevel.findIndex(item => item.id === part);

        if (index === -1) return; // Not found

        if (i === path.length - 1) {
            // Last element, update it
            currentLevel[index] = { ...currentLevel[index], ...newProps };
        } else {
            // Navigate deeper
            let nextLevelKey: string;
            if (prefix === 'fm') nextLevelKey = 'hypotheses';
            else if (prefix === 'hyp') nextLevelKey = 'physicalCauses';
            else if (prefix === 'pc') nextLevelKey = 'humanCauses';
            else if (prefix === 'hc') nextLevelKey = 'latentCauses';
            else return; // Invalid path

            if (!currentLevel[index][nextLevelKey]) {
                currentLevel[index][nextLevelKey] = [];
            }
            currentLevel = currentLevel[index][nextLevelKey];
        }
    }
    onSetCtmData(newCtmData);
  };
  
  const addElementByPath = (path: string[], newElement: any) => {
    const newCtmData = JSON.parse(JSON.stringify(ctmData));
    let currentLevel: any[] = newCtmData;

    if (path.length === 0) { // Adding a new Failure Mode
      newCtmData.push(newElement);
    } else {
      for (let i = 0; i < path.length; i++) {
        const part = path[i];
        const [prefix] = part.split(/-(.+)/);
        const index = currentLevel.findIndex(item => item.id === part);

        if (index === -1) return;

        let nextLevelKey: string;
        if (prefix === 'fm') nextLevelKey = 'hypotheses';
        else if (prefix === 'hyp') nextLevelKey = 'physicalCauses';
        else if (prefix === 'pc') nextLevelKey = 'humanCauses';
        else if (prefix === 'hc') nextLevelKey = 'latentCauses';
        else return;

        if (!currentLevel[index][nextLevelKey]) {
          currentLevel[index][nextLevelKey] = [];
        }
        
        if (i === path.length - 1) {
          currentLevel[index][nextLevelKey].push(newElement);
        } else {
          currentLevel = currentLevel[index][nextLevelKey];
        }
      }
    }
    onSetCtmData(newCtmData);
  };

  const removeElementByPath = (path: string[]) => {
      const newCtmData = JSON.parse(JSON.stringify(ctmData));
      let currentLevel: any[] = newCtmData;

      if (path.length === 1) { // Removing a Failure Mode
        const index = newCtmData.findIndex(item => item.id === path[0]);
        if (index !== -1) newCtmData.splice(index, 1);
      } else {
          for (let i = 0; i < path.length -1; i++) {
            const part = path[i];
            const [prefix] = part.split(/-(.+)/);
            const index = currentLevel.findIndex(item => item.id === part);
            
            if (index === -1) return;
            
            let nextLevelKey: string;
            if (prefix === 'fm') nextLevelKey = 'hypotheses';
            else if (prefix === 'hyp') nextLevelKey = 'physicalCauses';
            else if (prefix === 'pc') nextLevelKey = 'humanCauses';
            else if (prefix === 'hc') nextLevelKey = 'latentCauses';
            else return;
            
            if (i === path.length - 2) { // Parent of element to remove
              const childKey = nextLevelKey;
              const childList = currentLevel[index][childKey] || [];
              const childIndex = childList.findIndex((item: any) => item.id === path[i+1]);
              if (childIndex !== -1) {
                childList.splice(childIndex, 1);
              }
            } else {
              currentLevel = currentLevel[index][nextLevelKey];
            }
          }
      }
      onSetCtmData(newCtmData);
  };

  const onAddChild = (path: string[]) => {
    const parentPrefix = path.length > 0 ? path[path.length - 1].split('-')[0] : '';
    let newElement: any = {};
    
    if (parentPrefix === '') { // Add Failure Mode
      newElement = { id: generateId('fm'), description: 'Nuevo Modo de Falla', hypotheses: [] };
    } else if (parentPrefix === 'fm') { // Add Hypothesis
      newElement = { id: generateId('hyp'), description: 'Nueva Hipótesis', physicalCauses: [], status: 'pending' };
    } else if (parentPrefix === 'hyp') { // Add Physical Cause
      newElement = { id: generateId('pc'), description: 'Nueva Causa Física', humanCauses: [] };
    } else if (parentPrefix === 'pc') { // Add Human Cause
      newElement = { id: generateId('hc'), description: 'Nueva Causa Humana', latentCauses: [] };
    } else if (parentPrefix === 'hc') { // Add Latent Cause
      newElement = { id: generateId('lc'), description: 'Nueva Causa Latente' };
    } else { return; }
    
    addElementByPath(path, newElement);
  };

  const { nodes, edges } = useMemo(() => {
    const initialNodes: Node[] = [];
    const initialEdges: Edge[] = [];
    let yOffset = 0;
    const xSpacing = 250;
    const ySpacing = 120;
    
    const nodeDefaults = {
      sourcePosition: 'right',
      targetPosition: 'left',
    };

    const addNodesAndEdges = (items: any[], parentId: string | null, parentPath: string[], level: number, parentY: number) => {
        let currentY = parentY;
        items.forEach((item, index) => {
            const currentPath = [...parentPath, item.id];
            const nodeY = index === 0 ? currentY : currentY + ySpacing;
            currentY = nodeY;

            const [prefix] = item.id.split(/-(.+)/);
            let label = 'Elemento';
            let icon = Wrench;
            let bgColor = 'bg-gray-100';

            switch(prefix) {
                case 'fm': label = 'Modo de Falla'; icon = GitBranchPlus; bgColor = 'bg-red-100 dark:bg-red-900/30'; break;
                case 'hyp': label = 'Hipótesis'; icon = BrainCircuit; bgColor = 'bg-teal-100 dark:bg-teal-900/30'; break;
                case 'pc': label = 'Causa Física'; icon = Wrench; bgColor = 'bg-orange-100 dark:bg-orange-900/30'; break;
                case 'hc': label = 'Causa Humana'; icon = User; bgColor = 'bg-yellow-100 dark:bg-yellow-900/30'; break;
                case 'lc': label = 'Causa Latente'; icon = Building; bgColor = 'bg-purple-100 dark:bg-purple-900/30'; break;
            }

            initialNodes.push({
                ...nodeDefaults,
                id: item.id,
                position: { x: level * xSpacing, y: nodeY },
                data: {
                    label: item.description || `(${label})`,
                    type: prefix,
                    path: currentPath,
                    status: item.status,
                    onAddChild,
                    onRemove: removeElementByPath,
                    onEdit: setEditingNode,
                    onStatusChange: updateElementByPath,
                    fullDescription: item.description
                },
                type: 'causeNode'
            });

            if (parentId) {
                initialEdges.push({
                    id: `e-${parentId}-${item.id}`,
                    source: parentId,
                    target: item.id,
                    type: 'smoothstep',
                    markerEnd: { type: MarkerType.ArrowClosed },
                });
            }

            let children = [];
            if (prefix === 'fm') children = item.hypotheses || [];
            else if (prefix === 'hyp') children = item.physicalCauses || [];
            else if (prefix === 'pc') children = item.humanCauses || [];
            else if (prefix === 'hc') children = item.latentCauses || [];

            if (children.length > 0) {
              const childrenTotalHeight = (children.length - 1) * ySpacing;
              const childrenStartY = nodeY - (childrenTotalHeight / 2);
              currentY = addNodesAndEdges(children, item.id, currentPath, level + 1, childrenStartY);
            }
        });
        return currentY;
    };
    
    addNodesAndEdges(ctmData, null, [], 0, yOffset);

    return { nodes: initialNodes, edges: initialEdges };
  }, [ctmData]);

  const CauseNode: FC<Node<any>> = ({ data }) => {
    const { label, type, path, status, onAddChild, onRemove, onEdit, onStatusChange, fullDescription } = data;
    let labelText = 'Elemento';
    let Icon = Wrench;
    let bgColor = 'bg-gray-100 dark:bg-gray-800';
    let canAddChild = true;
    
    switch(type) {
        case 'fm': labelText = 'Modo de Falla'; Icon = GitBranchPlus; bgColor = 'bg-red-100 dark:bg-red-900/30'; break;
        case 'hyp': labelText = 'Hipótesis'; Icon = BrainCircuit; bgColor = 'bg-teal-100 dark:bg-teal-900/30'; break;
        case 'pc': labelText = 'Causa Física'; Icon = Wrench; bgColor = 'bg-orange-100 dark:bg-orange-900/30'; break;
        case 'hc': labelText = 'Causa Humana'; Icon = User; bgColor = 'bg-yellow-100 dark:bg-yellow-900/30'; break;
        case 'lc': labelText = 'Causa Latente'; Icon = Building; bgColor = 'bg-purple-100 dark:bg-purple-900/30'; canAddChild = false; break;
    }

    const isHypothesis = type === 'hyp';
    const isAccepted = status === 'accepted';
    const isRejected = status === 'rejected';

    return (
        <Card className={cn("w-48 shadow-md border-2", 
            isAccepted ? "border-green-500" : isRejected ? "border-destructive/70 opacity-80" : "border-transparent",
            bgColor
        )}>
            <CardHeader className="p-2 border-b">
                <CardTitle className="text-xs font-semibold flex items-center">
                    <Icon className="h-4 w-4 mr-1.5" />
                    {labelText}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-2 text-xs truncate" title={fullDescription}>{label}</CardContent>
            <div className="p-1 border-t bg-background/50 flex items-center justify-end gap-0.5">
                {isHypothesis && (
                  <>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onStatusChange(path, { status: isAccepted ? 'pending' : 'accepted'})} disabled={isRejected} title="Aceptar"><Check className="h-4 w-4 text-green-600"/></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onStatusChange(path, { status: isRejected ? 'pending' : 'rejected'})} disabled={isAccepted} title="Rechazar"><X className="h-4 w-4 text-destructive"/></Button>
                  </>
                )}
                {canAddChild && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onAddChild(path)} disabled={isRejected} title="Añadir Causa Hija"><PlusCircle className="h-4 w-4 text-primary" /></Button>}
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit({id: path[path.length-1], label: labelText, description: fullDescription, path})} title="Editar"><Wrench className="h-4 w-4"/></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemove(path)} title="Eliminar"><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
        </Card>
    );
  };

  const nodeTypes = useMemo(() => ({ causeNode: CauseNode }), []);

  return (
    <div className="space-y-4 mt-4 p-4 border rounded-lg shadow-sm bg-background">
      <h3 className="text-lg font-semibold font-headline text-center text-primary flex items-center justify-center">
        <Share2 className="mr-2 h-5 w-5" /> Árbol de Causas (CTM) - Interactivo
      </h3>
      <div className="flex items-center justify-center gap-4">
        <p className="text-sm text-center"><strong>Evento Foco:</strong> {focusEventDescription || "Defina el evento foco en el Paso 1."}</p>
        <Button onClick={() => onAddChild([])} variant="outline" size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Modo de Falla
        </Button>
      </div>
      <div style={{ height: '600px' }} className="bg-muted/30 rounded-md border">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
        >
          <Controls />
          <Background />
        </ReactFlow>
      </div>
      {editingNode && (
          <NodeEditor 
            id={editingNode.id}
            label={editingNode.label}
            description={editingNode.description}
            onDescriptionChange={(newDesc) => {
              updateElementByPath(editingNode.path, { description: newDesc });
              setEditingNode(prev => prev ? {...prev, description: newDesc } : null);
            }}
            onClose={() => setEditingNode(null)}
          />
      )}
    </div>
  );
};
