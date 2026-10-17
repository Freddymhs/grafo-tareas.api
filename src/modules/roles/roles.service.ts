import { readFileSync } from 'node:fs';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ValidationError } from '../../common/exceptions/index.js';
import { ENV_KEYS } from '../../config/env.constants.js';
import { leerRoles } from './leer-roles.js';
import type { Rol, Roles } from './roles.types.js';

const SIN_ROLES: Roles = { defecto: '', roles: [] };

/** El nodo es de un rol si lleva su clave como etiqueta; el del `defecto`, si no lleva la de ningún otro. */
export interface FiltroRol {
  readonly tiene?: string;
  readonly sinNinguna?: readonly string[];
}

/** Los roles del área, leídos una vez al arrancar: un archivo roto no deja levantar la API. */
@Injectable()
export class RolesService {
  private readonly roles: Roles;

  constructor(config: ConfigService) {
    const archivo = config.get<string>(ENV_KEYS.ROLES_ARCHIVO);
    this.roles = archivo ? leerRoles(readFileSync(archivo, 'utf8')) : SIN_ROLES;
  }

  todos(): Roles {
    return this.roles;
  }

  /** Las columnas de todos los roles, sin repetir, en el orden del archivo. */
  columnas(): readonly string[] {
    const todas = this.roles.roles.flatMap(({ etapas }) =>
      etapas.map(({ columna }) => columna),
    );
    return [...new Set(todas)];
  }

  filtroDe(clave: string): FiltroRol {
    const rol = this.buscar(clave);
    if (rol.clave !== this.roles.defecto) return { tiene: rol.clave };
    const otros = this.roles.roles
      .map((r) => r.clave)
      .filter((otro) => otro !== rol.clave);
    return { sinNinguna: otros };
  }

  private buscar(clave: string): Rol {
    const rol = this.roles.roles.find((r) => r.clave === clave);
    if (!rol) {
      throw new ValidationError(
        `Rol desconocido: "${clave}". Los válidos: GET /roles`,
      );
    }
    return rol;
  }
}
