
'use client';

// This page is intentionally left blank for now.
// It can be developed in the future with specific reporting features.

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function InformesPage() {
  return (
    <div className="space-y-8 py-8">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
          <FileText className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Sección de Informes
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Esta sección está en desarrollo y contendrá informes detallados en el futuro.
        </p>
      </header>
       <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
                Actualmente, puede encontrar un resumen de datos y exportaciones en el <a href="/inicio" className="text-primary underline">Dashboard de Inicio</a>.
            </p>
        </CardContent>
       </Card>
    </div>
  );
}
