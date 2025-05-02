
import xlsx from 'node-xlsx';
import fs from 'fs';
import path from 'path';

// Define a type for the resistance entity object
interface ResistanceEntity {
  dbId: string;
  zomoProgram: string | null;
  samplingYear: number | null;
  
  matrix: number | null;
  matrixGroup: number | null;
  microorganism: number | null;
  sampleType: number | null;
  samplingStage: number | null;
  sampleOrigin: number | null;
  superCategorySampleOrigin: number | null;
  locale: string;
  antimicrobialSubstance: number | null;
  specie: number | null;
  anzahlGetesteterIsolate: number | null;
  anzahlResistenterIsolate: number | null;
  resistenzrate: number | null;
  minKonfidenzintervall: number | null;
  maxKonfidenzintervall: number | null;
 
}

/**
 * 1) parseNumeric:
 *    - If the cell is blank, "-" or "_" => return null.
 *    - Otherwise, replace all commas with dots (e.g. "2,6" => "2.6").
 *    - Parse using parseFloat or parseInt.
 *    - If parsing fails (NaN), return null instead of NaN.
 */
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

/**
 * 2) removeNulls:
 *    - Removes any keys whose value is null,
 *      so Strapi doesn't receive fields with null.
 */
function removeNulls(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== null)
  );
}

/**
 * Main function: importAndCleanupResistances
 *    - Imports antibiotic resistance data from Excel,
 *    - Then removes any duplicate German records.
 */
export async function importAndCleanupResistances(strapi) {
  await importResistances(strapi);
  await cleanupGermanDuplicates(strapi);
}

