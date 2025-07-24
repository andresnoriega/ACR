
'use client';
import type { FC } from 'react';
import { CTMInteractive } from './CTMInteractive';
import type { FiveWhys2Data } from '@/types/rca';


interface FiveWhys2InteractiveProps {
  whyWhy2Data: FiveWhys2Data;
  onSetWhyWhy2Data: (data: FiveWhys2Data) => void;
  focusEventDescription: string;
}

export const FiveWhys2Interactive: FC<FiveWhys2InteractiveProps> = ({ whyWhy2Data, onSetWhyWhy2Data, focusEventDescription }) => {
  return (
    <CTMInteractive
      ctmData={whyWhy2Data}
      onSetCtmData={onSetWhyWhy2Data}
    />
  );
};
