import * as React from 'react'

import { cn } from '@/lib/utils'

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto rounded-xl border bg-card"
    >
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-left', className)}
        {...props}
      />
    </div>
  )
}
function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn('bg-surface-2 text-[14px] text-ink-2', className)}
      {...props}
    />
  )
}
function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
}
function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr data-slot="table-row" className={cn('border-b transition-colors', className)} {...props} />
  )
}
function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      scope="col"
      className={cn('border-b px-5 py-3 font-medium whitespace-nowrap', className)}
      {...props}
    />
  )
}
function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td data-slot="table-cell" className={cn('px-5 py-3.5 align-middle', className)} {...props} />
  )
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
