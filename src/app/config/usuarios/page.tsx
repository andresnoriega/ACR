
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Users, Construction } from 'lucide-react';

export default function ConfiguracionUsuariosPage() {
  return (
    <div className="space-y-6 py-8">
      <header className="text-center mb-8 space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
            <Users className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Configuración de Usuarios
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Gestione los usuarios del sistema RCA Assistant.
        </p>
      </header>
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader className="text-center">
          <Construction className="h-12 w-12 text-primary mx-auto mb-3"/>
          <CardTitle className="text-2xl">Sección en Desarrollo</CardTitle>
          <CardDescription>Estamos trabajando para traerle esta funcionalidad pronto.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            Próximamente, aquí podrá añadir, editar, eliminar usuarios y gestionar sus roles y acceso a los diferentes módulos de la aplicación.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
