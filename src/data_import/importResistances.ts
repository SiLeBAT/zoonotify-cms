import xlsx from 'node-xlsx';
import fs from 'fs';
import path from 'path';

// Utility for batching arrays
function chunkArray(array, chunkSize) {
  const results = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    results.push(array.slice(i, i + chunkSize));
  }
  return results;
}

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
  const filePath = path.join(__dirname, '../../../data/master-data/ZooNotify_amr_DB_DE_EN_2025-02-27.xlsx');
  const outFilePath = path.join(__dirname, '../../../data/resistances-import-result.json');

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
    Failures: []
  };

  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    importLog.FileFound = false;
    fs.writeFileSync(outFilePath, JSON.stringify(importLog, null, 2));
    return;
  }
  importLog.FileFound = true;

  const buffer = fs.readFileSync(filePath);
  const dataFromExcel = xlsx.parse(buffer);

  const resistanceData = dataFromExcel.find(sheet => sheet.name === 'Sheet 1');
  if (!resistanceData) {
    console.error('Resistances sheet not found in the file');
    importLog.SheetFound = false;
    fs.writeFileSync(outFilePath, JSON.stringify(importLog, null, 2));
    return;
  }
  importLog.SheetFound = true;
  importLog.SheetName = resistanceData.name;
  importLog.TotalRowsInSheet = resistanceData.data.length - 1;

  if (resistanceData.data.length <= 1) {
    console.error('No data found in the Resistances sheet');
    fs.writeFileSync(outFilePath, JSON.stringify(importLog, null, 2));
    return;
  }

  const dataList = resistanceData.data.slice(1).map((row, index) => {
    const rowNumber = index + 2; // Header is row 1
    return {
      rowNumber,
      dbId: String(row[28]),
      zomoProgram: row[0],
      samplingYear: parseNumeric(row[1], parseInt),
      microorganism_de: row[3],
      microorganism_en: row[4],
      specie_en: row[6] || null,
      specie_de: row[5] || null,
      sampleType_de: row[7],
      sampleType_en: row[8],
      superCategorySampleOrigin_de: row[9],
      superCategorySampleOrigin_en: row[10],
      sampleOrigin_de: row[11],
      sampleOrigin_en: row[12],
      samplingStage_de: row[13],
      samplingStage_en: row[14],
      matrixGroup_de: row[15],
      matrixGroup_en: row[16],
      matrix_de: row[17],
      matrix_en: row[18],
      antimicrobialSubstance_en: row[21] || null,
      antimicrobialSubstance_de: row[22] || null,
      anzahlGetesteterIsolate: parseNumeric(row[23], parseInt),
      anzahlResistenterIsolate: parseNumeric(row[24], parseInt),
      resistenzrate: parseNumeric(row[25], parseFloat),
      minKonfidenzintervall: parseNumeric(row[26], parseFloat),
      maxKonfidenzintervall: parseNumeric(row[27], parseFloat),
    };
  });

  importLog.TotalRecordsProcessed = dataList.length;

  const service = strapi.entityService;
  const collection = 'api::resistance.resistance';

  // Batching logic
  const BATCH_SIZE = 100;
  const batches = chunkArray(dataList, BATCH_SIZE);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`Processing batch ${batchIndex + 1} of ${batches.length}...`);
    for (const item of batch) {
      try {
        let hasMissingRelations = false;
        const missingRelations = [];

        if (!item.dbId || item.dbId === 'undefined' || item.dbId === 'null') {
          missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: dbId is blank`);
          hasMissingRelations = true;
        }
        if (!item.matrix_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: English matrix is blank`);
        if (!item.matrixGroup_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: English matrixGroup is blank`);
        if (!item.microorganism_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: English microorganism is blank`);
        if (!item.sampleType_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: English sampleType is blank`);
        if (!item.samplingStage_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: English samplingStage is blank`);
        if (!item.sampleOrigin_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: English sampleOrigin is blank`);
        if (!item.superCategorySampleOrigin_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: English superCategorySampleOrigin is blank`);
        if (!item.antimicrobialSubstance_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: English antimicrobialSubstance is blank`);

        // English relations lookup
        const matrixId_en = await findEntityIdByName(strapi, 'api::matrix.matrix', item.matrix_en, 'en');
        const matrixGroupId_en = await findEntityIdByName(strapi, 'api::matrix-group.matrix-group', item.matrixGroup_en, 'en');
        const microorganismId_en = await findEntityIdByName(strapi, 'api::microorganism.microorganism', item.microorganism_en, 'en');
        const sampleTypeId_en = await findEntityIdByName(strapi, 'api::sample-type.sample-type', item.sampleType_en, 'en');
        const samplingStageId_en = await findEntityIdByName(strapi, 'api::sampling-stage.sampling-stage', item.samplingStage_en, 'en');
        const sampleOriginId_en = await findEntityIdByName(strapi, 'api::sample-origin.sample-origin', item.sampleOrigin_en, 'en');
        const superCategorySampleOriginId_en = await findEntityIdByName(strapi, 'api::super-category-sample-origin.super-category-sample-origin', item.superCategorySampleOrigin_en, 'en');
        const antimicrobialSubstanceId_en = await findEntityIdByName(strapi, 'api::antimicrobial-substance.antimicrobial-substance', item.antimicrobialSubstance_en, 'en');
        const specieId_en = await findEntityIdByName(strapi, 'api::specie.specie', item.specie_en, 'en');

        if (item.matrix_en && !matrixId_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing English matrix '${item.matrix_en}'`);
        if (item.matrixGroup_en && !matrixGroupId_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing English matrixGroup '${item.matrixGroup_en}'`);
        if (item.microorganism_en && !microorganismId_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing English microorganism '${item.microorganism_en}'`);
        if (item.sampleType_en && !sampleTypeId_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing English sampleType '${item.sampleType_en}'`);
        if (item.samplingStage_en && !samplingStageId_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing English samplingStage '${item.samplingStage_en}'`);
        if (item.sampleOrigin_en && !sampleOriginId_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing English sampleOrigin '${item.sampleOrigin_en}'`);
        if (item.superCategorySampleOrigin_en && !superCategorySampleOriginId_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing English superCategorySampleOrigin '${item.superCategorySampleOrigin_en}'`);
        if (item.antimicrobialSubstance_en && !antimicrobialSubstanceId_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing English antimicrobialSubstance '${item.antimicrobialSubstance_en}'`);

        if (missingRelations.length > 0) {
          hasMissingRelations = true;
          importLog.Failures.push({
            rowNumber: item.rowNumber,
            dbId: item.dbId,
            error: `Missing relations: ${missingRelations.join(', ')}`
          });
        }

        if (hasMissingRelations) {
          continue;
        }

        // English record creation/update
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
          locale: 'en',
          populate: ['localizations']
        });

        let defaultEntry;
        let englishId, englishDocumentId;
        if (existingEn && existingEn.length > 0) {
          englishId = existingEn[0].id;
          englishDocumentId = existingEn[0].documentId;
          const hasChanges = Object.keys(dataEn).some(key =>
            key !== 'locale' && JSON.stringify(existingEn[0][key]) !== JSON.stringify(dataEn[key])
          );
          if (hasChanges) {
            defaultEntry = await service.update(collection, englishId, {
              data: dataEn,
              locale: 'en'
            });
            importLog.EnglishUpdated++;
          } else {
            defaultEntry = existingEn[0];
          }
        } else {
          defaultEntry = await service.create(collection, {
            data: dataEn,
            locale: 'en'
          });
          importLog.EnglishSaved++;
        }
        englishId = defaultEntry.id;
        englishDocumentId = defaultEntry.documentId;
        importLog.RowsImported++;

        // === German record ===
        const hasGermanData =
          item.microorganism_de ||
          item.sampleType_de ||
          item.samplingStage_de ||
          item.sampleOrigin_de ||
          item.superCategorySampleOrigin_de ||
          item.matrixGroup_de ||
          item.matrix_de ||
          item.antimicrobialSubstance_de ||
          item.specie_de;

        if (hasGermanData) {
          const germanMissingRelations = [];
          if (!item.matrix_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: German matrix is blank`);
          if (!item.matrixGroup_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: German matrixGroup is blank`);
          if (!item.microorganism_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: German microorganism is blank`);
          if (!item.sampleType_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: German sampleType is blank`);
          if (!item.samplingStage_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: German samplingStage is blank`);
          if (!item.sampleOrigin_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: German sampleOrigin is blank`);
          if (!item.superCategorySampleOrigin_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: German superCategorySampleOrigin is blank`);
          if (!item.antimicrobialSubstance_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: German antimicrobialSubstance is blank`);

          const matrixId_de = await findEntityIdByName(strapi, 'api::matrix.matrix', item.matrix_de, 'de');
          const matrixGroupId_de = await findEntityIdByName(strapi, 'api::matrix-group.matrix-group', item.matrixGroup_de, 'de');
          const microorganismId_de = await findEntityIdByName(strapi, 'api::microorganism.microorganism', item.microorganism_de, 'de');
          const sampleTypeId_de = await findEntityIdByName(strapi, 'api::sample-type.sample-type', item.sampleType_de, 'de');
          const samplingStageId_de = await findEntityIdByName(strapi, 'api::sampling-stage.sampling-stage', item.samplingStage_de, 'de');
          const sampleOriginId_de = await findEntityIdByName(strapi, 'api::sample-origin.sample-origin', item.sampleOrigin_de, 'de');
          const superCategorySampleOriginId_de = await findEntityIdByName(strapi, 'api::super-category-sample-origin.super-category-sample-origin', item.superCategorySampleOrigin_de, 'de');
          const antimicrobialSubstanceId_de = await findEntityIdByName(strapi, 'api::antimicrobial-substance.antimicrobial-substance', item.antimicrobialSubstance_de, 'de');
          const specieId_de = await findEntityIdByName(strapi, 'api::specie.specie', item.specie_de, 'de');

          if (item.matrix_de && !matrixId_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing German matrix '${item.matrix_de}'`);
          if (item.matrixGroup_de && !matrixGroupId_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing German matrixGroup '${item.matrixGroup_de}'`);
          if (item.microorganism_de && !microorganismId_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing German microorganism '${item.microorganism_de}'`);
          if (item.sampleType_de && !sampleTypeId_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing German sampleType '${item.sampleType_de}'`);
          if (item.samplingStage_de && !samplingStageId_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing German samplingStage '${item.samplingStage_de}'`);
          if (item.sampleOrigin_de && !sampleOriginId_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing German sampleOrigin '${item.sampleOrigin_de}'`);
          if (item.superCategorySampleOrigin_de && !superCategorySampleOriginId_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing German superCategorySampleOrigin '${item.superCategorySampleOrigin_de}'`);
          if (item.antimicrobialSubstance_de && !antimicrobialSubstanceId_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing German antimicrobialSubstance '${item.antimicrobialSubstance_de}'`);

          if (germanMissingRelations.length > 0) {
            importLog.Failures.push({
              rowNumber: item.rowNumber,
              dbId: item.dbId,
              error: `Missing German relations: ${germanMissingRelations.join(', ')}`
            });
            continue;
          }

          const dataDe = removeNulls({
            dbId: item.dbId,
            zomoProgram: item.zomoProgram,
            samplingYear: item.samplingYear,
            matrix: matrixId_de,
            matrixGroup: matrixGroupId_de,
            microorganism: microorganismId_de,
            sampleType: sampleTypeId_de,
            samplingStage: samplingStageId_de,
            sampleOrigin: sampleOriginId_de,
            superCategorySampleOrigin: superCategorySampleOriginId_de,
            antimicrobialSubstance: antimicrobialSubstanceId_de,
            specie: specieId_de,
            anzahlGetesteterIsolate: item.anzahlGetesteterIsolate,
            anzahlResistenterIsolate: item.anzahlResistenterIsolate,
            resistenzrate: item.resistenzrate,
            minKonfidenzintervall: item.minKonfidenzintervall,
            maxKonfidenzintervall: item.maxKonfidenzintervall,
            locale: 'de'
          });

          // Check if a German localization already exists for this English record
          const englishWithLocalizations = await service.findOne(collection, englishId, {
            populate: ['localizations'],
            locale: 'en'
          });

          const germanLocalization = englishWithLocalizations.localizations?.find(loc => loc.locale === 'de');

          if (germanLocalization) {
            const hasChanges = Object.keys(dataDe).some(key =>
              key !== 'locale' && JSON.stringify(germanLocalization[key]) !== JSON.stringify(dataDe[key])
            );
            if (hasChanges) {
              await service.update(collection, germanLocalization.id, {
                data: dataDe,
                locale: 'de'
              });
              importLog.GermanUpdated++;
            }
          } else {
            const germanRecord = await strapi.db.query('api::resistance.resistance').create({
              data: {
                ...dataDe,
                documentId: englishDocumentId
              }
            });
            importLog.GermanSaved++;
          }
        }
      } catch (error) {
        console.error(`Error importing resistance data for dbId ${item.dbId}:`, error);
        importLog.Failures.push({ rowNumber: item.rowNumber, dbId: item.dbId, error: error.message });
      }
    }
    // Optional: let Node/Strapi "breathe" between batches
    // await new Promise(res => setTimeout(res, 100));
  }
  fs.writeFileSync(outFilePath, JSON.stringify(importLog, null, 2));
}

// keep your findEntityIdByName, etc., unchanged
export async function findEntityIdByName(strapi, apiEndpoint, name, locale) {
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