/**
 * (A) importResistances:
 *    - Reads rows from an Excel file,
 *    - Creates English records,
 *    - Creates German records as localized versions using the same documentId if data is present,
 *    - Rows with missing relational data are logged as failures and skipped.
 */
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
    const rowNumber = index +0; // Header is row 1
    return {
      rowNumber,
      dbId: String(row[28]), // This will be checked for blank below
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

  for (const item of dataList) {
    try {
      let hasMissingRelations = false;
      const missingRelations = [];

      // Check for blank dbId
      if (!item.dbId || item.dbId === 'undefined' || item.dbId === 'null') {
        missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: dbId is blank`);
        hasMissingRelations = true;
      }

      // Check for blank English relational fields
      if (!item.matrix_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: English matrix is blank`);
      if (!item.matrixGroup_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: English matrixGroup is blank`);
      if (!item.microorganism_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: English microorganism is blank`);
      if (!item.sampleType_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: English sampleType is blank`);
      if (!item.samplingStage_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: English samplingStage is blank`);
      if (!item.sampleOrigin_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: English sampleOrigin is blank`);
      if (!item.superCategorySampleOrigin_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: English superCategorySampleOrigin is blank`);
      if (!item.antimicrobialSubstance_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: English antimicrobialSubstance is blank`);
      if (!item.specie_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: English specie is blank`);

      // English relations lookup
            const matrixId_en = await findEntityIdByName(strapi, 'api::matrix.matrix', item.matrix_en, 'en');
            const matrixGroupId_en = await findEntityIdByName(strapi, 'api::matrix-group.matrix-group', item.matrixGroup_en, 'en');
            const microorganismId_en = await findEntityIdByName(strapi, 'api::microorganism.microorganism', item.microorganism_en, 'en');
            const sampleTypeId_en = await findEntityIdByName(strapi, 'api::sample-type.sample-type', item.sampleType_en, 'en');
            const samplingStageId_en = await findEntityIdByName(strapi, 'api::sampling-stage.sampling-stage', item.samplingStage_en, 'en');
            const sampleOriginId_en = await findEntityIdByName(strapi, 'api::sample-origin.sample-origin', item.sampleOrigin_en, 'en');
            const superCategorySampleOriginId_en = await findEntityIdByName(
              strapi,
              'api::super-category-sample-origin.super-category-sample-origin',
              item.superCategorySampleOrigin_en,
              'en'
            );
            const antimicrobialSubstanceId_en = await findEntityIdByName(
              strapi,
              'api::antimicrobial-substance.antimicrobial-substance',
              item.antimicrobialSubstance_en,
              'en'
            );
            const specieId_en = await findEntityIdByName(strapi, 'api::specie.specie', item.specie_en, 'en');
      
            // Check for missing English relations
      if (item.matrix_en && !matrixId_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing English matrix '${item.matrix_en}'`);
      if (item.matrixGroup_en && !matrixGroupId_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing English matrixGroup '${item.matrixGroup_en}'`);
      if (item.microorganism_en && !microorganismId_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing English microorganism '${item.microorganism_en}'`);
      if (item.sampleType_en && !sampleTypeId_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing English sampleType '${item.sampleType_en}'`);
      if (item.samplingStage_en && !samplingStageId_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing English samplingStage '${item.samplingStage_en}'`);
      if (item.sampleOrigin_en && !sampleOriginId_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing English sampleOrigin '${item.sampleOrigin_en}'`);
      if (item.superCategorySampleOrigin_en && !superCategorySampleOriginId_en) {
        missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing English superCategorySampleOrigin '${item.superCategorySampleOrigin_en}'`);
      }
      if (item.antimicrobialSubstance_en && !antimicrobialSubstanceId_en) {
        missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing English antimicrobialSubstance '${item.antimicrobialSubstance_en}'`);
      }
      if (item.specie_en && !specieId_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing English specie '${item.specie_en}'`);


      // If any English relations are missing, mark as failure
      if (missingRelations.length > 0) {
        hasMissingRelations = true;
        importLog.Failures.push({
          rowNumber: item.rowNumber,
          dbId: item.dbId,
          error: `Missing relations: ${missingRelations.join(', ')}`
        });
      }

      // Skip import if there are missing relations
      if (hasMissingRelations) {
        continue;
      }

      // Proceed with English record creation/update
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

      let defaultEntry; // The final English record
      let englishId, englishDocumentId;
      if (existingEn && existingEn.length > 0) {
        englishId = existingEn[0].id;
        englishDocumentId = existingEn[0].documentId; // Get the documentId
        // Check if any field has changed (excluding locale)
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

      // German record
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

        // Check for blank German relational fields
                if (!item.matrix_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: German matrix is blank`);
                if (!item.matrixGroup_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: German matrixGroup is blank`);
                if (!item.microorganism_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: German microorganism is blank`);
                if (!item.sampleType_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: German sampleType is blank`);
                if (!item.samplingStage_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: German samplingStage is blank`);
                if (!item.sampleOrigin_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: German sampleOrigin is blank`);
                if (!item.superCategorySampleOrigin_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: German superCategorySampleOrigin is blank`);
                if (!item.antimicrobialSubstance_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: German antimicrobialSubstance is blank`);
                if (!item.specie_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: German specie is blank`);
        
                // German relations lookup
                const matrixId_de = await findEntityIdByName(strapi, 'api::matrix.matrix', item.matrix_de, 'de');
                const matrixGroupId_de = await findEntityIdByName(strapi, 'api::matrix-group.matrix-group', item.matrixGroup_de, 'de');
                const microorganismId_de = await findEntityIdByName(strapi, 'api::microorganism.microorganism', item.microorganism_de, 'de');
                const sampleTypeId_de = await findEntityIdByName(strapi, 'api::sample-type.sample-type', item.sampleType_de, 'de');
                const samplingStageId_de = await findEntityIdByName(strapi, 'api::sampling-stage.sampling-stage', item.samplingStage_de, 'de');
                const sampleOriginId_de = await findEntityIdByName(strapi, 'api::sample-origin.sample-origin', item.sampleOrigin_de, 'de');
                const superCategorySampleOriginId_de = await findEntityIdByName(
                  strapi,
                  'api::super-category-sample-origin.super-category-sample-origin',
                  item.superCategorySampleOrigin_de,
                  'de'
                );
                const antimicrobialSubstanceId_de = await findEntityIdByName(
                  strapi,
                  'api::antimicrobial-substance.antimicrobial-substance',
                  item.antimicrobialSubstance_de,
                  'de'
                );
                const specieId_de = await findEntityIdByName(strapi, 'api::specie.specie', item.specie_de, 'de');
        
               
        // Check for missing German relations (not found in database)
        if (item.matrix_de && !matrixId_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing German matrix '${item.matrix_de}'`);
        if (item.matrixGroup_de && !matrixGroupId_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing German matrixGroup '${item.matrixGroup_de}'`);
        if (item.microorganism_de && !microorganismId_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing German microorganism '${item.microorganism_de}'`);
        if (item.sampleType_de && !sampleTypeId_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing German sampleType '${item.sampleType_de}'`);
        if (item.samplingStage_de && !samplingStageId_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing German samplingStage '${item.samplingStage_de}'`);
        if (item.sampleOrigin_de && !sampleOriginId_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing German sampleOrigin '${item.sampleOrigin_de}'`);
        if (item.superCategorySampleOrigin_de && !superCategorySampleOriginId_de) {
          germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing German superCategorySampleOrigin '${item.superCategorySampleOrigin_de}'`);
        }
        if (item.antimicrobialSubstance_de && !antimicrobialSubstanceId_de) {
          germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing German antimicrobialSubstance '${item.antimicrobialSubstance_de}'`);
        }
        if (item.specie_de && !specieId_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing German specie '${item.specie_de}'`);

        // If any German relations are missing, mark as failure
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
          // Update the existing German localization if any data has changed
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
          // Use Strapi's db.query to create the German record with the same documentId
          const germanRecord = await strapi.db.query('api::resistance.resistance').create({
            data: {
              ...dataDe,
              documentId: englishDocumentId // Use the same documentId to link them
            }
          });

          // Log the creation for debugging
          console.log(`Created German record for English documentId ${englishDocumentId}:`, {
            id: germanRecord.id,
            documentId: germanRecord.documentId,
            locale: germanRecord.locale
          });

          // Fetch the English record to confirm linking
          const updatedEnglish = await service.findOne(collection, englishId, {
            populate: ['localizations'],
            locale: 'en'
          });
          console.log(`Linked records for English ID ${englishId} (documentId: ${englishDocumentId}):`, updatedEnglish.localizations);

          // Additional debugging: Fetch the German record to confirm its documentId
          const fetchedGerman = await service.findOne(collection, germanRecord.id, {
            populate: ['localizations'],
            locale: 'de'
          });
          console.log(`German record details for ID ${germanRecord.id}:`, {
            documentId: fetchedGerman.documentId,
            localizations: fetchedGerman.localizations
          });

          importLog.GermanSaved++;
        }
      }
    } catch (error) {
      console.error(`Error importing resistance data for dbId ${item.dbId}:`, error);
      importLog.Failures.push({ rowNumber: item.rowNumber, dbId: item.dbId, error: error.message });
    }
  }

  fs.writeFileSync(outFilePath, JSON.stringify(importLog, null, 2));
}

/**
 * (B) cleanupGermanDuplicates:
 *     - Finds all German records,
 *     - Groups them by dbId,
 *     - Keeps the first (lowest ID), deletes duplicates.
 */
export async function cleanupGermanDuplicates(strapi) {
  const pageSize = 100;
  let page = 1;
  const allGermanEntries = [];

  while (true) {
    const results = await strapi.entityService.findMany('api::resistance.resistance', {
      filters: { locale: 'de' },
      sort: { id: 'asc' },
      publicationState: 'preview',
      pagination: { page, pageSize }
    });
    if (!results.length) break;
    allGermanEntries.push(...results);
    page++;
  }

  const groupedByDbId = {};
  for (const entry of allGermanEntries) {
    const key = entry.dbId || 'NO_DBID';
    if (!groupedByDbId[key]) {
      groupedByDbId[key] = [];
    }
    groupedByDbId[key].push(entry);
  }

  let duplicatesRemoved = 0;
  for (const dbId in groupedByDbId) {
    const group = groupedByDbId[dbId];
    if (group.length > 1) {
      group.sort((a, b) => a.id - b.id);
      const toDelete = group.slice(1);
      for (const dup of toDelete) {
        await strapi.entityService.delete('api::resistance.resistance', dup.id);
        duplicatesRemoved++;
      }
    }
  }
  console.log(`Cleanup complete. Removed ${duplicatesRemoved} duplicate German record(s).`);
}

/**
 * (C) removeAllResistances (Optional):
 *     - Removes ALL records (English + German) from the DB.
 */
export async function removeAllResistances(strapi) {
  const pageSize = 100;
  let page = 1;
  while (true) {
    const entries = await strapi.entityService.findMany('api::resistance.resistance', {
      pagination: { page, pageSize },
      publicationState: 'preview'
    });
    if (!entries.length) break;
    for (const entry of entries) {
      await strapi.entityService.delete('api::resistance.resistance', entry.id);
    }
    page++;
  }
}

/**
 * (D) findEntityIdByName:
 *     - Finds an entity by exact `name` in a given `locale`.
 *       (Used for e.g. "matrix", "sample-type" etc. that have a "name" field.)
 *     - Returns the entity's ID if found, otherwise null.
 */
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