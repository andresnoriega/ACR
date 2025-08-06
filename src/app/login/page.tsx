
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithEmail } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Campos requeridos', description: 'Por favor, ingrese correo y contraseña.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      // The loginWithEmail function now handles the loading state internally.
      // We just need to wait for it to complete. The redirection will be handled
      // by the ClientProviders layout component based on the updated auth state.
      await loginWithEmail(email, password);
      
      // We don't need to manually push to router here. The layout component will do it.
      // A success toast is also good to have.
      toast({ title: 'Inicio de Sesión Exitoso', description: 'Redirigiendo a la página de inicio...' });
      
    } catch (error: any) {
      console.error("Error en inicio de sesión:", error);
      
      let errorMessage = "Ocurrió un error desconocido.";

      if (error.code) { 
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = 'Correo electrónico o contraseña incorrectos.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'El formato del correo electrónico no es válido.';
            break;
          default:
            errorMessage = `Error: ${error.message}`;
        }
      } else {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Error al Iniciar Sesión',
        description: errorMessage,
        variant: 'destructive',
      });
      setIsLoading(false); // Only set loading to false on error, so button stays disabled on success
    }
  };

  return (
    <div className="flex items-center justify-center min-h-full py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <LogIn className="h-6 w-6 text-primary" />
            Iniciar Sesión
          </CardTitle>
          <CardDescription>Acceda a su cuenta de Asistente ACR.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="su@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" /> }
              {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center text-sm">
          <p>
            ¿No tiene una cuenta?{' '}
            <Link href="/registro" className="font-medium text-primary hover:underline">
              Regístrese aquí
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
