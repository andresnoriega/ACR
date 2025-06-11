
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Globe, Construction } from 'lucide-react';

export default function ConfiguracionSitiosPage() {
  return (
    <div className="space-y-6 py-8">
      <header className="text-center mb-8 space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
            <Globe className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Configuración de Sitios/Plantas
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Administre los diferentes sitios, plantas o áreas de su organización.
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
            En esta sección podrá definir los sitios, plantas o áreas relevantes para sus análisis RCA, lo que permitirá filtrar y organizar la información de manera más efectiva.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
