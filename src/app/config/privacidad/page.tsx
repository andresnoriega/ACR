
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ShieldCheck, DatabaseZap, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, doc, WriteBatch, writeBatch } from "firebase/firestore";

async function deleteAllDocsInCollection(collectionName: string): Promise<{ success: boolean, docsDeleted: number, error?: any }> {
  try {
    const collectionRef = collection(db, collectionName);
    const querySnapshot = await getDocs(collectionRef);
    let docsDeleted = 0;

    if (querySnapshot.empty) {
      return { success: true, docsDeleted: 0 };
    }

    // Firestore permite hasta 500 operaciones en un batch.
    // Dividiremos las eliminaciones en múltiples batches si es necesario.
    const batches: WriteBatch[] = [];
    let currentBatch = writeBatch(db);
    let operationsInCurrentBatch = 0;

    querySnapshot.forEach((documentSnapshot) => {
      currentBatch.delete(doc(db, collectionName, documentSnapshot.id));
      operationsInCurrentBatch++;
      docsDeleted++;
      if (operationsInCurrentBatch === 499) { // Dejar un pequeño margen por si acaso
        batches.push(currentBatch);
        currentBatch = writeBatch(db);
        operationsInCurrentBatch = 0;
      }
    });

    if (operationsInCurrentBatch > 0) {
      batches.push(currentBatch);
    }

    for (const batch of batches) {
      await batch.commit();
    }
    
    return { success: true, docsDeleted };
  } catch (error) {
    console.error(`Error deleting collection ${collectionName}:`, error);
    return { success: false, docsDeleted: 0, error };
  }
}


export default function ConfiguracionPrivacidadPage() {
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState(false);
  
  const handleResetData = async (dataType: string) => {
    setIsResetting(true);
    
    if (dataType === "TODOS los Datos RCA") {
      let rcaAnalysesDeleted = 0;
      let reportedEventsDeleted = 0;
      let success = true;

      toast({
        title: "Reseteo en Progreso...",
        description: "Eliminando análisis RCA y eventos reportados. Esto puede tardar unos momentos.",
        duration: 7000,
      });

      const analysesResult = await deleteAllDocsInCollection('rcaAnalyses');
      if (analysesResult.success) {
        rcaAnalysesDeleted = analysesResult.docsDeleted;
      } else {
        success = false;
        toast({
          title: "Error al Resetear Análisis",
          description: `No se pudieron eliminar los análisis RCA. Error: ${analysesResult.error?.message || 'Desconocido'}`,
          variant: "destructive",
        });
      }

      if (success) { // Solo proceder si la eliminación anterior fue exitosa
        const eventsResult = await deleteAllDocsInCollection('reportedEvents');
        if (eventsResult.success) {
          reportedEventsDeleted = eventsResult.docsDeleted;
        } else {
          success = false;
          toast({
            title: "Error al Resetear Eventos Reportados",
            description: `No se pudieron eliminar los eventos reportados. Error: ${eventsResult.error?.message || 'Desconocido'}`,
            variant: "destructive",
          });
        }
      }

      if (success) {
        toast({
          title: "Reseteo Completado",
          description: `Se eliminaron ${rcaAnalysesDeleted} análisis y ${reportedEventsDeleted} eventos reportados.`,
          variant: "destructive", 
          duration: 5000,
        });
      } else {
         toast({
          title: "Reseteo Parcial o Fallido",
          description: "Algunos datos podrían no haber sido eliminados. Revise la consola para más detalles.",
          variant: "destructive",
        });
      }

    } else {
      // Simulación para otros tipos de datos (si los hubiera)
      await new Promise(resolve => setTimeout(resolve, 1500)); 
      toast({
        title: `Reseteo Simulado: ${dataType}`,
        description: `Los datos de "${dataType}" han sido reseteados (simulación).`,
        variant: "destructive",
        duration: 5000,
      });
    }
    
    setIsResetting(false);
  };

  return (
    <div className="space-y-8 py-8">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
          <ShieldCheck className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Privacidad y Gestión de Datos
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Administre cómo se almacenan y gestionan los datos de su aplicación RCA Assistant.
        </p>
      </header>

      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <DatabaseZap className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Gestión de Datos de Análisis</CardTitle>
          </div>
          <CardDescription>
            Opciones para gestionar los datos generados por los análisis de causa raíz.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
            <AlertTriangle className="h-5 w-5 !text-destructive" />
            <AlertTitle className="text-destructive">¡Atención! Operaciones Destructivas</AlertTitle>
            <AlertDescription className="text-destructive/90">
              Las acciones de reseteo son irreversibles y eliminarán permanentemente los datos seleccionados. Proceda con extrema precaución.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col sm:flex-row justify-between items-center p-4 border rounded-md">
            <div>
              <h4 className="font-semibold">Resetear Todos los Datos de RCA</h4>
              <p className="text-sm text-muted-foreground">Elimina todos los eventos y análisis RCA (Pendientes, En Análisis y Finalizados).</p>
            </div>
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="mt-2 sm:mt-0" disabled={isResetting}>
                  {isResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} 
                  Resetear Todo
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿CONFIRMAR RESETEO TOTAL?</AlertDialogTitle>
                  <AlertDialogDescription>
                   ¡ADVERTENCIA! Esta acción eliminará TODOS los eventos y análisis RCA del sistema (colecciones 'reportedEvents' y 'rcaAnalyses'). Esta acción es IRREVERSIBLE y no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isResetting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleResetData("TODOS los Datos RCA")} disabled={isResetting} className="bg-destructive hover:bg-destructive/90">
                     {isResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    SÍ, ESTOY SEGURO, RESETEAR TODO
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">
                Funcionalidades como la exportación de datos, configuración de políticas de retención o integración con sistemas de backup se implementarían aquí.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
    