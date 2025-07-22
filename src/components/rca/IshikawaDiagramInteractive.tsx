
'use client';
import type { FC, ChangeEvent } from 'react';
import type { IshikawaData, IshikawaCategory, IshikawaCause } from '@/types/rca';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, CornerDownRight, Users, Sitemap, Wrench, Box, Ruler, Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IshikawaDiagramInteractiveProps {
  focusEventDescription: string;
  ishikawaData: IshikawaData;
  onSetIshikawaData: (data: IshikawaData) => void;
}

const categoryIcons: { [key: string]: React.ElementType } = {
  manpower: Users,
  method: Sitemap,
  machinery: Wrench,
  material: Box,
  measurement: Ruler,
  environment: Leaf,
};

export const IshikawaDiagramInteractive: FC<IshikawaDiagramInteractiveProps> = ({
  focusEventDescription,
  ishikawaData,
  onSetIshikawaData,
}) => {
  const handleAddCause = (categoryId: string) => {
    const newData = ishikawaData.map(category => {
      if (category.id === categoryId) {
        const newCause: IshikawaCause = {
          id: `cause-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          description: '',
        };
        return { ...category, causes: [...category.causes, newCause] };
      }
      return category;
    });
    onSetIshikawaData(newData);
  };

  const handleUpdateCause = (categoryId: string, causeId: string, value: string) => {
    const newData = ishikawaData.map(category => {
      if (category.id === categoryId) {
        const updatedCauses = category.causes.map(cause =>
          cause.id === causeId ? { ...cause, description: value } : cause
        );
        return { ...category, causes: updatedCauses };
      }
      return category;
    });
    onSetIshikawaData(newData);
  };

  const handleRemoveCause = (categoryId: string, causeId: string) => {
    const newData = ishikawaData.map(category => {
      if (category.id === categoryId) {
        const filteredCauses = category.causes.filter(cause => cause.id !== causeId);
        return { ...category, causes: filteredCauses };
      }
      return category;
    });
    onSetIshikawaData(newData);
  };

  const topCategories = ishikawaData.slice(0, 3);
  const bottomCategories = ishikawaData.slice(3, 6);

  const renderCategoryGroup = (categories: IshikawaCategory[]) => (
    <div className={`grid grid-cols-1 md:grid-cols-${categories.length} gap-4 mb-4 relative`}>
      {categories.map((category) => {
        const Icon = categoryIcons[category.id] || CornerDownRight;
        return(
          <Card key={category.id} className="flex flex-col">
            <CardHeader className="pb-2 pt-3 px-4 bg-secondary/30">
              <CardTitle className="text-base font-semibold text-primary flex items-center">
                  <Icon className="mr-2 h-4 w-4" /> 
                  {category.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2 flex-grow">
              {category.causes.map((cause, causeIndex) => (
                <div key={cause.id} className="flex items-center space-x-2">
                  <CornerDownRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    id={`cause-${category.id}-${cause.id}`}
                    value={cause.description}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      handleUpdateCause(category.id, cause.id, e.target.value)
                    }
                    placeholder={`Causa #${causeIndex + 1}`}
                    className="flex-grow h-8 text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCause(category.id, cause.id)}
                    aria-label="Eliminar causa"
                    className="h-8 w-8 shrink-0"
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button
                onClick={() => handleAddCause(category.id)}
                variant="outline"
                size="sm"
                className="w-full mt-2 text-xs"
              >
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Añadir Causa
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  );

  return (
    <div className="space-y-6 mt-4 p-4 border rounded-lg shadow-sm bg-background">
      <h3 className="text-lg font-semibold font-headline text-center text-primary">
        Diagrama de Ishikawa (Espina de Pescado)
      </h3>
      
      {renderCategoryGroup(topCategories)}

      <div className="flex items-center my-4">
        <div className="flex-grow border-t-2 border-gray-400"></div>
        <Card className="mx-4 shrink-0 shadow-lg border-primary">
            <CardContent className="p-3">
                <p className="text-sm font-semibold text-center text-primary-foreground bg-primary px-3 py-1 rounded">
                    {focusEventDescription || "Evento Foco"}
                </p>
            </CardContent>
        </Card>
        <div className="flex-grow border-t-2 border-gray-400"></div>
      </div>
      
      {renderCategoryGroup(bottomCategories)}
      
    </div>
  );
};
