
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseIdleTimerProps {
  onIdlePrompt: () => void; // Callback cuando se debe mostrar el prompt de inactividad
  onConfirmLogout: () => void; // Callback cuando el tiempo del prompt expira y se debe hacer logout
  idleTime?: number; // Tiempo en ms para considerar inactivo
  promptTime?: number; // Tiempo en ms que el prompt está visible antes del logout automático
  isActive?: boolean; // Para controlar si el timer está activo (ej. si hay usuario)
}

const DEFAULT_IDLE_TIME = 5 * 60 * 1000; // 5 minutos
const DEFAULT_PROMPT_TIME = 1 * 60 * 1000; // 1 minuto

export function useIdleTimer({
  onIdlePrompt,
  onConfirmLogout,
  idleTime = DEFAULT_IDLE_TIME,
  promptTime = DEFAULT_PROMPT_TIME,
  isActive = true,
}: UseIdleTimerProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [countdown, setCountdown] = useState(promptTime / 1000);

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const promptTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timer | null>(null);

  const clearAllTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (promptTimerRef.current) clearTimeout(promptTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, []);

  const handleIdle = useCallback(() => {
    setShowPrompt(true);
    setCountdown(promptTime / 1000);
    onIdlePrompt();

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prevCount) => {
        if (prevCount <= 1) {
          clearInterval(countdownIntervalRef.current!);
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);

    promptTimerRef.current = setTimeout(() => {
      onConfirmLogout();
      clearAllTimers();
      setShowPrompt(false);
    }, promptTime);
  }, [onIdlePrompt, onConfirmLogout, promptTime, clearAllTimers]);

  const resetTimer = useCallback(() => {
    clearAllTimers();
    setShowPrompt(false);
    setCountdown(promptTime / 1000);

    if (!isActive) return;

    idleTimerRef.current = setTimeout(handleIdle, idleTime);
  }, [clearAllTimers, isActive, handleIdle, idleTime, promptTime]);

  useEffect(() => {
    const handleActivity = () => {
      // Solo resetear si la pestaña está visible y el timer está activo
      if (document.visibilityState === 'visible' && isActive) {
        resetTimer();
      }
    };

    if (isActive) {
      resetTimer(); // Iniciar al montar o cuando isActive cambia a true
      const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll', 'visibilitychange'];
      events.forEach(event => window.addEventListener(event, handleActivity, { capture: true, passive: true }));

      return () => {
        clearAllTimers();
        events.forEach(event => window.removeEventListener(event, handleActivity, { capture: true }));
      };
    } else {
      clearAllTimers(); // Limpiar si no está activo
      setShowPrompt(false); // Asegurar que el prompt se oculte
    }
  }, [isActive, resetTimer, clearAllTimers]); // Dependencias clave

  return { showPrompt, countdown, stayActive: resetTimer };
}
