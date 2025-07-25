
'use client';
import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface ValidationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (method: string) => void;
  isProcessing: boolean;
  title?: string;
  description?: string;
  placeholder?: string;
}

export const ValidationDialog: FC<ValidationDialogProps> = ({
  isOpen,
  onOpenChange,
  onConfirm,
  isProcessing,
  title = "Confirmar Validación/Rechazo",
  description = "Por favor, ingrese el método o justificación utilizado para validar o rechazar este ítem.",
  placeholder = "Ej: Revisión de bitácora, inspección visual, entrevista, etc."
}) => {
  const [method, setMethod] = useState('');

  const handleConfirmClick = () => {
    if (method.trim()) {
      onConfirm(method);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setMethod('');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={open => { if(!isProcessing) onOpenChange(open); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="validation-dialog-method">Método de Validación/Rechazo <span className="text-destructive">*</span></Label>
          <Textarea
            id="validation-dialog-method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder={placeholder}
            className="mt-1"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isProcessing}>Cancelar</Button>
          </DialogClose>
          <Button onClick={handleConfirmClick} disabled={!method.trim() || isProcessing}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
