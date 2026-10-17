import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { ValidationError } from '../../common/exceptions/domain.exceptions';
import { ETAPAS_POR_DEFECTO } from '../../common/constants/grafo.constants';
import { EtapasService } from '../nodos/etapas.service';
import { RolesService } from './roles.service';

const ARCHIVO = join(__dirname, '../../../test/fixtures/fases/roles.yaml');
const config = (entorno: Record<string, string>) =>
  ({ get: (clave: string) => entorno[clave] }) as unknown as ConfigService;
const conRoles = () => new RolesService(config({ ROLES_ARCHIVO: ARCHIVO }));

describe('RolesService', () => {
  it('sin ROLES_ARCHIVO no hay roles y GET /etapas es la lista del tablero', () => {
    const sinRoles = new RolesService(config({}));
    expect(sinRoles.todos().roles).toEqual([]);
    expect(new EtapasService(config({}), sinRoles).lista()).toEqual(
      ETAPAS_POR_DEFECTO,
    );
  });

  it('las etapas son las del tablero y después las columnas de los roles que falten, sin repetir', () => {
    const extra = { ETAPAS: 'ENTENDIMIENTO,❓ DUDAS EN ESPERA' };
    const lista = new EtapasService(config(extra), conRoles()).lista();
    expect(lista.slice(0, 2)).toEqual(['ENTENDIMIENTO', '❓ DUDAS EN ESPERA']);
    expect(lista).toContain('CAMBIAR 🧰');
    expect(new Set(lista).size).toBe(lista.length);
  });

  it('las notas son las etiquetas de los complementos no accionables; un complemento desconocido es 400', () => {
    const roles = conRoles();
    expect(roles.etiquetasDeNotas()).toContain('complemento:apunte');
    expect(roles.etiquetasDeNotas()).not.toContain('complemento:tramite');
    expect(roles.etiquetasDeComplementos()).toHaveLength(12);
    expect(() => roles.complemento('nada')).toThrow(ValidationError);
  });

  it('el filtro del defecto excluye a los nodos de otro rol; el de otro rol pide su etiqueta', () => {
    const roles = conRoles();
    expect(roles.filtroDe('producto')).toEqual({ sinNinguna: ['calidad'] });
    expect(roles.filtroDe('calidad')).toEqual({ tiene: 'calidad' });
    expect(() => roles.filtroDe('nadie')).toThrow(ValidationError);
  });
});
