
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
  expectedPasswordFromConfig?: string; // Changed prop name
}

const DEFAULT_FALLBACK_PASSWORD = "admin123"; // Fallback if admin has no password set

export const PasswordPromptDialog: React.FC<PasswordPromptDialogProps> = ({
  isOpen,
  onOpenChange,
  onSuccess,
  expectedPasswordFromConfig,
}) => {
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  const actualExpectedPassword = expectedPasswordFromConfig || DEFAULT_FALLBACK_PASSWORD;

  const handlePasswordCheck = () => {
    setIsVerifying(true);
    // Simulate network delay for verification
    setTimeout(() => {
      if (password === actualExpectedPassword) {
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
      setPassword(''); // Reset password field on close
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
            Por favor, ingrese la contraseña de administrador ("Andrés Noriega") para acceder a la configuración de privacidad y datos.
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
            {expectedPasswordFromConfig 
              ? `(Esta es la contraseña establecida para "Andrés Noriega" en 'Configuración de Usuarios'.)`
              : `(El usuario "Andrés Noriega" no tiene una contraseña configurada o no se pudo cargar. Usando contraseña por defecto para esta demo: ${DEFAULT_FALLBACK_PASSWORD})`
            }
             <strong className="block mt-1 text-destructive">ADVERTENCIA (Demo): Las contraseñas se comparan en texto plano. No usar en producción.</strong>
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
