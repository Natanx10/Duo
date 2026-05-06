import { Plus, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardQuickActionsProps {
  onOpenEventDialog: () => void;
  onOpenTodoDialog: () => void;
}

export function DashboardQuickActions({ onOpenEventDialog, onOpenTodoDialog }: DashboardQuickActionsProps) {
  return (
    <section className="mb-24 space-y-2">
      <Button
        onClick={onOpenEventDialog}
        className="h-12 w-full gradient-primary text-primary-foreground"
      >
        <Plus className="mr-1.5 h-4 w-4" /> Criar compromisso
      </Button>
      <Button
        onClick={onOpenTodoDialog}
        variant="outline"
        className="h-12 w-full border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
      >
        <CheckSquare className="mr-1.5 h-4 w-4" /> Criar tarefa
      </Button>
    </section>
  );
}
