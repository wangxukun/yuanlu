"use client";
import { useEffect, useRef } from "react";
import RegisterForm from "./register-form";

export default function RegisterDialog({
  onRegisterDialogClose,
}: {
  onRegisterDialogClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node)
      ) {
        onRegisterDialogClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onRegisterDialogClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={dialogRef}
        className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <RegisterForm onSuccess={onRegisterDialogClose} />
      </div>
    </div>
  );
}
