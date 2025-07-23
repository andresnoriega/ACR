
'use client';

import { useState, type FC, useMemo } from 'react';
import type { InvestigationSession, InvestigationTeamMember, FullUserProfile, Site } from '@/types/rca';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { PlusCircle, Trash2, Edit2, Users, Calendar, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid } from 'date-fns';

let idCounter = Date.now();
const generateClientSideId = (prefix: string) => {
    idCounter++;
    return `${prefix}-${idCounter}`;
};

const MemberDialog: FC<{
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (member: Omit<InvestigationTeamMember, 'id'>) => void;
  memberToEdit?: InvestigationTeamMember | null;
  availableUsers: FullUserProfile[];
  availableSites: Site[];
}> = ({ isOpen, onOpenChange, onSave, memberToEdit, availableUsers, availableSites }) => {
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [site, setSite] = useState('');
  const [role, setRole] = useState('');

  useState(() => {
    if (memberToEdit) {
      setName(memberToEdit.name);
      setPosition(memberToEdit.position);
      setSite(memberToEdit.site);
      setRole(memberToEdit.role);
    } else {
      setName('');
      setPosition('');
      setSite('');
      setRole('');
    }
  });

  const handleSubmit = () => {
    onSave({ name, position, site, role });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{memberToEdit ? 'Editar Miembro' : 'Añadir Miembro'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Cargo</Label><Input value={position} onChange={(e) => setPosition(e.target.value)} /></div>
            <div className="space-y-2"><Label>Planta</Label><Input value={site} onChange={(e) => setSite(e.target.value)} /></div>
            <div className="space-y-2"><Label>Rol en la Investigación</Label><Input value={role} onChange={(e) => setRole(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSubmit}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


interface InvestigationTeamManagerProps {
  sessions: InvestigationSession[];
  onSetSessions: (sessions: InvestigationSession[]) => void;
  availableUsers: FullUserProfile[];
  availableSites: Site[];
  isSaving: boolean;
}

export const InvestigationTeamManager: FC<InvestigationTeamManagerProps> = ({ sessions, onSetSessions, availableUsers, availableSites, isSaving }) => {
  const { toast } = useToast();
  const [isSessionDialogOpen, setIsSessionDialogOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<InvestigationTeamMember | null>(null);
  
  const handleAddSession = () => {
    const newSession: InvestigationSession = {
      id: generateClientSideId('session'),
      sessionDate: new Date().toISOString().split('T')[0],
      members: [],
    };
    onSetSessions([...sessions, newSession]);
  };

  const handleUpdateSessionDate = (sessionId: string, date: string) => {
    onSetSessions(sessions.map(s => s.id === sessionId ? { ...s, sessionDate: date } : s));
  };

  const handleRemoveSession = (sessionId: string) => {
    onSetSessions(sessions.filter(s => s.id !== sessionId));
  };
  
  const handleOpenMemberDialog = (sessionId: string, member: InvestigationTeamMember | null = null) => {
    setEditingSessionId(sessionId);
    setEditingMember(member);
    setIsMemberDialogOpen(true);
  };

  const handleSaveMember = (memberData: Omit<InvestigationTeamMember, 'id'>) => {
    if (!editingSessionId) return;

    const newSessions = sessions.map(session => {
      if (session.id === editingSessionId) {
        let updatedMembers;
        if (editingMember) {
          // Editing existing member
          updatedMembers = session.members.map(m => m.id === editingMember.id ? { ...m, ...memberData } : m);
        } else {
          // Adding new member
          const newMember = { ...memberData, id: generateClientSideId('member') };
          updatedMembers = [...session.members, newMember];
        }
        return { ...session, members: updatedMembers };
      }
      return session;
    });
    onSetSessions(newSessions);
  };

  const handleRemoveMember = (sessionId: string, memberId: string) => {
    const newSessions = sessions.map(session => {
        if (session.id === sessionId) {
            const updatedMembers = session.members.filter(m => m.id !== memberId);
            return { ...session, members: updatedMembers };
        }
        return session;
    });
    onSetSessions(newSessions);
  };

  return (
    <div className="space-y-4 pt-4 border-t">
      <h3 className="text-lg font-semibold font-headline flex items-center">
        <Users className="mr-2 h-5 w-5 text-primary" />
        Equipo de Investigación
      </h3>
      {sessions.map((session, sessionIndex) => (
        <Card key={session.id} className="p-4 bg-secondary/30">
          <div className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-2">
                <Label htmlFor={`session-date-${session.id}`} className="font-semibold text-primary flex items-center">
                  <Calendar className="mr-2 h-4 w-4" /> Sesión #{sessionIndex + 1}
                </Label>
                <Input
                    type="date"
                    id={`session-date-${session.id}`}
                    value={session.sessionDate}
                    onChange={(e) => handleUpdateSessionDate(session.id, e.target.value)}
                    className="h-8 w-auto"
                />
             </div>
             <Button variant="ghost" size="icon" onClick={() => handleRemoveSession(session.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
             </Button>
          </div>
          <div className="space-y-2">
              {session.members.map(member => (
                <div key={member.id} className="flex items-center justify-between text-sm p-2 border rounded-md bg-background">
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.position} en {member.site} - Rol: {member.role}</p>
                  </div>
                  <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenMemberDialog(session.id, member)}><Edit2 className="h-3 w-3"/></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveMember(session.id, member.id)}><Trash2 className="h-3 w-3 text-destructive"/></Button>
                  </div>
                </div>
              ))}
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => handleOpenMemberDialog(session.id)}>
              <PlusCircle className="mr-2 h-4 w-4"/> Añadir Miembro a Sesión
          </Button>
        </Card>
      ))}

      <Button onClick={handleAddSession} variant="secondary">
        <PlusCircle className="mr-2 h-4 w-4" /> Añadir Sesión de Investigación
      </Button>

      {isMemberDialogOpen && (
        <MemberDialog
          isOpen={isMemberDialogOpen}
          onOpenChange={setIsMemberDialogOpen}
          onSave={handleSaveMember}
          memberToEdit={editingMember}
          availableUsers={availableUsers}
          availableSites={availableSites}
        />
      )}
    </div>
  );
};
