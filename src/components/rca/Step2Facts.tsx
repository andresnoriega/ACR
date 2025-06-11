
'use client';
import type { FC, ChangeEvent } from 'react';
import { useState, useEffect } from 'react';
import type { DetailedFacts } from '@/types/rca';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';

interface Step2FactsProps {
  detailedFacts: DetailedFacts;
  onDetailedFactChange: (field: keyof DetailedFacts, value: string) => void;
  analysisDetails: string;
  onAnalysisDetailsChange: (value: string) => void;
  onPrevious: () => void;
  onNext: () => void;
}

export const Step2Facts: FC<Step2FactsProps> = ({
  detailedFacts,
  onDetailedFactChange,
  analysisDetails,
  onAnalysisDetailsChange,
  onPrevious,
  onNext,
}) => {
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>();

  useEffect(() => {
    const dateString = detailedFacts.cuando;
    // Intenta extraer la fecha del formato 'dd-MM-yyyy' al final de la cadena o sola
    const datePartMatch = dateString.match(/(\d{2}-\d{2}-\d{4})(?=\s*$|\s)/);
    if (datePartMatch && datePartMatch[1]) {
      try {
        const parsedDate = parse(datePartMatch[1], "dd-MM-yyyy", new Date());
        if (!isNaN(parsedDate.getTime())) {
          setSelectedCalendarDate(parsedDate);
        } else {
          setSelectedCalendarDate(undefined);
        }
      } catch (e) {
        setSelectedCalendarDate(undefined);
      }
    } else {
      setSelectedCalendarDate(undefined);
    }
  }, [detailedFacts.cuando]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof DetailedFacts) => {
    onDetailedFactChange(field, e.target.value);
  };

  const handleDateSelect = (date?: Date) => {
    if (date) {
      const newDateString = format(date, "dd-MM-yyyy");
      const currentTimeString = detailedFacts.cuando;
      
      // Regex para encontrar "A las HH:mm:ss del " o "A las HH:mm del "
      const timePrefixMatch = currentTimeString.match(/^(A las \d{1,2}:\d{2}(:\d{2})?\sdel\s)/i);
      
      if (timePrefixMatch && timePrefixMatch[1]) {
        onDetailedFactChange('cuando', `${timePrefixMatch[1]}${newDateString}`);
      } else {
        // Si no hay prefijo de tiempo o el formato es distinto, solo ponemos la fecha
        // o si el usuario quiere añadir la hora luego.
        onDetailedFactChange('cuando', newDateString);
      }
      setSelectedCalendarDate(date); // Actualiza el estado interno del calendario
    } else {
      // Si se limpia la fecha, se limpia el campo 'cuando'
      onDetailedFactChange('cuando', '');
      setSelectedCalendarDate(undefined);
    }
  };

  const constructedPhenomenonDescription = `Un evento, identificado como "${detailedFacts.que || 'QUÉ (no especificado)'}",
tuvo lugar en "${detailedFacts.donde || 'DÓNDE (no especificado)'}"
el "${detailedFacts.cuando || 'CUÁNDO (no especificado)'}".
La desviación ocurrió de la siguiente manera: "${detailedFacts.como || 'CÓMO (no especificado)'}".
El impacto o tendencia fue: "${detailedFacts.cualCuanto || 'CUÁL/CUÁNTO (no especificado)'}".
Las personas o equipos implicados fueron: "${detailedFacts.quien || 'QUIÉN (no especificado)'}".`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Paso 2: Hechos y Análisis Preliminar</CardTitle>
        {/* CardDescription removida */}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="quien">QUIÉN</Label>
            <Input id="quien" value={detailedFacts.quien} onChange={(e) => handleInputChange(e, 'quien')} placeholder="Personas o equipos implicados (Ej: N/A, Operador Turno A)" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="como">CÓMO (ocurrió la desviación)</Label>
            <Input id="como" value={detailedFacts.como} onChange={(e) => handleInputChange(e, 'como')} placeholder="Ej: Durante operación normal" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="que">QUÉ (ocurrió)</Label>
            <Textarea id="que" value={detailedFacts.que} onChange={(e) => handleInputChange(e, 'que')} placeholder="Ej: Trip por alta Temperatura Descanso 1" rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="donde">DÓNDE (ocurrió)</Label>
            <Input id="donde" value={detailedFacts.donde} onChange={(e) => handleInputChange(e, 'donde')} placeholder="Ej: Planta Teno, Sistema Calcinación, Horno" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cuando-input">CUÁNDO (ocurrió)</Label>
            <div className="flex gap-2">
                <Input 
                    id="cuando-input" 
                    value={detailedFacts.cuando} 
                    onChange={(e) => handleInputChange(e, 'cuando')} 
                    placeholder="Ej: A las 18:13 del 28-05-2021"
                    className="flex-grow"
                />
                <Popover>
                    <PopoverTrigger asChild>
                    <Button variant="outline" className="w-auto shrink-0">
                        <CalendarIcon className="h-4 w-4" />
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={selectedCalendarDate}
                        onSelect={handleDateSelect}
                        initialFocus
                        locale={es}
                    />
                    </PopoverContent>
                </Popover>
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cualCuanto">CUÁL/CUÁNTO (tendencia e impacto)</Label>
            <Input id="cualCuanto" value={detailedFacts.cualCuanto} onChange={(e) => handleInputChange(e, 'cualCuanto')} placeholder="Ej: Evento único / 2 Días de detención" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="font-semibold">DESCRIPCIÓN DEL FENÓMENO (Auto-generado)</Label>
          <Alert variant="default" className="bg-secondary/30">
            <AlertDescription className="whitespace-pre-line">
              {detailedFacts.que || detailedFacts.donde || detailedFacts.cuando || detailedFacts.cualCuanto || detailedFacts.como || detailedFacts.quien ? 
               constructedPhenomenonDescription : 
               "Complete los campos anteriores para generar la descripción."}
            </AlertDescription>
          </Alert>
        </div>

        <div className="space-y-2">
          <Label htmlFor="analysisDetails">Análisis Realizado (Técnicas Usadas y Hallazgos)</Label>
          <Textarea
            id="analysisDetails"
            value={analysisDetails}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onAnalysisDetailsChange(e.target.value)}
            placeholder="Describa el análisis efectuado, qué técnicas se usaron (ej: entrevistas, revisión de logs, etc.) y los hallazgos preliminares..."
            rows={5}
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={onPrevious} variant="outline" className="transition-transform hover:scale-105">Anterior</Button>
        <Button onClick={onNext} className="transition-transform hover:scale-105">Siguiente</Button>
      </CardFooter>
    </Card>
  );
};
