'use client'

import * as React from 'react'
import { useRef } from 'react'
import {
  parse24To12,
  format12To24,
  stepHour,
  stepMinute,
  type Period,
} from '@/lib/time-picker'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TimePickerProps {
  id?: string
  value: string // 'HH:mm'
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

export function TimePicker({
  id,
  value,
  onChange,
  disabled = false,
  className,
  'aria-label': ariaLabel,
}: TimePickerProps) {
  const { hour12, minute, period } = parse24To12(value)
  const minuteInputRef = useRef<HTMLInputElement>(null)

  const handleHourChange = (newHour: number) => {
    onChange(format12To24(newHour, minute, period))
  }

  const handleMinuteChange = (newMinute: number) => {
    onChange(format12To24(hour12, newMinute, period))
  }

  const handlePeriodChange = (newPeriod: Period) => {
    onChange(format12To24(hour12, minute, newPeriod))
  }

  const onHourInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '')
    if (!val) {
      handleHourChange(1)
      return
    }
    const num = parseInt(val, 10)
    if (num >= 1 && num <= 12) {
      handleHourChange(num)
      // Auto-focus minute if user typed two digits or a number >= 2
      if (val.length >= 2 || num > 1) {
        minuteInputRef.current?.focus()
        minuteInputRef.current?.select()
      }
    }
  }

  const onMinuteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '')
    if (!val) {
      handleMinuteChange(0)
      return
    }
    const num = parseInt(val, 10)
    if (num >= 0 && num <= 59) {
      handleMinuteChange(num)
    }
  }

  const onHourKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      handleHourChange(stepHour(hour12, 1))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      handleHourChange(stepHour(hour12, -1))
    }
  }

  const onMinuteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      handleMinuteChange(stepMinute(minute, 1))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      handleMinuteChange(stepMinute(minute, -1))
    }
  }

  const minutePresets = [0, 15, 30, 45]

  return (
    <div
      id={id}
      aria-label={ariaLabel}
      className={cn(
        'flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-xs',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
    >
      {/* Digits & AM/PM Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {/* Hour Block */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              aria-label="Increase hour"
              disabled={disabled}
              onClick={() => handleHourChange(stepHour(hour12, 1))}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            >
              <ChevronUp className="size-4" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              aria-label="Hour"
              value={String(hour12).padStart(2, '0')}
              onChange={onHourInputChange}
              onKeyDown={onHourKeyDown}
              onFocus={(e) => e.target.select()}
              disabled={disabled}
              className="w-12 h-11 text-center font-bold text-xl rounded-xl bg-muted/60 border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent tabular-nums"
            />
            <button
              type="button"
              aria-label="Decrease hour"
              disabled={disabled}
              onClick={() => handleHourChange(stepHour(hour12, -1))}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            >
              <ChevronDown className="size-4" />
            </button>
          </div>

          <span className="text-2xl font-bold text-muted-foreground pb-1">:</span>

          {/* Minute Block */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              aria-label="Increase minute"
              disabled={disabled}
              onClick={() => handleMinuteChange(stepMinute(minute, 1))}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            >
              <ChevronUp className="size-4" />
            </button>
            <input
              ref={minuteInputRef}
              type="text"
              inputMode="numeric"
              aria-label="Minute"
              value={String(minute).padStart(2, '0')}
              onChange={onMinuteInputChange}
              onKeyDown={onMinuteKeyDown}
              onFocus={(e) => e.target.select()}
              disabled={disabled}
              className="w-12 h-11 text-center font-bold text-xl rounded-xl bg-muted/60 border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent tabular-nums"
            />
            <button
              type="button"
              aria-label="Decrease minute"
              disabled={disabled}
              onClick={() => handleMinuteChange(stepMinute(minute, -1))}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            >
              <ChevronDown className="size-4" />
            </button>
          </div>
        </div>

        {/* AM / PM Segmented Control */}
        <div className="flex flex-col gap-1 p-1 bg-muted/50 rounded-xl border border-input/40 shrink-0">
          <button
            type="button"
            data-active={period === 'AM'}
            disabled={disabled}
            onClick={() => handlePeriodChange('AM')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
              period === 'AM'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            AM
          </button>
          <button
            type="button"
            data-active={period === 'PM'}
            disabled={disabled}
            onClick={() => handlePeriodChange('PM')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
              period === 'PM'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            PM
          </button>
        </div>
      </div>

      {/* Quick Rounding Chips */}
      <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-border/50">
        <span className="text-[11px] font-medium text-muted-foreground">Quick minutes:</span>
        <div className="flex gap-1">
          {minutePresets.map((m) => {
            const isCurrent = minute === m
            return (
              <button
                key={m}
                type="button"
                disabled={disabled}
                onClick={() => handleMinuteChange(m)}
                className={cn(
                  'px-2 py-0.5 rounded-md text-xs font-medium transition-colors border',
                  isCurrent
                    ? 'bg-primary/15 border-primary/40 text-primary font-semibold'
                    : 'bg-muted/30 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                :{String(m).padStart(2, '0')}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
