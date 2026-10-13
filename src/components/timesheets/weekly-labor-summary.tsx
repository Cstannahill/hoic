import { Card, CardContent } from '@/components/ui/card'
import { formatHours, formatCents } from '@/lib/format'
import { DollarSign } from 'lucide-react'

export interface WeeklyLaborSummaryProps {
  isCurrentWeek: boolean
  totalLaborCents: number
  totalLaborMs: number
  workersCount: number
  shiftsCount: number
}

export function WeeklyLaborSummary({
  isCurrentWeek,
  totalLaborCents,
  totalLaborMs,
  workersCount,
  shiftsCount,
}: WeeklyLaborSummaryProps) {
  return (
    <Card className="mb-6 bg-card/80 border-primary/20 shadow-sm overflow-hidden">
      <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            <DollarSign className="size-3.5 text-primary" />
            <span>{isCurrentWeek ? 'Running Weekly Labor' : 'Total Period Labor'}</span>
          </div>
          <div className="text-3xl font-bold text-foreground mt-1 tracking-tight">
            {formatCents(totalLaborCents)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {workersCount} worker{workersCount !== 1 ? 's' : ''} • {shiftsCount} completed shift{shiftsCount !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="flex gap-6 items-center bg-muted/40 px-4 py-2.5 rounded-2xl border border-border/60 self-stretch sm:self-auto justify-around sm:justify-end">
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-0.5">
              Total Hours
            </div>
            <div className="text-xl font-bold text-foreground">
              {formatHours(totalLaborMs)}<span className="text-sm font-medium text-muted-foreground ml-1">h</span>
            </div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-0.5">
              Total Gross Pay
            </div>
            <div className="text-xl font-bold text-primary">
              {formatCents(totalLaborCents)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
