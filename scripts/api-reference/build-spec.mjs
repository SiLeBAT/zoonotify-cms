// @ts-check
// Builds the OpenAPI description of the Public Data API from Strapi content-type
// schemas. Pure: no filesystem, no Strapi boot, and the same input always yields
// the same output, so CI can diff the result against the committed copy.

const SCALAR_TYPES = {
  string: { type: 'string' },
  text: { type: 'string' },
  richtext: { type: 'string', description: 'Markdown.' },
  email: { type: 'string', format: 'email' },
  uid: { type: 'string' },
  enumeration: { type: 'string' },
  integer: { type: 'integer' },
  // Strapi serialises bigints as strings to avoid precision loss.
  biginteger: { type: 'string', pattern: '^-?\\d+$' },
  decimal: { type: 'number' },
  float: { type: 'number' },
  boolean: { type: 'boolean' },
  date: { type: 'string', format: 'date' },
  datetime: { type: 'string', format: 'date-time' },
  time: { type: 'string' },
  json: {},
};

const TO_MANY = new Set(['oneToMany', 'manyToMany']);

const schemaRef = (name) => ({ $ref: `#/components/schemas/${name}` });
const paramRef = (name) => ({ $ref: `#/components/parameters/${name}` });
const responseRef = (name) => ({ $ref: `#/components/responses/${name}` });

const pascal = (s) =>
  s
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('');

const isLocalized = (schema) => schema.pluginOptions?.i18n?.localized === true;

/**
 * @param {{
 *   contentTypes: { uid: string, schema: any }[],
 *   components: Record<string, any>,
 *   config: { include: Record<string, string[]>, exclude: string[] },
 *   base: any,
 * }} input
 */
export function buildSpec({ contentTypes, components, config, base }) {
  const included = classify(contentTypes, config, base);
  const byUid = new Map(contentTypes.map((ct) => [ct.uid, ct]));
  const schemaName = (ct) => pascal(ct.schema.info.singularName);
  const locales = base.components.parameters.locale.schema.enum;

  const spec = structuredClone(base);
  const schemas = spec.components.schemas;
  const addSchema = (name, schema) => {
    if (name in schemas) throw new Error(`Schema name collision: ${name}`);
    schemas[name] = schema;
  };

  const emittedComponents = new Map();
  const componentSchema = (uid, where) => {
    if (!emittedComponents.has(uid)) {
      const component = components[uid];
      if (!component) throw new Error(`${where} uses unknown component ${uid}`);
      const name = pascal(component.info.displayName);
      emittedComponents.set(uid, name);
      const properties = { id: { type: 'integer' } };
      for (const [key, attr] of Object.entries(component.attributes)) {
        if (attr.private) continue;
        // Nested relations only appear with deep populate, which is not promised.
        if (attr.type === 'relation' || attr.type === 'component') continue;
        properties[key] = scalar(attr, `${uid}.${key}`);
      }
      addSchema(name, { type: 'object', properties });
    }
    return emittedComponents.get(uid);
  };

  for (const [tag, plurals] of Object.entries(config.include)) {
    for (const plural of plurals) {
      const ct = included.get(plural);
      const name = schemaName(ct);
      const { properties, populate, fields } = recordProperties(ct, (attr, key) => {
        const where = `${plural}.${key}`;
        if (attr.type === 'relation') {
          const target = byUid.get(attr.target);
          if (!target || !included.has(target.schema.info.pluralName)) return undefined;
          return { ref: schemaName(target), many: TO_MANY.has(attr.relation) };
        }
        if (attr.type === 'component') {
          return { ref: componentSchema(attr.component, where), many: attr.repeatable === true };
        }
        return undefined;
      }, locales);

      addSchema(name, { type: 'object', required: ['id', 'documentId'], properties });
      addSchema(`${name}ListResponse`, {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: { type: 'array', items: schemaRef(name) },
          meta: {
            type: 'object',
            required: ['pagination'],
            properties: { pagination: schemaRef('Pagination') },
          },
        },
      });
      addSchema(`${name}Response`, {
        type: 'object',
        required: ['data', 'meta'],
        properties: { data: schemaRef(name), meta: { type: 'object' } },
      });

      const shapeParams = [
        fieldsParam(fields),
        ...(populate.length ? [populateParam(populate)] : []),
        ...(isLocalized(ct.schema) ? [paramRef('locale')] : []),
      ];
      const label = ct.schema.info.displayName;
      const opName = pascal(plural);

      spec.paths[`/${plural}`] = {
        get: {
          tags: [tag],
          operationId: `find${opName}`,
          summary: `List ${label} records`,
          parameters: [
            paramRef('filters'),
            paramRef('sort'),
            ...shapeParams,
            paramRef('paginationPage'),
            paramRef('paginationPageSize'),
          ],
          responses: {
            200: okResponse(`${name}ListResponse`),
            400: responseRef('BadRequest'),
            500: responseRef('ServerError'),
          },
        },
      };
      spec.paths[`/${plural}/{documentId}`] = {
        get: {
          tags: [tag],
          operationId: `findOne${name}`,
          summary: `Get one ${label} record`,
          parameters: [paramRef('documentId'), ...shapeParams],
          responses: {
            200: okResponse(`${name}Response`),
            400: responseRef('BadRequest'),
            404: responseRef('NotFound'),
            500: responseRef('ServerError'),
          },
        },
      };
    }
  }

  return spec;
}

