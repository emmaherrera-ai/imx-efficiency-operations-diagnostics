"use client";

export type ToastMessage = {
  id: string;
  tone: "success" | "error" | "info";
  message: string;
};

type ToastStackProps = {
  messages: ToastMessage[];
};

export function ToastStack({ messages }: ToastStackProps) {
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {messages.map((toast) => (
        <div className={`toast-message toast-${toast.tone}`} key={toast.id}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
