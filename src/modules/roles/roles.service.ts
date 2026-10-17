import { readFileSync } from 'node:fs';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { etiquetaDeComplemento } from '../../common/constants/index.js';
import { ValidationError } from '../../common/exceptions/index.js';
import { ENV_KEYS } from '../../config/env.constants.js';
import { leerRoles } from './leer-roles.js';
import type { Complemento, Rol, Roles } from './roles.types.js';

const SIN_ROLES: Roles = { defecto: '', roles: [], complementos: [] };

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

  /** Las columnas que son trabajo en curso en algún rol (`curso: true`), sin repetir. */
  columnasEnCurso(): readonly string[] {
    const enCurso = this.roles.roles.flatMap(({ etapas }) =>
      etapas.filter(({ curso }) => curso).map(({ columna }) => columna),
    );
    return [...new Set(enCurso)];
  }

  filtroDe(clave: string): FiltroRol {
    const rol = this.buscar(clave);
    if (rol.clave !== this.roles.defecto) return { tiene: rol.clave };
    const otros = this.roles.roles
      .map((r) => r.clave)
      .filter((otro) => otro !== rol.clave);
    return { sinNinguna: otros };
  }

  complemento(clave: string): Complemento {
    const complemento = this.roles.complementos.find((c) => c.clave === clave);
    if (!complemento) {
      throw new ValidationError(
        `Complemento desconocido: "${clave}". Los válidos: GET /roles`,
      );
    }
    return complemento;
  }

  /** Las etiquetas de todos los complementos: así se reconoce uno entre los nodos. */
  etiquetasDeComplementos(): readonly string[] {
    return this.roles.complementos.map(({ clave }) =>
      etiquetaDeComplemento(clave),
    );
  }

  /** Las de los no accionables (notas): no entran en «hoy puedo» y el tablero las oculta. */
  etiquetasDeNotas(): readonly string[] {
    return this.roles.complementos
      .filter(({ accionable }) => !accionable)
      .map(({ clave }) => etiquetaDeComplemento(clave));
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
