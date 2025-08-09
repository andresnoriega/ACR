
'use client';

import { useState, useMemo, FC } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator, Cloud, Database, BrainCircuit, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Pricing Constants (USD) ---
// These are simplified prices for estimation purposes.
const CLOUD_STORAGE_COST_PER_GB_MONTH = 0.02;
const FIRESTORE_WRITE_COST_PER_100K = 0.18;
const FIRESTORE_READ_COST_PER_100K = 0.06;
const FIRESTORE_STORAGE_COST_PER_GB_MONTH = 0.18;
const GEMINI_1_5_PRO_INPUT_PER_1M_CHARS = 0.125; // Price for 1M characters
const GEMINI_1_5_PRO_OUTPUT_PER_1M_CHARS = 0.375; // Price for 1M characters

const CostCalculatorPage: FC = () => {
  const [analysisSizeMB, setAnalysisSizeMB] = useState<number>(50);

  const costs = useMemo(() => {
    // --- Cloud Storage Calculation ---
    const analysisSizeGB = analysisSizeMB / 1024;
    // We calculate cost per analysis, not per month, so this is illustrative.
    // The real cost is based on how long the data is stored. We assume a 1-month storage for this estimate.
    const storageCost = analysisSizeGB * CLOUD_STORAGE_COST_PER_GB_MONTH;

    // --- Firestore Calculation ---
    // A single analysis doc is small, maybe 50KB with all data.
    const firestoreDocSizeGB = 50 / (1024 * 1024);
    const firestoreStorageCost = firestoreDocSizeGB * FIRESTORE_STORAGE_COST_PER_GB_MONTH;
    // Assume ~100 writes/reads to create and update the doc. This is well within the free tier.
    const firestoreOperationsCost = (100 / 100000) * (FIRESTORE_WRITE_COST_PER_100K + FIRESTORE_READ_COST_PER_100K);

    // --- Generative AI Calculation (the main cost driver) ---
    // Estimated character counts for one full analysis cycle (3 AI calls)
    const paraphraseChars = { input: 2000, output: 1000 };
    const suggestCausesChars = { input: 15000, output: 2000 };
    const generateSummaryChars = { input: 20000, output: 3000 };
    
    const totalInputChars = paraphraseChars.input + suggestCausesChars.input + generateSummaryChars.input;
    const totalOutputChars = paraphraseChars.output + suggestCausesChars.output + generateSummaryChars.output;

    const inputCost = (totalInputChars / 1000000) * GEMINI_1_5_PRO_INPUT_PER_1M_CHARS;
    const outputCost = (totalOutputChars / 1000000) * GEMINI_1_5_PRO_OUTPUT_PER_1M_CHARS;
    const aiCost = inputCost + outputCost;

    // --- Total ---
    const totalCost = storageCost + firestoreStorageCost + firestoreOperationsCost + aiCost;

    return {
      storageCost,
      firestoreStorageCost,
      firestoreOperationsCost,
      aiCost,
      totalCost,
      totalInputChars,
      totalOutputChars
    };
  }, [analysisSizeMB]);

  return (
    <div className="space-y-8 py-8">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
          <Calculator className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Estimación de Costos de Análisis
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Calcule el costo aproximado de un análisis en Google Cloud Platform.
        </p>
      </header>

      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Calculadora de Costos por Análisis</CardTitle>
          <CardDescription>Ajuste el tamaño del análisis para ver la estimación de costos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="analysis-size-slider">Tamaño de los Archivos del Análisis (MB): <span className="font-bold text-primary">{analysisSizeMB} MB</span></Label>
            <Slider
              id="analysis-size-slider"
              min={1}
              max={500}
              step={1}
              value={[analysisSizeMB]}
              onValueChange={(value) => setAnalysisSizeMB(value[0])}
            />
          </div>
          
          <div className="p-6 border rounded-lg bg-secondary/30">
            <h3 className="text-2xl font-bold text-center text-primary">
              Costo Estimado por Análisis: ${costs.totalCost.toFixed(6)} USD
            </h3>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Servicio</TableHead>
                <TableHead>Detalle</TableHead>
                <TableHead className="text-right">Costo (USD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium flex items-center"><Cloud className="mr-2 h-4 w-4"/>Cloud Storage</TableCell>
                <TableCell>Almacenamiento de {analysisSizeMB} MB de archivos/evidencias.</TableCell>
                <TableCell className="text-right">${costs.storageCost.toFixed(6)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium flex items-center"><Database className="mr-2 h-4 w-4"/>Firestore</TableCell>
                <TableCell>Almacenamiento y operaciones del documento de análisis.</TableCell>
                <TableCell className="text-right">${(costs.firestoreStorageCost + costs.firestoreOperationsCost).toFixed(6)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium flex items-center"><BrainCircuit className="mr-2 h-4 w-4"/>Gemini API</TableCell>
                <TableCell>Llamadas a IA para parafrasear, sugerir y resumir ({costs.totalInputChars.toLocaleString('es-CL')} car. entrada, {costs.totalOutputChars.toLocaleString('es-CL')} car. salida).</TableCell>
                <TableCell className="text-right">${costs.aiCost.toFixed(6)}</TableCell>
              </TableRow>
              <TableRow className="bg-secondary/50">
                <TableCell className="font-bold text-lg" colSpan={2}>Total Estimado</TableCell>
                <TableCell className="font-bold text-lg text-right">${costs.totalCost.toFixed(6)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>

        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground flex items-start gap-2 p-3 border border-amber-300 bg-amber-50 rounded-md">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold">Nota Importante:</span> Esta es una estimación simplificada. Los costos reales pueden variar según la región de Google Cloud, el uso exacto de la API, la duración del almacenamiento y los niveles gratuitos aplicables. No incluye costos de red ni de App Hosting/Cloud Functions.
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CostCalculatorPage;
