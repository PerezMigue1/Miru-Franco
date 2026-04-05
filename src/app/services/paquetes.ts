// src/services/paquetes.ts

const API_URL = 'http://localhost:3000/api'; 

// OBTENER TODOS LOS PAQUETES
export const getPaquetes = async () => {
  const response = await fetch(`${API_URL}/paquetes`);
  if (!response.ok) throw new Error('Error al obtener los paquetes');
  return await response.json();
};

// NUEVO: OBTENER UN SOLO PAQUETE POR ID (Para la vista de edición)
export const getPaqueteById = async (id: string) => {
  const response = await fetch(`${API_URL}/paquetes/${id}`);
  if (!response.ok) throw new Error('No se pudo encontrar el paquete');
  return await response.json();
};

// CREAR UN PAQUETE
export const createPaquete = async (paqueteData: any) => {
  const response = await fetch(`${API_URL}/paquetes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paqueteData),
  });
  if (!response.ok) throw new Error('Error al crear el paquete');
  return await response.json();
};

// NUEVO: ACTUALIZAR UN PAQUETE
export const updatePaquete = async (id: string, paqueteData: any) => {
  const response = await fetch(`${API_URL}/paquetes/${id}`, {
    method: 'PATCH', // Usamos PATCH porque así lo configuramos en NestJS
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paqueteData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al actualizar el paquete');
  }
  return await response.json();
};

// ELIMINAR UN PAQUETE
export const deletePaquete = async (id: string) => {
  console.log("Enviando petición DELETE a:", `${API_URL}/paquetes/${id}`);
  const response = await fetch(`${API_URL}/paquetes/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al eliminar el paquete');
  }
  return await response.json();
};