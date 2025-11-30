'use client';

import React from 'react';
import { colors } from '../../utils/colors';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationProps {
  type: NotificationType;
  message: string;
  className?: string;
  onClose?: () => void;
}

export default function Notification({ 
  type, 
  message, 
  className = '',
  onClose 
}: NotificationProps) {
  const config = {
    success: {
      borderColor: colors.success, // #6E7D57 - Verde oliva
      iconColor: colors.logoBranding, // #9f6d1f - Dorado/marrón para el checkmark
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    error: {
      borderColor: colors.danger, // #590C0C - Marrón rojizo
      iconColor: colors.danger,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    warning: {
      borderColor: colors.warning, // #D98E04 - Naranja-marrón
      iconColor: colors.warning,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    info: {
      borderColor: colors.enlacesTextosInteractivos, // #4A7BA7 - Azul oscuro
      iconColor: colors.logoBranding, // #9f6d1f - Marrón dorado para el ícono de info
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };

  const style = config[type];

  return (
    <div 
      className={`flex items-start gap-3 p-4 rounded-lg ${className}`}
      style={{
        backgroundColor: colors.fondoGeneral, // #DCC8B6 - Beige claro de la paleta
        borderLeft: `4px solid ${style.borderColor}`,
      }}
    >
      {/* Ícono */}
      <div 
        className="flex-shrink-0 mt-0.5"
        style={{ color: style.iconColor }}
      >
        {style.icon}
      </div>
      
      {/* Mensaje */}
      <div className="flex-1">
        <p 
          className="text-sm leading-relaxed"
          style={{ color: colors.encabezadosAlterno }} // #2A2A2A - Marrón oscuro/gris oscuro de la paleta
        >
          {message}
        </p>
      </div>
      
      {/* Botón de cerrar (opcional) */}
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Cerrar notificación"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

