
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { KeyRound, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface PasswordPromptDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  expectedPassword?: string;
}

const DEFAULT_EXPECTED_PASSWORD = "admin123"; 

export const PasswordPromptDialog: React.FC<PasswordPromptDialogProps> = ({
  isOpen,
  onOpenChange,
  onSuccess,
  expectedPassword = DEFAULT_EXPECTED_PASSWORD,
}) => {
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  const handlePasswordCheck = () => {
    setIsVerifying(true);
    setTimeout(() => {
      if (password === expectedPassword) {
        toast({ title: "Acceso Concedido", description: "Redirigiendo a la gestión de datos." });
        onSuccess(); 
        onOpenChange(false); 
        setPassword(''); 
      } else {
        toast({
          title: "Acceso Denegado",
          description: "La contraseña ingresada es incorrecta.",
          variant: "destructive",
        });
      }
      setIsVerifying(false);
    }, 500);
  };

  const handleCloseDialog = () => {
    if (!isVerifying) {
      setPassword('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <KeyRound className="mr-2 h-5 w-5 text-primary" />
            Confirmación de Acceso
          </DialogTitle>
          <DialogDescription>
            Por favor, ingrese la contraseña de administrador para acceder a la configuración de privacidad y datos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-3">
          <Label htmlFor="admin-password">Contraseña de Administrador</Label>
          <Input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingrese la contraseña"
            onKeyDown={(e) => { if (e.key === 'Enter' && !isVerifying && password.trim()) handlePasswordCheck(); }}
          />
           <p className="text-xs text-muted-foreground">
            (Contraseña para esta demo: <code className="font-mono bg-muted px-1 py-0.5 rounded text-foreground">{DEFAULT_EXPECTED_PASSWORD}</code>)
          </p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={isVerifying}>
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={handlePasswordCheck} disabled={isVerifying || !password.trim()}>
            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
