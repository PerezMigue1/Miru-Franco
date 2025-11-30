'use client';

import ModuleLayout from '../../components/layouts/ModuleLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Table, { TableRow, TableCell } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { useState } from 'react';
import { colors } from '../../utils/colors';

export default function UsuariosRolesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const usuarios = [
    { id: 1, nombre: 'Mildred Franco', email: 'mildred@mirufranco.com', rol: 'Administrador', estado: 'activo', ultimoAcceso: '2024-01-15 10:30' },
    { id: 2, nombre: 'Auxiliar', email: 'auxiliar@mirufranco.com', rol: 'Empleado', estado: 'activo', ultimoAcceso: '2024-01-15 09:00' },
    { id: 3, nombre: 'Contadora', email: 'contadora@ejemplo.com', rol: 'Contadora', estado: 'activo', ultimoAcceso: '2024-01-14 16:00' },
  ];

  const roles = [
    { id: 1, nombre: 'Administrador', descripcion: 'Acceso completo al sistema', permisos: 'Todos' },
    { id: 2, nombre: 'Empleado', descripcion: 'Operaciones del día a día', permisos: 'Ventas, Citas, Inventario (consulta)' },
    { id: 3, nombre: 'Estilista', descripcion: 'Servicios y citas asignadas', permisos: 'Citas, Servicios, Clientes' },
    { id: 4, nombre: 'Contadora', descripcion: 'Facturación y reportes fiscales', permisos: 'Facturación, Reportes' },
  ];

  return (
    <ModuleLayout>
      <PageHeader
        title="Usuarios y Roles"
        subtitle="Administra usuarios, roles y permisos del sistema"
        actions={
          <Button onClick={() => setIsModalOpen(true)}>+ Nuevo Usuario</Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
            Usuarios
          </h2>
          <Table headers={['Nombre', 'Email', 'Rol', 'Estado', 'Último Acceso', 'Acciones']}>
            {usuarios.map((usuario) => (
              <TableRow key={usuario.id}>
                <TableCell className="font-semibold">{usuario.nombre}</TableCell>
                <TableCell>{usuario.email}</TableCell>
                <TableCell>
                  <Badge variant={usuario.rol === 'Administrador' ? 'info' : 'default'}>
                    {usuario.rol}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={usuario.estado === 'activo' ? 'success' : 'danger'}>
                    {usuario.estado}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{usuario.ultimoAcceso}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">Editar</Button>
                    <Button size="sm" variant="danger">Desactivar</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        </Card>

        <Card>
          <h2 className="text-page-title mb-4" style={{ color: colors.menuTextoPrincipal }}>
            Roles del Sistema
          </h2>
          <div className="space-y-3">
            {roles.map((rol) => (
              <div
                key={rol.id}
                className="p-4 rounded-lg"
                style={{ backgroundColor: colors.fondosSuaves }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold" style={{ color: colors.menuTextoPrincipal }}>
                    {rol.nombre}
                  </h3>
                  <Badge variant="info">Ver Permisos</Badge>
                </div>
                <p className="text-sm mb-2" style={{ color: colors.encabezadosAlterno }}>
                  {rol.descripcion}
                </p>
                <p className="text-xs" style={{ color: colors.encabezadosAlterno }}>
                  Permisos: {rol.permisos}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nuevo Usuario"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => setIsModalOpen(false)}>Crear Usuario</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Nombre Completo" placeholder="Nombre del usuario" fullWidth />
          <Input label="Email" type="email" placeholder="usuario@ejemplo.com" fullWidth />
          <Input label="Contraseña" type="password" placeholder="••••••••" fullWidth />
          <Select
            label="Rol"
            options={roles.map(r => ({ value: r.id.toString(), label: r.nombre }))}
            fullWidth
          />
        </div>
      </Modal>
    </ModuleLayout>
  );
}

