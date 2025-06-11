
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ListChecks, UserCog, Users, Edit3, KeyRound, ShieldOff, History } from 'lucide-react';

const usersPermissions = [
  { id: '1', name: 'Carlos Ruiz', projectAccess: 'Todos', edition: 'Total' },
  { id: '2', name: 'Ana López', projectAccess: 'Solo su equipo', edition: 'Lectura' },
  { id: '3', name: 'Luis Torres', projectAccess: 'Solo revisión', edition: 'Limitado' },
];

export default function ConfigPage() {
  return (
    <div className="space-y-8 py-8">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
          <UserCog className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Configuración - Permisos
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Gestione los usuarios y sus niveles de acceso dentro de RCA Assistant.
        </p>
      </header>

      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Permisos de Usuario</CardTitle>
          </div>
          <CardDescription>
            Visualice y edite los permisos asignados a cada usuario del sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Usuario</TableHead>
                  <TableHead className="w-[35%]">Acceso a Proyectos</TableHead>
                  <TableHead className="w-[35%]">Edición</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersPermissions.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.projectAccess}</TableCell>
                    <TableCell>{user.edition}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-start">
            <Button variant="default">
              <Edit3 className="mr-2 h-4 w-4" />
              Editar Permisos
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ListChecks className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Opciones de Administración</CardTitle>
          </div>
           <CardDescription>
            Acciones rápidas para la gestión de cuentas de usuario.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center p-2 hover:bg-secondary/50 rounded-md cursor-pointer">
              <KeyRound className="mr-3 h-5 w-5 text-primary/80" />
              Restablecer contraseña
            </li>
            <li className="flex items-center p-2 hover:bg-secondary/50 rounded-md cursor-pointer">
              <ShieldOff className="mr-3 h-5 w-5 text-primary/80" />
              Bloquear cuenta
            </li>
            <li className="flex items-center p-2 hover:bg-secondary/50 rounded-md cursor-pointer">
              <History className="mr-3 h-5 w-5 text-primary/80" />
              Ver historial de acceso
            </li>
          </ul>
        </CardContent>
         <CardFooter>
          <p className="text-xs text-muted-foreground">
            Estas opciones son representativas. La funcionalidad completa de gestión de usuarios se implementaría en un sistema de backend.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
