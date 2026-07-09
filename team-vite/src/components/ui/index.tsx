// Minimal shadcn-style components for Vite (no "use client" needed)
import React from 'react'
import { cn } from '@/lib/utils'
import * as RadixDialog from '@radix-ui/react-dialog'
import * as RadixSelect from '@radix-ui/react-select'
import * as RadixSwitch from '@radix-ui/react-switch'
import * as RadixLabel from '@radix-ui/react-label'
import * as RadixRadio from '@radix-ui/react-radio-group'
import * as RadixProgress from '@radix-ui/react-progress'
import * as RadixAlertDialog from '@radix-ui/react-alert-dialog'

// Button
const buttonVariants: Record<string, string> = {
  default: 'bg-primary text-primary-foreground hover:opacity-90',
  secondary: 'bg-secondary text-secondary-foreground hover:opacity-80',
  outline: 'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  destructive: 'bg-destructive text-white hover:opacity-90',
}
const buttonSizes: Record<string, string> = {
  default: 'h-9 px-4 py-2 text-sm',
  sm: 'h-7 px-3 text-xs',
  lg: 'h-11 px-6 text-base',
  icon: 'h-9 w-9',
}
export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <button ref={ref} className={cn('inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none', buttonVariants[variant], buttonSizes[size], className)} {...props} />
  )
)
Button.displayName = 'Button'

// Input
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn('flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />
  )
)
Input.displayName = 'Input'

// Textarea
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn('flex min-h-[60px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50', className)} {...props} />
  )
)
Textarea.displayName = 'Textarea'

// Badge
export function Badge({ className, variant = 'default', ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'secondary' | 'outline' }) {
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', variant === 'secondary' ? 'bg-secondary text-secondary-foreground' : variant === 'outline' ? 'border border-border text-foreground' : 'bg-primary text-primary-foreground', className)} {...props} />
}

// Card
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('rounded-xl border border-border bg-card shadow-sm', className)} {...props} /> }
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('flex flex-col space-y-1.5 p-4', className)} {...props} /> }
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) { return <h3 className={cn('font-semibold leading-none tracking-tight', className)} {...props} /> }
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('p-4 pt-0', className)} {...props} /> }

// Label
export function Label({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixLabel.Root>) {
  return <RadixLabel.Root className={cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)} {...props} />
}

// Switch
export function Switch({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixSwitch.Root>) {
  return (
    <RadixSwitch.Root className={cn('peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted', className)} {...props}>
      <RadixSwitch.Thumb className='pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0' />
    </RadixSwitch.Root>
  )
}

// Progress
export function Progress({ className, value, ...props }: React.ComponentPropsWithoutRef<typeof RadixProgress.Root> & { value?: number }) {
  return (
    <RadixProgress.Root className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)} {...props}>
      <RadixProgress.Indicator className='h-full w-full flex-1 bg-primary transition-all' style={{ transform: `translateX(-${100 - (value || 0)}%)` }} />
    </RadixProgress.Root>
  )
}

// RadioGroup
export const RadioGroup = RadixRadio.Root
export const RadioGroupItem = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof RadixRadio.Item>>(
  ({ className, ...props }, ref) => (
    <RadixRadio.Item ref={ref} className={cn('aspect-square h-4 w-4 rounded-full border border-primary text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', className)} {...props}>
      <RadixRadio.Indicator className='flex items-center justify-center'>
        <div className='h-2.5 w-2.5 rounded-full bg-primary' />
      </RadixRadio.Indicator>
    </RadixRadio.Item>
  )
)
RadioGroupItem.displayName = 'RadioGroupItem'

// Select
export function Select(props: React.ComponentPropsWithoutRef<typeof RadixSelect.Root>) { return <RadixSelect.Root {...props} /> }
export function SelectTrigger({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof RadixSelect.Trigger>) {
  return (
    <RadixSelect.Trigger className={cn('flex h-9 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50', className)} {...props}>
      {children}<RadixSelect.Icon><span className='text-xs'>▾</span></RadixSelect.Icon>
    </RadixSelect.Trigger>
  )
}
export function SelectValue(props: React.ComponentPropsWithoutRef<typeof RadixSelect.Value>) { return <RadixSelect.Value {...props} /> }
export function SelectContent({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof RadixSelect.Content>) {
  return (
    <RadixSelect.Portal>
      <RadixSelect.Content className={cn('relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-card text-card-foreground shadow-md', className)} position='popper' sideOffset={4} {...props}>
        <RadixSelect.Viewport className='p-1'>{children}</RadixSelect.Viewport>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  )
}
export function SelectItem({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof RadixSelect.Item>) {
  return (
    <RadixSelect.Item className={cn('relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50', className)} {...props}>
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
      <span className='absolute right-2 flex h-3.5 w-3.5 items-center justify-center'>
        <RadixSelect.ItemIndicator><span className='text-xs'>✓</span></RadixSelect.ItemIndicator>
      </span>
    </RadixSelect.Item>
  )
}

// Dialog
export const Dialog = RadixDialog.Root
export const DialogTrigger = RadixDialog.Trigger
export function DialogContent({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof RadixDialog.Content>) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className='fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0' />
      <RadixDialog.Content className={cn('fixed left-[50%] top-[50%] z-50 max-h-[90vh] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-xl border bg-card p-6 shadow-xl duration-200', className)} {...props}>{children}</RadixDialog.Content>
    </RadixDialog.Portal>
  )
}
export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('flex flex-col space-y-1.5 pb-4', className)} {...props} /> }
export function DialogTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixDialog.Title>) { return <RadixDialog.Title className={cn('text-lg font-semibold', className)} {...props} /> }
export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('flex justify-end gap-2 pt-4', className)} {...props} /> }
export const DialogClose = RadixDialog.Close

// AlertDialog
export const AlertDialog = RadixAlertDialog.Root
export const AlertDialogTrigger = RadixAlertDialog.Trigger
export function AlertDialogContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixAlertDialog.Content>) {
  return (
    <RadixAlertDialog.Portal>
      <RadixAlertDialog.Overlay className='fixed inset-0 z-50 bg-black/50' />
      <RadixAlertDialog.Content className={cn('fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl border bg-card p-6 shadow-xl', className)} {...props} />
    </RadixAlertDialog.Portal>
  )
}
export function AlertDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('flex flex-col space-y-2 pb-4', className)} {...props} /> }
export function AlertDialogTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixAlertDialog.Title>) { return <RadixAlertDialog.Title className={cn('text-base font-semibold', className)} {...props} /> }
export function AlertDialogDescription({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixAlertDialog.Description>) { return <RadixAlertDialog.Description className={cn('text-sm text-muted-foreground', className)} {...props} /> }
export function AlertDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('flex justify-end gap-2', className)} {...props} /> }
export const AlertDialogAction = RadixAlertDialog.Action
export const AlertDialogCancel = RadixAlertDialog.Cancel

// Separator
export function Separator({ className, orientation = 'horizontal', ...props }: React.HTMLAttributes<HTMLDivElement> & { orientation?: 'horizontal' | 'vertical' }) {
  return <div className={cn('shrink-0 bg-border', orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', className)} {...props} />
}
