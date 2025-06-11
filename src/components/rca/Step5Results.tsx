'use client';
import type { FC, ChangeEvent } from 'react';
import type { Validation } from '@/types/rca';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, BarChart3 } from 'lucide-react';
import dynamic from 'next/dynamic';

const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });


interface Step5ResultsProps {
  eventId: string;
  validations: Validation[];
  finalComments: string;
  onFinalCommentsChange: (value: string) => void;
  onPrintReport: () => void;
  onPrevious: () => void;
}

export const Step5Results: FC<Step5ResultsProps> = ({
  eventId,
  validations,
  finalComments,
  onFinalCommentsChange,
  onPrintReport,
  onPrevious,
}) => {
  const prepareChartData = () => {
    const counts = validations.reduce((acc, v) => {
      acc[v.status] = (acc[v.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
        { name: 'Validadas', value: counts['validated'] || 0 },
        { name: 'Pendientes', value: counts['pending'] || 0 },
    ].filter(item => item.value > 0);
  };

  const chartData = prepareChartData();
  const COLORS = ['hsl(var(--chart-2))', 'hsl(var(--chart-1))']; // Accent (green for validated), Primary (blue for pending)

  return (
    <Card id="printable-report-area">
      <CardHeader>
        <CardTitle className="font-headline">Paso 5: Resultados y Reporte Final</CardTitle>
        <CardDescription>Resumen de validaciones, comentarios finales y opción de imprimir el reporte. Evento ID: <span className="font-semibold text-primary">{eventId || "No generado"}</span></CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold font-headline flex items-center"><BarChart3 className="mr-2 h-5 w-5 text-primary" />Resumen de Validaciones</h3>
          {chartData.length > 0 && PieChart ? (
            <div className="w-full h-72 md:h-80 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px">
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                    }}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted-foreground mt-2">No hay datos de validación para mostrar. Complete acciones y valídelas.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="finalComments">Comentarios Finales / Resumen del RCA</Label>
          <Textarea
            id="finalComments"
            value={finalComments}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onFinalCommentsChange(e.target.value)}
            placeholder="Añada cualquier comentario, lección aprendida o resumen final del proceso de RCA..."
            rows={5}
            className="focus:border-primary"
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <Button onClick={onPrevious} variant="outline" className="w-full sm:w-auto transition-transform hover:scale-105">Anterior</Button>
        <Button onClick={onPrintReport} className="w-full sm:w-auto transition-transform hover:scale-105">
          <Printer className="mr-2 h-4 w-4" /> Imprimir Informe
        </Button>
      </CardFooter>
    </Card>
  );
};
