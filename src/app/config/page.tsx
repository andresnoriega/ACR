
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { SettingsIcon, Construction } from 'lucide-react';

export default function ConfigPage() {
  return (
    <div className="space-y-6 py-8">
      <header className="text-center mb-8 space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
            <SettingsIcon className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Configuración
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Ajuste las preferencias y parámetros de su RCA Assistant.
        </p>
      </header>
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader className="text-center">
            <Construction className="h-12 w-12 text-primary mx-auto mb-3"/>
          <CardTitle className="text-2xl">Sección en Desarrollo</CardTitle>
          <CardDescription>Esta funcionalidad estará disponible en futuras actualizaciones.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            Próximamente podrá personalizar aspectos de la aplicación, como plantillas de informe, 
            configuraciones de exportación, y más, para adaptar RCA Assistant a sus necesidades específicas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
