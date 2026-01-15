import ExcelJS from 'exceljs';
import fs from 'fs';
import pLimit from 'p-limit';
import path from 'path';


const dataDirectory = path.join(__dirname, '../../../data');
const zoonotifyDataFile = path.join(dataDirectory, 'ZooNotify_DB.xlsx');

const amrSheetName = 'amr_resrate';
const amrImportResultFile = path.join(
  dataDirectory,
  'resistances-import-result.json'
);

function parseNumeric(cell, parser) {
  if (cell === '' || cell === null || cell === '-' || cell === '_') {
    return null;
  }
  const normalized = String(cell).replace(/,/g, '.');
  const value = parser(normalized);
  if (Number.isNaN(value)) {
    return null;
  }
  return value;
}

function removeNulls(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== null)
  );
}


export async function importResistances(strapi) {


  const importLog = {
    FileFound: false,
    SheetFound: false,
    SheetName: null,
    TotalRowsInSheet: 0,
    TotalRecordsProcessed: 0,
    EnglishSaved: 0,
    EnglishUpdated: 0,
    GermanSaved: 0,
    GermanUpdated: 0,
    RowsImported: 0,
    TotalFailures: 0,
    Failures: []
  };

  if (!fs.existsSync(zoonotifyDataFile)) {
    fs.writeFileSync(amrImportResultFile, JSON.stringify(importLog, null, 2));
    return;
  }
  importLog.FileFound = true;

  const service = strapi.entityService;
  const collection = 'api::resistance.resistance';

  /* -------------------------------
     Memory-safe relation cache
  -------------------------------- */
  const relationCache = new Map();

  async function getRelationId(uid, name, locale) {
    if (!name) return null;
    const key = `${uid}:${locale}:${name}`;
    if (relationCache.has(key)) return relationCache.get(key);

    const id = await findEntityIdByName(strapi, uid, name, locale);
    relationCache.set(key, id || null);
    return id;
  }

  /* -------------------------------
     Concurrency limiter
  -------------------------------- */
  const limit = pLimit(5); // tune for DB capacity
  const pending = [];

  /* -------------------------------
     Row processor
  -------------------------------- */
  async function processRow(row) {
    const rowNumber = row.number;
    importLog.TotalRecordsProcessed++;

    const item = {
      rowNumber,
      zomoProgram: row.getCell(1).value,
      samplingYear: parseNumeric(row.getCell(2).value, parseInt),
      microorganism_de: row.getCell(4).value,
      microorganism_en: row.getCell(5).value,
      specie_de: row.getCell(6).value || null,
      specie_en: row.getCell(7).value || null,
      sampleType_de: row.getCell(8).value,
      sampleType_en: row.getCell(9).value,
      superCategorySampleOrigin_de: row.getCell(10).value,
      superCategorySampleOrigin_en: row.getCell(11).value,
      sampleOrigin_de: row.getCell(12).value,
      sampleOrigin_en: row.getCell(13).value,
      samplingStage_de: row.getCell(14).value,
      samplingStage_en: row.getCell(15).value,
      matrixGroup_de: row.getCell(16).value,
      matrixGroup_en: row.getCell(17).value,
      matrix_de: row.getCell(18).value,
      matrix_en: row.getCell(19).value,
      antimicrobialSubstance_en: row.getCell(22).value || null,
      antimicrobialSubstance_de: row.getCell(23).value || null,
      anzahlGetesteterIsolate: parseNumeric(row.getCell(24).value, parseInt),
      anzahlResistenterIsolate: parseNumeric(row.getCell(25).value, parseInt),
      resistenzrate: parseNumeric(row.getCell(26).value, parseFloat),
      minKonfidenzintervall: parseNumeric(row.getCell(27).value, parseFloat),
      maxKonfidenzintervall: parseNumeric(row.getCell(28).value, parseFloat),
      dbId: String(row.getCell(29).value)
    };

    try {
      /* ---------- EN relations ---------- */
      const matrixId_en = await getRelationId('api::matrix.matrix', item.matrix_en, 'en');
      const matrixGroupId_en = await getRelationId('api::matrix-group.matrix-group', item.matrixGroup_en, 'en');
      const microorganismId_en = await getRelationId('api::microorganism.microorganism', item.microorganism_en, 'en');
      const sampleTypeId_en = await getRelationId('api::sample-type.sample-type', item.sampleType_en, 'en');
      const samplingStageId_en = await getRelationId('api::sampling-stage.sampling-stage', item.samplingStage_en, 'en');
      const sampleOriginId_en = await getRelationId('api::sample-origin.sample-origin', item.sampleOrigin_en, 'en');
      const superCategorySampleOriginId_en = await getRelationId(
        'api::super-category-sample-origin.super-category-sample-origin',
        item.superCategorySampleOrigin_en,
        'en'
      );
      const antimicrobialSubstanceId_en = await getRelationId(
        'api::antimicrobial-substance.antimicrobial-substance',
        item.antimicrobialSubstance_en,
        'en'
      );
      const specieId_en = await getRelationId('api::specie.specie', item.specie_en, 'en');

      if (
        !item.dbId ||
        !matrixId_en ||
        !matrixGroupId_en ||
        !microorganismId_en ||
        !sampleTypeId_en ||
        !samplingStageId_en ||
        !sampleOriginId_en ||
        !superCategorySampleOriginId_en ||
        !antimicrobialSubstanceId_en
      ) {
        throw new Error('Missing mandatory English relations');
      }

      const dataEn = removeNulls({
        dbId: item.dbId,
        zomoProgram: item.zomoProgram,
        samplingYear: item.samplingYear,
        matrix: matrixId_en,
        matrixGroup: matrixGroupId_en,
        microorganism: microorganismId_en,
        sampleType: sampleTypeId_en,
        samplingStage: samplingStageId_en,
        sampleOrigin: sampleOriginId_en,
        superCategorySampleOrigin: superCategorySampleOriginId_en,
        antimicrobialSubstance: antimicrobialSubstanceId_en,
        specie: specieId_en,
        anzahlGetesteterIsolate: item.anzahlGetesteterIsolate,
        anzahlResistenterIsolate: item.anzahlResistenterIsolate,
        resistenzrate: item.resistenzrate,
        minKonfidenzintervall: item.minKonfidenzintervall,
        maxKonfidenzintervall: item.maxKonfidenzintervall,
        locale: 'en'
      });

      const existingEn = await service.findMany(collection, {
        filters: { dbId: item.dbId },
        locale: 'en'
      });

      let englishId;
      let documentId;

      if (existingEn.length) {
        const existing = existingEn[0];
        englishId = existing.id;
        documentId = existing.documentId;

        let changed = false;
        for (const k in dataEn) {
          if (k !== 'locale' && existing[k] !== dataEn[k]) {
            changed = true;
            break;
          }
        }

        if (changed) {
          await service.update(collection, englishId, { data: dataEn, locale: 'en' });
          importLog.EnglishUpdated++;
        }
      } else {
        const created = await service.create(collection, { data: dataEn, locale: 'en' });
        englishId = created.id;
        documentId = created.documentId;
        importLog.EnglishSaved++;
      }

      importLog.RowsImported++;

      /* ---------- DE localization ---------- */
      if (item.microorganism_de || item.matrix_de) {
        const matrixId_de = await getRelationId('api::matrix.matrix', item.matrix_de, 'de');
        const matrixGroupId_de = await getRelationId('api::matrix-group.matrix-group', item.matrixGroup_de, 'de');
        const microorganismId_de = await getRelationId('api::microorganism.microorganism', item.microorganism_de, 'de');
        const sampleTypeId_de = await getRelationId('api::sample-type.sample-type', item.sampleType_de, 'de');
        const samplingStageId_de = await getRelationId('api::sampling-stage.sampling-stage', item.samplingStage_de, 'de');
        const sampleOriginId_de = await getRelationId('api::sample-origin.sample-origin', item.sampleOrigin_de, 'de');
        const superCategorySampleOriginId_de = await getRelationId(
          'api::super-category-sample-origin.super-category-sample-origin',
          item.superCategorySampleOrigin_de,
          'de'
        );
        const antimicrobialSubstanceId_de = await getRelationId(
          'api::antimicrobial-substance.antimicrobial-substance',
          item.antimicrobialSubstance_de,
          'de'
        );
        const specieId_de = await getRelationId('api::specie.specie', item.specie_de, 'de');

        const dataDe = removeNulls({
          ...dataEn,
          matrix: matrixId_de,
          matrixGroup: matrixGroupId_de,
          microorganism: microorganismId_de,
          sampleType: sampleTypeId_de,
          samplingStage: samplingStageId_de,
          sampleOrigin: sampleOriginId_de,
          superCategorySampleOrigin: superCategorySampleOriginId_de,
          antimicrobialSubstance: antimicrobialSubstanceId_de,
          specie: specieId_de,
          locale: 'de'
        });

        const existingDe = await strapi.db.query(collection).findOne({
          where: { documentId, locale: 'de' },
          select: ['id']
        });

        if (existingDe) {
          await service.update(collection, existingDe.id, { data: dataDe, locale: 'de' });
          importLog.GermanUpdated++;
        } else {
          await strapi.db.query(collection).create({
            data: { ...dataDe, documentId }
          });
          importLog.GermanSaved++;
        }
      }
    } catch (err) {
      importLog.TotalFailures++;
      if (importLog.Failures.length < 500) {
        importLog.Failures.push({
          rowNumber,
          dbId: item.dbId,
          error: err.message
        });
      }
    }
  }

  /* -------------------------------
     Excel streaming
  -------------------------------- */
  const workbook = new ExcelJS.stream.xlsx.WorkbookReader(zoonotifyDataFile, {});

  for await (const worksheet of workbook) {
    //@ts-ignore
    if (worksheet.name !== amrSheetName) continue;

    importLog.SheetFound = true;
    //@ts-ignore
    importLog.SheetName = worksheet.name;

    for await (const row of worksheet) {
      if (row.number === 1) continue; // header
      importLog.TotalRowsInSheet++;

      pending.push(limit(() => processRow(row)));

      if (pending.length > 50) {
        await Promise.allSettled(pending);
        pending.length = 0;
      }
    }
  }

  await Promise.allSettled(pending);
  fs.writeFileSync(amrImportResultFile, JSON.stringify(importLog, null, 2));
}


// keep your findEntityIdByName, etc., unchanged
async function findEntityIdByName(strapi, apiEndpoint, name, locale) {
  if (!name) return null;
  const results = await strapi.entityService.findMany(apiEndpoint, {
    filters: { name },
    locale
  });
  if (results.length > 0) {
    return results[0].id;
  }
  return null;
}
