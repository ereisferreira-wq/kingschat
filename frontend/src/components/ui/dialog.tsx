import React from "react";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogHeaderProps {
  children: React.ReactNode;
}

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div onClick={() => onOpenChange(false)}>{children}</div>
    </div>
  );
}

export function DialogContent({ children, className = "" }: DialogContentProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-950 rounded-lg shadow-lg max-w-md w-full mx-4 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function DialogHeader({ children }: DialogHeaderProps) {
  return <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">{children}</div>;
}

export function DialogTitle({ children, className = "" }: DialogTitleProps) {
  return <h2 className={`text-lg font-semibold ${className}`}>{children}</h2>;
}

export function DialogDescription({ children, className = "" }: DialogDescriptionProps) {
  return <p className={`text-sm text-gray-600 dark:text-gray-400 ${className}`}>{children}</p>;
}

export function DialogFooter({ children, className = "" }: DialogFooterProps) {
  return <div className={`px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex gap-2 justify-end ${className}`}>{children}</div>;
}
