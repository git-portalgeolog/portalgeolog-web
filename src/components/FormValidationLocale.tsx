"use client";

import { useEffect } from "react";

type ValidatableField =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;

const getPortugueseValidationMessage = (target: ValidatableField): string => {
  const { validity, type, value } = target;

  if (validity.valueMissing) {
    return "Este campo é obrigatório.";
  }

  if (validity.typeMismatch) {
    if (type === "email") {
      return "Informe um e-mail válido.";
    }

    if (type === "url") {
      return "Informe uma URL válida.";
    }

    return "Informe um valor válido.";
  }

  if (validity.tooShort) {
    return target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
      ? `O texto deve ter pelo menos ${target.minLength} caracteres.`
      : "O texto informado é muito curto.";
  }

  if (validity.tooLong) {
    return target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
      ? `O texto deve ter no máximo ${target.maxLength} caracteres.`
      : "O texto informado é muito longo.";
  }

  if (validity.patternMismatch) {
    if (type === "email") {
      return "Informe um e-mail válido.";
    }

    if (type === "tel") {
      return "Informe um telefone válido.";
    }

    if (value.trim().length === 0) {
      return "Este campo é obrigatório.";
    }

    return "O valor informado é inválido.";
  }

  if (validity.rangeUnderflow) {
    return target instanceof HTMLInputElement
      ? `O valor mínimo permitido é ${target.min}.`
      : "O valor informado é menor do que o permitido.";
  }

  if (validity.rangeOverflow) {
    return target instanceof HTMLInputElement
      ? `O valor máximo permitido é ${target.max}.`
      : "O valor informado é maior do que o permitido.";
  }

  if (validity.stepMismatch) {
    return "O valor informado não respeita o formato esperado.";
  }

  if (validity.badInput) {
    return "Informe um valor válido.";
  }

  return "Verifique este campo.";
};

const clearCustomValidity = (target: EventTarget | null) => {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    target.setCustomValidity("");
  }
};

export function FormValidationLocale() {
  useEffect(() => {
    const handleInvalidCapture = (event: Event) => {
      const target = event.target;

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        target.setCustomValidity(getPortugueseValidationMessage(target));
      }
    };

    const handleInputCapture = (event: Event) => {
      clearCustomValidity(event.target);
    };

    document.addEventListener("invalid", handleInvalidCapture, true);
    document.addEventListener("input", handleInputCapture, true);
    document.addEventListener("change", handleInputCapture, true);

    return () => {
      document.removeEventListener("invalid", handleInvalidCapture, true);
      document.removeEventListener("input", handleInputCapture, true);
      document.removeEventListener("change", handleInputCapture, true);
    };
  }, []);

  return null;
}
