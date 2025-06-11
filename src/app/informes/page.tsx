
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileText, Construction } from 'lucide-react';

export default function InformesPage() {
  return (
    <div className="space-y-6 py-8">
      <header className="text-center mb-8 space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
            <FileText className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Informes de RCA
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Visualice, gestione y exporte los informes de sus Análisis de Causa Raíz completados.
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
            Próximamente, aquí podrá acceder a un listado de todos sus análisis RCA finalizados, 
            ver resúmenes detallados, y exportar informes completos en formatos como PDF.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
