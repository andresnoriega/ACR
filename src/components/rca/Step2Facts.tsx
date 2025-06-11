
'use client';
import type { FC, ChangeEvent } from 'react';
import { useState, useEffect, useMemo } from 'react';
import type { DetailedFacts } from '@/types/rca';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
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

  const { derivedDate, derivedTime } = useMemo(() => {
    const text = detailedFacts.cuando;
    let dDate: Date | undefined;
    let tString = "";

    const dateMatch = text.match(/(\d{2}-\d{2}-\d{4})/);
    if (dateMatch?.[1]) {
      const parsed = parse(dateMatch[1], "dd-MM-yyyy", new Date());
      if (isValid(parsed)) {
        dDate = parsed;
      }
    }

    const timeMatch = text.match(/(\d{2}:\d{2})/); // HH:mm
    if (timeMatch?.[1]) {
      tString = timeMatch[1];
    }
    return { derivedDate: dDate, derivedTime: tString };
  }, [detailedFacts.cuando]);

  useEffect(() => {
    setSelectedCalendarDate(derivedDate);
  }, [derivedDate]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof DetailedFacts) => {
    onDetailedFactChange(field, e.target.value);
  };
  
  const handleDateSelect = (date?: Date) => {
    setSelectedCalendarDate(date);
    const newDateString = date ? format(date, "dd-MM-yyyy") : "";
    const currentTimeString = derivedTime; // HH:mm from useMemo

    if (newDateString) {
      if (currentTimeString) {
        onDetailedFactChange('cuando', `A las ${currentTimeString} del ${newDateString}`);
      } else {
        onDetailedFactChange('cuando', newDateString);
      }
    } else { // Date cleared
      if (currentTimeString) {
        onDetailedFactChange('cuando', `A las ${currentTimeString}`);
      } else {
        onDetailedFactChange('cuando', '');
      }
    }
  };

  const handleTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value; // HH:mm from input type="time"
    const currentDate = selectedCalendarDate; // Date object from state
    
    const dateString = currentDate ? format(currentDate, "dd-MM-yyyy") : "";

    if (newTime) {
      if (dateString) {
        onDetailedFactChange('cuando', `A las ${newTime} del ${dateString}`);
      } else {
         // If no date, try to find one in the original string
        const existingDateMatch = detailedFacts.cuando.match(/(\d{2}-\d{2}-\d{4})/);
        if (existingDateMatch?.[1]) {
          onDetailedFactChange('cuando', `A las ${newTime} del ${existingDateMatch[1]}`);
        } else {
          onDetailedFactChange('cuando', `A las ${newTime}`);
        }
      }
    } else { // Time cleared
      if (dateString) {
        onDetailedFactChange('cuando', dateString); // Keep only date
      } else {
        // If no date, try to find one in the original string
        const existingDateMatch = detailedFacts.cuando.match(/(\d{2}-\d{2}-\d{4})/);
        if (existingDateMatch?.[1]) {
          onDetailedFactChange('cuando', existingDateMatch[1]);
        } else {
           onDetailedFactChange('cuando', ''); // Clear all if both are cleared
        }
      }
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
            <Label htmlFor="cuando-input">CUÁNDO (Fecha y Hora)</Label>
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <Input 
                    id="cuando-input" 
                    value={detailedFacts.cuando} 
                    onChange={(e) => handleInputChange(e, 'cuando')} 
                    placeholder="Ej: A las 18:13 del 28-05-2021"
                    className="flex-grow"
                />
                <div className="flex gap-2 shrink-0">
                    <Input 
                        type="time"
                        value={derivedTime}
                        onChange={handleTimeChange}
                        className="w-auto"
                        aria-label="Seleccionar hora"
                    />
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button variant="outline" className="w-auto aspect-square p-2.5"> {/* Adjusted padding for square-like button */}
                            <CalendarIcon className="h-4 w-4" />
                            <span className="sr-only">Abrir calendario</span>
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