function classify(contentTypes, config, base) {
  const byPlural = new Map(contentTypes.map((ct) => [ct.schema.info.pluralName, ct]));
  const tags = new Set((base.tags ?? []).map((t) => t.name));
  const included = new Map();
  const seen = new Map();
  const problems = [];

  const mark = (plural, as) => {
    if (seen.has(plural)) problems.push(`${plural} is classified twice (${seen.get(plural)}, ${as})`);
    seen.set(plural, as);
    if (!byPlural.has(plural)) problems.push(`${plural} names no content type`);
  };
  for (const [tag, plurals] of Object.entries(config.include)) {
    if (!tags.has(tag)) problems.push(`include group "${tag}" is not a tag in the base`);
    for (const plural of plurals) {
      mark(plural, 'include');
      if (byPlural.has(plural)) included.set(plural, byPlural.get(plural));
    }
  }
  for (const plural of config.exclude) mark(plural, 'exclude');

  const unclassified = [...byPlural.keys()].filter((p) => !seen.has(p)).sort();
  if (unclassified.length) {
    problems.push(
      `unclassified content types (add each to include or exclude): ${unclassified.join(', ')}`,
    );
  }
  if (problems.length) throw new Error(`Invalid API reference config:\n- ${problems.join('\n- ')}`);

  for (const [plural, ct] of included) {
    if (ct.schema.kind !== 'collectionType') {
      throw new Error(`${plural} is a ${ct.schema.kind}; only collection types can be included`);
    }
  }
  return included;
}

function recordProperties(ct, linkFor, locales) {
  const plural = ct.schema.info.pluralName;
  const properties = {
    id: { type: 'integer', description: 'Locale-specific row id. Prefer `documentId`.' },
    documentId: {
      type: 'string',
      description: 'Stable id; the same `documentId` names this record in every locale.',
    },
  };
  const populate = [];
  const fields = [];

  for (const [key, attr] of Object.entries(ct.schema.attributes)) {
    if (attr.private) continue;
    if (attr.type === 'relation' || attr.type === 'component') {
      const link = linkFor(attr, key);
      if (!link) continue;
      populate.push(key);
      const description = `Only returned when requested with \`populate=${key}\`.`;
      properties[key] = link.many
        ? { type: 'array', items: schemaRef(link.ref), description }
        : { type: 'object', allOf: [schemaRef(link.ref)], nullable: true, description };
      continue;
    }
    properties[key] = scalar(attr, `${plural}.${key}`);
    fields.push(key);
  }

  const timestamp = { type: 'string', format: 'date-time' };
  properties.createdAt = timestamp;
  properties.updatedAt = timestamp;
  properties.publishedAt = timestamp;
  fields.push('createdAt', 'updatedAt', 'publishedAt');
  if (isLocalized(ct.schema)) {
    properties.locale = { type: 'string', enum: [...locales] };
    fields.push('locale');
  }

  return { properties, populate, fields };
}

function scalar(attr, where) {
  const mapped = SCALAR_TYPES[attr.type];
  if (!mapped) {
    throw new Error(
      `${where} has attribute type ${attr.type}, which the API reference generator cannot map`,
    );
  }
  const schema = { ...mapped };
  if (attr.type === 'enumeration') schema.enum = [...attr.enum];
  if (!attr.required) {
    schema.nullable = true;
    if (schema.enum) schema.enum.push(null);
  }
  return schema;
}

function fieldsParam(fields) {
  return {
    name: 'fields',
    in: 'query',
    description:
      'Return only these attributes (`id` and `documentId` are always returned). Repeat the parameter for several.',
    style: 'form',
    explode: true,
    schema: { type: 'array', items: { type: 'string', enum: fields } },
  };
}

function populateParam(names) {
  return {
    name: 'populate',
    in: 'query',
    description:
      'Embed these relations or components, which are omitted by default. Only the names listed here are supported; `*` and nested (deep) populate are not part of the Public Data API.',
    style: 'form',
    explode: true,
    schema: { type: 'array', items: { type: 'string', enum: names } },
  };
}

function okResponse(schemaName) {
  return {
    description: 'OK',
    content: { 'application/json': { schema: schemaRef(schemaName) } },
  };
}
