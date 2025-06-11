
'use client';
import type { FC, ChangeEvent } from 'react';
import type { CTMData, FailureMode, Hypothesis, PhysicalCause, HumanCause, LatentCause } from '@/types/rca';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlusCircle, Trash2, CornerDownRight, Share2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface CTMInteractiveProps {
  focusEventDescription: string;
  ctmData: CTMData;
  onSetCtmData: (data: CTMData) => void;
}

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const CTMInteractive: FC<CTMInteractiveProps> = ({
  focusEventDescription,
  ctmData,
  onSetCtmData,
}) => {

  // --- Failure Mode Handlers ---
  const handleAddFailureMode = () => {
    const newFailureMode: FailureMode = {
      id: generateId('fm'),
      description: '',
      hypotheses: [],
    };
    onSetCtmData([...ctmData, newFailureMode]);
  };

  const handleUpdateFailureMode = (fmId: string, description: string) => {
    onSetCtmData(ctmData.map(fm => fm.id === fmId ? { ...fm, description } : fm));
  };

  const handleRemoveFailureMode = (fmId: string) => {
    onSetCtmData(ctmData.filter(fm => fm.id !== fmId));
  };

  // --- Hypothesis Handlers ---
  const handleAddHypothesis = (fmId: string) => {
    const newHypothesis: Hypothesis = {
      id: generateId('hyp'),
      description: '',
      physicalCauses: [],
    };
    onSetCtmData(ctmData.map(fm => 
      fm.id === fmId ? { ...fm, hypotheses: [...fm.hypotheses, newHypothesis] } : fm
    ));
  };

  const handleUpdateHypothesis = (fmId: string, hypId: string, description: string) => {
    onSetCtmData(ctmData.map(fm => 
      fm.id === fmId ? { 
        ...fm, 
        hypotheses: fm.hypotheses.map(hyp => 
          hyp.id === hypId ? { ...hyp, description } : hyp
        ) 
      } : fm
    ));
  };

  const handleRemoveHypothesis = (fmId: string, hypId: string) => {
    onSetCtmData(ctmData.map(fm => 
      fm.id === fmId ? { 
        ...fm, 
        hypotheses: fm.hypotheses.filter(hyp => hyp.id !== hypId) 
      } : fm
    ));
  };

  // --- Physical Cause Handlers ---
  const handleAddPhysicalCause = (fmId: string, hypId: string) => {
    const newPhysicalCause: PhysicalCause = {
      id: generateId('pc'),
      description: '',
      humanCauses: [],
    };
    onSetCtmData(ctmData.map(fm => 
      fm.id === fmId ? {
        ...fm,
        hypotheses: fm.hypotheses.map(hyp => 
          hyp.id === hypId ? { ...hyp, physicalCauses: [...hyp.physicalCauses, newPhysicalCause] } : hyp
        )
      } : fm
    ));
  };

  const handleUpdatePhysicalCause = (fmId: string, hypId: string, pcId: string, description: string) => {
    onSetCtmData(ctmData.map(fm =>
      fm.id === fmId ? {
        ...fm,
        hypotheses: fm.hypotheses.map(hyp =>
          hyp.id === hypId ? {
            ...hyp,
            physicalCauses: hyp.physicalCauses.map(pc =>
              pc.id === pcId ? { ...pc, description } : pc
            )
          } : hyp
        )
      } : fm
    ));
  };
  
  const handleRemovePhysicalCause = (fmId: string, hypId: string, pcId: string) => {
    onSetCtmData(ctmData.map(fm =>
      fm.id === fmId ? {
        ...fm,
        hypotheses: fm.hypotheses.map(hyp =>
          hyp.id === hypId ? {
            ...hyp,
            physicalCauses: hyp.physicalCauses.filter(pc => pc.id !== pcId)
          } : hyp
        )
      } : fm
    ));
  };

  // --- Human Cause Handlers ---
  const handleAddHumanCause = (fmId: string, hypId: string, pcId: string) => {
    const newHumanCause: HumanCause = {
      id: generateId('hc'),
      description: '',
      latentCauses: [],
    };
    onSetCtmData(ctmData.map(fm =>
      fm.id === fmId ? {
        ...fm,
        hypotheses: fm.hypotheses.map(hyp =>
          hyp.id === hypId ? {
            ...hyp,
            physicalCauses: hyp.physicalCauses.map(pc =>
              pc.id === pcId ? { ...pc, humanCauses: [...pc.humanCauses, newHumanCause] } : pc
            )
          } : hyp
        )
      } : fm
    ));
  };

  const handleUpdateHumanCause = (fmId: string, hypId: string, pcId: string, hcId: string, description: string) => {
    onSetCtmData(ctmData.map(fm =>
      fm.id === fmId ? {
        ...fm,
        hypotheses: fm.hypotheses.map(hyp =>
          hyp.id === hypId ? {
            ...hyp,
            physicalCauses: hyp.physicalCauses.map(pc =>
              pc.id === pcId ? {
                ...pc,
                humanCauses: pc.humanCauses.map(hc =>
                  hc.id === hcId ? { ...hc, description } : hc
                )
              } : pc
            )
          } : hyp
        )
      } : fm
    ));
  };

  const handleRemoveHumanCause = (fmId: string, hypId: string, pcId: string, hcId: string) => {
     onSetCtmData(ctmData.map(fm =>
      fm.id === fmId ? {
        ...fm,
        hypotheses: fm.hypotheses.map(hyp =>
          hyp.id === hypId ? {
            ...hyp,
            physicalCauses: hyp.physicalCauses.map(pc =>
              pc.id === pcId ? {
                ...pc,
                humanCauses: pc.humanCauses.filter(hc => hc.id !== hcId)
              } : pc
            )
          } : hyp
        )
      } : fm
    ));
  };

  // --- Latent Cause Handlers ---
  const handleAddLatentCause = (fmId: string, hypId: string, pcId: string, hcId: string) => {
    const newLatentCause: LatentCause = {
      id: generateId('lc'),
      description: '',
    };
    onSetCtmData(ctmData.map(fm =>
      fm.id === fmId ? {
        ...fm,
        hypotheses: fm.hypotheses.map(hyp =>
          hyp.id === hypId ? {
            ...hyp,
            physicalCauses: hyp.physicalCauses.map(pc =>
              pc.id === pcId ? {
                ...pc,
                humanCauses: pc.humanCauses.map(hc =>
                  hc.id === hcId ? { ...hc, latentCauses: [...hc.latentCauses, newLatentCause] } : hc
                )
              } : pc
            )
          } : hyp
        )
      } : fm
    ));
  };

  const handleUpdateLatentCause = (fmId: string, hypId: string, pcId: string, hcId: string, lcId: string, description: string) => {
    onSetCtmData(ctmData.map(fm =>
      fm.id === fmId ? {
        ...fm,
        hypotheses: fm.hypotheses.map(hyp =>
          hyp.id === hypId ? {
            ...hyp,
            physicalCauses: hyp.physicalCauses.map(pc =>
              pc.id === pcId ? {
                ...pc,
                humanCauses: pc.humanCauses.map(hc =>
                  hc.id === hcId ? {
                    ...hc,
                    latentCauses: hc.latentCauses.map(lc =>
                      lc.id === lcId ? { ...lc, description } : lc
                    )
                  } : hc
                )
              } : pc
            )
          } : hyp
        )
      } : fm
    ));
  };
  
  const handleRemoveLatentCause = (fmId: string, hypId: string, pcId: string, hcId: string, lcId: string) => {
    onSetCtmData(ctmData.map(fm =>
      fm.id === fmId ? {
        ...fm,
        hypotheses: fm.hypotheses.map(hyp =>
          hyp.id === hypId ? {
            ...hyp,
            physicalCauses: hyp.physicalCauses.map(pc =>
              pc.id === pcId ? {
                ...pc,
                humanCauses: pc.humanCauses.map(hc =>
                  hc.id === hcId ? {
                    ...hc,
                    latentCauses: hc.latentCauses.filter(lc => lc.id !== lcId)
                  } : hc
                )
              } : pc
            )
          } : hyp
        )
      } : fm
    ));
  };

  // --- Render Functions for each level ---
  const renderLatentCauses = (fmId: string, hypId: string, pcId: string, hcId: string, latentCauses: LatentCause[]) => (
    <div className="ml-8 pl-4 border-l border-dashed border-muted-foreground/50 space-y-2">
      {latentCauses.map((lc, index) => (
        <Card key={lc.id} className="p-3 bg-background/70 shadow-sm">
          <Label htmlFor={`lc-${lc.id}`} className="text-xs font-medium text-purple-700 dark:text-purple-400">Causa Latente #{index + 1}</Label>
          <div className="flex items-center space-x-2">
            <Textarea id={`lc-${lc.id}`} value={lc.description} onChange={(e) => handleUpdateLatentCause(fmId, hypId, pcId, hcId, lc.id, e.target.value)} placeholder="Descripción de la causa latente..." rows={1} className="text-xs" />
            <Button variant="ghost" size="icon" onClick={() => handleRemoveLatentCause(fmId, hypId, pcId, hcId, lc.id)} className="h-7 w-7"><Trash2 className="h-3 w-3 text-destructive" /></Button>
          </div>
        </Card>
      ))}
      <Button variant="outline" size="sm" onClick={() => handleAddLatentCause(fmId, hypId, pcId, hcId)} className="text-xs"><PlusCircle className="mr-1 h-3.5 w-3.5" /> Añadir Causa Latente</Button>
    </div>
  );

  const renderHumanCauses = (fmId: string, hypId: string, pcId: string, humanCauses: HumanCause[]) => (
    <div className="ml-8 pl-4 border-l border-dashed border-muted-foreground/50 space-y-3">
      {humanCauses.map((hc, index) => (
        <Accordion key={hc.id} type="single" collapsible className="w-full">
          <AccordionItem value={hc.id} className="border-b-0">
             <Card className="p-0 bg-secondary/40 shadow">
                <AccordionTrigger className="p-3 hover:no-underline">
                    <div className="flex justify-between items-center w-full">
                        <span className="text-sm font-medium text-red-700 dark:text-red-400 flex-grow text-left pr-2">Causa Humana #{index + 1}: {hc.description.substring(0,30) || "(Sin describir)"}...</span>
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label={`Eliminar Causa Humana ${index + 1}`}
                          onClick={(e) => { e.stopPropagation(); handleRemoveHumanCause(fmId, hypId, pcId, hc.id); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); handleRemoveHumanCause(fmId, hypId, pcId, hc.id); } }}
                          className="p-1 rounded-md hover:bg-destructive/10 focus:outline-none focus:ring-1 focus:ring-destructive cursor-pointer h-7 w-7 flex items-center justify-center shrink-0"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="p-3 border-t">
                    <Label htmlFor={`hc-${hc.id}`} className="text-xs font-semibold">Descripción Causa Humana</Label>
                    <Textarea id={`hc-${hc.id}`} value={hc.description} onChange={(e) => handleUpdateHumanCause(fmId, hypId, pcId, hc.id, e.target.value)} placeholder="Descripción de la causa humana..." rows={2} className="mb-2 text-sm" />
                    {renderLatentCauses(fmId, hypId, pcId, hc.id, hc.latentCauses)}
                </AccordionContent>
            </Card>
          </AccordionItem>
        </Accordion>
      ))}
      <Button variant="outline" size="sm" onClick={() => handleAddHumanCause(fmId, hypId, pcId)} className="text-sm"><PlusCircle className="mr-1 h-4 w-4" /> Añadir Causa Humana</Button>
    </div>
  );

  const renderPhysicalCauses = (fmId: string, hypId: string, physicalCauses: PhysicalCause[]) => (
    <div className="ml-8 pl-4 border-l border-dashed border-muted-foreground/50 space-y-3">
      {physicalCauses.map((pc, index) => (
         <Accordion key={pc.id} type="single" collapsible className="w-full">
          <AccordionItem value={pc.id} className="border-b-0">
            <Card className="p-0 bg-background/80 shadow">
                <AccordionTrigger className="p-3 hover:no-underline">
                     <div className="flex justify-between items-center w-full">
                        <span className="text-sm font-medium text-orange-700 dark:text-orange-400 flex-grow text-left pr-2">Causa Física #{index + 1}: {pc.description.substring(0,35) || "(Sin describir)"}...</span>
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label={`Eliminar Causa Física ${index + 1}`}
                          onClick={(e) => { e.stopPropagation(); handleRemovePhysicalCause(fmId, hypId, pc.id); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); handleRemovePhysicalCause(fmId, hypId, pc.id); } }}
                          className="p-1 rounded-md hover:bg-destructive/10 focus:outline-none focus:ring-1 focus:ring-destructive cursor-pointer h-7 w-7 flex items-center justify-center shrink-0"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="p-3 border-t">
                    <Label htmlFor={`pc-${pc.id}`} className="text-xs font-semibold">Descripción Causa Física</Label>
                    <Textarea id={`pc-${pc.id}`} value={pc.description} onChange={(e) => handleUpdatePhysicalCause(fmId, hypId, pc.id, e.target.value)} placeholder="Descripción de la causa física..." rows={2} className="mb-2 text-sm" />
                    {renderHumanCauses(fmId, hypId, pc.id, pc.humanCauses)}
                </AccordionContent>
            </Card>
          </AccordionItem>
        </Accordion>
      ))}
      <Button variant="outline" size="sm" onClick={() => handleAddPhysicalCause(fmId, hypId)} className="text-sm"><PlusCircle className="mr-1 h-4 w-4" /> Añadir Causa Física</Button>
    </div>
  );

  const renderHypotheses = (fmId: string, hypotheses: Hypothesis[]) => (
    <div className="ml-6 pl-4 border-l border-dashed border-muted-foreground/70 space-y-3">
      {hypotheses.map((hyp, index) => (
        <Accordion key={hyp.id} type="single" collapsible className="w-full">
          <AccordionItem value={hyp.id} className="border-b-0">
            <Card className="p-0 bg-secondary/50 shadow-md">
                <AccordionTrigger className="p-3 hover:no-underline">
                     <div className="flex justify-between items-center w-full">
                        <span className="text-base font-medium text-teal-700 dark:text-teal-400 flex-grow text-left pr-2">Hipótesis #{index + 1}: {hyp.description.substring(0,40) || "(Sin describir)"}...</span>
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label={`Eliminar Hipótesis ${index + 1}`}
                          onClick={(e) => { e.stopPropagation(); handleRemoveHypothesis(fmId, hyp.id); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); handleRemoveHypothesis(fmId, hyp.id); } }}
                          className="p-1 rounded-md hover:bg-destructive/10 focus:outline-none focus:ring-1 focus:ring-destructive cursor-pointer h-8 w-8 flex items-center justify-center shrink-0"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="p-3 border-t">
                    <Label htmlFor={`hyp-${hyp.id}`} className="text-sm font-semibold">Descripción Hipótesis</Label>
                    <Textarea id={`hyp-${hyp.id}`} value={hyp.description} onChange={(e) => handleUpdateHypothesis(fmId, hyp.id, e.target.value)} placeholder="Descripción de la hipótesis..." rows={2} className="mb-3" />
                    {renderPhysicalCauses(fmId, hyp.id, hyp.physicalCauses)}
                </AccordionContent>
            </Card>
          </AccordionItem>
        </Accordion>
      ))}
      <Button variant="outline" onClick={() => handleAddHypothesis(fmId)}><PlusCircle className="mr-2 h-4 w-4" /> Añadir Hipótesis</Button>
    </div>
  );

  return (
    <div className="space-y-6 mt-4 p-4 border rounded-lg shadow-sm bg-background">
      <h3 className="text-lg font-semibold font-headline text-center text-primary flex items-center justify-center">
        <Share2 className="mr-2 h-5 w-5" /> Árbol de Causas (CTM)
      </h3>

      <Card className="bg-primary/10">
        <CardHeader>
          <CardTitle className="text-md font-semibold text-primary">Evento Foco Inicial</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">{focusEventDescription || "Defina el evento foco en el Paso 1."}</p>
        </CardContent>
      </Card>

      {ctmData.map((fm, index) => (
        <Accordion key={fm.id} type="single" collapsible className="w-full">
          <AccordionItem value={fm.id} className="border rounded-md shadow-lg">
            <Card className="p-0">
                <AccordionTrigger className="p-4 hover:no-underline bg-primary/5 hover:bg-primary/10 rounded-t-md">
                    <div className="flex justify-between items-center w-full">
                        <span className="text-lg font-semibold text-primary flex-grow text-left pr-2">Modo de Falla #{index + 1}: {fm.description.substring(0,50) || "(Sin describir)"}...</span>
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label={`Eliminar Modo de Falla ${index + 1}`}
                          onClick={(e) => { e.stopPropagation(); handleRemoveFailureMode(fm.id); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); handleRemoveFailureMode(fm.id); } }}
                          className="p-1 rounded-md hover:bg-destructive/10 focus:outline-none focus:ring-1 focus:ring-destructive cursor-pointer h-9 w-9 flex items-center justify-center shrink-0"
                        >
                          <Trash2 className="h-5 w-5 text-destructive" />
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 border-t">
                    <Label htmlFor={`fm-${fm.id}`} className="text-base font-semibold">Descripción Modo de Falla</Label>
                    <Textarea id={`fm-${fm.id}`} value={fm.description} onChange={(e) => handleUpdateFailureMode(fm.id, e.target.value)} placeholder="Describa el modo de falla..." rows={3} className="mb-4" />
                    {renderHypotheses(fm.id, fm.hypotheses)}
                </AccordionContent>
            </Card>
          </AccordionItem>
        </Accordion>
      ))}

      <Button onClick={handleAddFailureMode} variant="default" className="w-full mt-4">
        <PlusCircle className="mr-2 h-5 w-5" /> Añadir Modo de Falla
      </Button>
    </div>
  );
};


    