
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BookOpen, Users, BarChart3, ListOrdered, FileText, UserCheck, SettingsIcon, Zap, Sparkles, Lightbulb, Bot } from 'lucide-react';

export default function InstructivoPage() {
  return (
    <div className="space-y-8 py-8 max-w-4xl mx-auto">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
          <BookOpen className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Instructivo de Uso - Asistente ACR
        </h1>
        <p className="text-lg text-muted-foreground">
          Una guía rápida para aprovechar al máximo la plataforma de Análisis de Causa Raíz.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Zap className="mr-2 h-5 w-5" />Introducción</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Bienvenido a Asistente ACR, su aliado estratégico para la gestión y análisis de incidentes. Esta plataforma está diseñada para guiarlo a través de un proceso estructurado de Análisis de Causa Raíz (ACR), desde el reporte inicial de un evento hasta la validación de las acciones correctivas, asegurando una mejora continua y previniendo la recurrencia de problemas.</p>
          <p>Este instructivo le proporcionará una visión general de las funcionalidades clave y el flujo de trabajo recomendado.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5" />Roles de Usuario</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li><strong>Super User:</strong> Tiene acceso total a todas las funcionalidades, incluyendo la configuración crítica del sistema, la gestión de todos los usuarios y la visualización de datos de todas las empresas.</li>
            <li><strong>Admin:</strong> Gestiona usuarios y sitios dentro de su propia empresa. Puede aprobar o rechazar eventos y validar acciones correctivas.</li>
            <li><strong>Analista:</strong> Es el rol principal para realizar los análisis ACR. Puede crear, editar y avanzar en los análisis de los eventos.</li>
            <li><strong>Revisor:</strong> Tiene permisos de solo lectura sobre los eventos, análisis e informes. Ideal para roles de supervisión o consulta.</li>
            <li><strong>Usuario Pendiente:</strong> Rol asignado a nuevos usuarios. Tiene acceso muy limitado hasta que un Super User o Admin aprueba su cuenta.</li>
          </ul>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Navegación y Secciones Principales</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger><div className="flex items-center"><ListOrdered className="mr-2 h-4 w-4" />Eventos</div></AccordionTrigger>
              <AccordionContent>
                Aquí encontrará una lista de todos los incidentes reportados. Puede filtrar, ordenar y seleccionar un evento para ver sus detalles. Desde esta pantalla, un usuario con los permisos adecuados (Admin/Super User) puede aprobar un evento pendiente para que comience su análisis.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger><div className="flex items-center"><BarChart3 className="mr-2 h-4 w-4" />Análisis</div></AccordionTrigger>
              <AccordionContent>
                El corazón de la plataforma. Esta sección le guía a través de un proceso de 5 pasos para realizar un ACR completo. Puede iniciar un nuevo análisis desde cero o cargar uno existente usando su ID.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger><div className="flex items-center"><FileText className="mr-2 h-4 w-4" />Informes</div></AccordionTrigger>
              <AccordionContent>
                Un dashboard con indicadores clave (KPIs) sobre sus procesos de ACR. Visualice gráficos sobre el estado de los análisis y las acciones, y acceda a listas de análisis en curso y planes de acción pendientes.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger><div className="flex items-center"><UserCheck className="mr-2 h-4 w-4" />Mis Tareas</div></AccordionTrigger>
              <AccordionContent>
                Su centro de trabajo personal. Aquí verá todas las acciones correctivas que se le han asignado. Podrá adjuntar evidencias, añadir comentarios y marcar las tareas como listas para validación. También verá las tareas que usted debe validar si es Líder de Proyecto o Administrador.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
              <AccordionTrigger><div className="flex items-center"><SettingsIcon className="mr-2 h-4 w-4" />Configuración</div></AccordionTrigger>
              <AccordionContent>
                (Solo para Super Users) Sección para administrar los aspectos fundamentales de la aplicación, como la gestión de usuarios, sitios/plantas, permisos y la gestión de datos (resetear, exportar, etc.).
              </AccordionContent>
            </AccordionItem>
             <AccordionItem value="item-6">
              <AccordionTrigger><div className="flex items-center"><BookOpen className="mr-2 h-4 w-4" />Instructivo</div></AccordionTrigger>
              <AccordionContent>
                Esta misma página, que sirve como guía de referencia rápida para todas las funcionalidades de la plataforma.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Flujo de Trabajo: Realizando un ACR en 5 Pasos</CardTitle>
        </CardHeader>
        <CardContent>
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="step-1">
                    <AccordionTrigger><strong>Paso 1: Iniciación</strong> - ¿Qué pasó?</AccordionTrigger>
                    <AccordionContent>
                        Comience por describir el evento. Complete los campos obligatorios como el lugar, fecha, tipo, prioridad y una descripción clara del evento foco. Puede registrar acciones inmediatas que se tomaron. Un Admin o Super User debe aprobar el evento para poder continuar.
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                    <AccordionTrigger><strong>Paso 2: Hechos</strong> - Recopilación de Datos</AccordionTrigger>
                    <AccordionContent>
                        Documente los hechos con el formato Quién, Qué, Dónde, Cuándo, Cómo y Cuál/Cuánto. Asigne un Líder de Proyecto y Equipo de Investigación. Si existen, suba los Hechos Preservados (fotos, documentos, etc.) como evidencia.
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="step-3">
                    <AccordionTrigger><strong>Paso 3: Análisis</strong> - ¿Por qué pasó?</AccordionTrigger>
                    <AccordionContent>
                        Utilice las herramientas de análisis proporcionadas (Línea de Tiempo, Lluvia de Ideas, 5 Porqués, Ishikawa, CTM) para profundizar en las causas del evento. Identifique las causas raíz principales y defina un plan de acción para cada una, asignando responsables y fechas límite.
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="step-4">
                    <AccordionTrigger><strong>Paso 4: Validación</strong> - ¿Las soluciones funcionaron?</AccordionTrigger>
                    <AccordionContent>
                        El Líder del Proyecto o un Admin revisa las evidencias y comentarios proporcionados por los responsables de las acciones. En esta etapa, se valida si la acción fue implementada correctamente y fue efectiva, o se rechaza si no cumple con lo esperado.
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="step-5">
                    <AccordionTrigger><strong>Paso 5: Resultados</strong> - Cierre y Comunicación</AccordionTrigger>
                    <AccordionContent>
                        Revise el informe final consolidado con toda la información del análisis. Añada sus comentarios finales o un resumen ejecutivo (puede usar la IA para generar un borrador). Finalmente, marque el análisis como "Finalizado" para cerrar el ciclo. Puede imprimir o enviar por correo el informe desde aquí.
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Bot className="mr-2 h-5 w-5" />Funcionalidades con Inteligencia Artificial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-accent-foreground mt-1 flex-shrink-0" />
            <div>
              <h4 className="font-semibold">Sugerencia de Causas Raíz Latentes</h4>
              <p>En el Paso 3, el botón "Sugerir con IA" analiza la información que ha proporcionado (lluvia de ideas, técnicas de análisis) para proponer posibles causas raíz sistémicas u organizacionales que podría haber pasado por alto.</p>
            </div>
          </div>
           <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-accent-foreground mt-1 flex-shrink-0" />
            <div>
              <h4 className="font-semibold">Generación de Resumen Ejecutivo</h4>
              <p>En el Paso 5, el botón "Generar Borrador con IA" lee todo su análisis y redacta un resumen ejecutivo en la sección de "Comentarios Finales". Es un excelente punto de partida para comunicar los resultados a la gerencia.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
