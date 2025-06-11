
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
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, parse, isValid, startOfDay } from 'date-fns';
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

    // Try to parse DD-MM-YYYY format
    const dateMatchDMY = text.match(/(\d{2}-\d{2}-\d{4})/);
    if (dateMatchDMY?.[1]) {
      const parsed = parse(dateMatchDMY[1], "dd-MM-yyyy", new Date());
      if (isValid(parsed)) {
        dDate = parsed;
      }
    } else {
      // Try to parse YYYY-MM-DD format (common from date inputs)
      const dateMatchYMD = text.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatchYMD?.[1]) {
        const parsed = parse(dateMatchYMD[1], "yyyy-MM-dd", new Date());
        if (isValid(parsed)) {
          dDate = parsed;
        }
      }
    }
    

    const timeMatch = text.match(/(\d{2}:\d{2}(?::\d{2})?)/); // HH:mm or HH:mm:ss
    if (timeMatch?.[1]) {
      tString = timeMatch[1].substring(0,5); // Ensure HH:mm format for time input
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
    const currentTimeString = derivedTime;

    let finalCuando = "";
    if (newDateString) {
      if (currentTimeString) {
        finalCuando = `A las ${currentTimeString} del ${newDateString}`;
      } else {
        finalCuando = newDateString;
      }
    } else { // Date cleared
      if (currentTimeString) {
        finalCuando = `A las ${currentTimeString}`;
      } else {
        finalCuando = '';
      }
    }
    onDetailedFactChange('cuando', finalCuando);
  };

  const handleTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value; // HH:mm from input type="time"
    
    const dateString = selectedCalendarDate ? format(selectedCalendarDate, "dd-MM-yyyy") : (derivedDate ? format(derivedDate, "dd-MM-yyyy") : "");

    let finalCuando = "";
    if (newTime) {
      if (dateString) {
        finalCuando = `A las ${newTime} del ${dateString}`;
      } else {
        // If no date, try to find one in the original string
        const existingDateMatch = detailedFacts.cuando.match(/(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})/);
        if (existingDateMatch?.[0]) {
           const parsedExisting = parse(existingDateMatch[0], existingDateMatch[0].includes('-') && existingDateMatch[0].length === 10 && existingDateMatch[0][4] === '-' ? "yyyy-MM-dd" : "dd-MM-yyyy", new Date());
           if (isValid(parsedExisting)) {
             finalCuando = `A las ${newTime} del ${format(parsedExisting, "dd-MM-yyyy")}`;
           } else {
             finalCuando = `A las ${newTime}`;
           }
        } else {
          finalCuando = `A las ${newTime}`;
        }
      }
    } else { // Time cleared
      if (dateString) {
        finalCuando = dateString; // Keep only date
      } else {
        const existingDateMatch = detailedFacts.cuando.match(/(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})/);
         if (existingDateMatch?.[0]) {
            const parsedExisting = parse(existingDateMatch[0], existingDateMatch[0].includes('-') && existingDateMatch[0].length === 10 && existingDateMatch[0][4] === '-' ? "yyyy-MM-dd" : "dd-MM-yyyy", new Date());
            if (isValid(parsedExisting)) {
                finalCuando = format(parsedExisting, "dd-MM-yyyy");
            } else {
                finalCuando = '';
            }
        } else {
           finalCuando = ''; // Clear all if both are cleared
        }
      }
    }
     onDetailedFactChange('cuando', finalCuando);
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
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button variant="outline" className="w-auto aspect-square p-2.5">
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
                            disabled={{ after: new Date() }}
                        />
                        </PopoverContent>
                    </Popover>
                    <Input 
                        type="time"
                        value={derivedTime}
                        onChange={handleTimeChange}
                        className="w-auto shrink-0"
                        aria-label="Seleccionar hora"
                    />
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

    