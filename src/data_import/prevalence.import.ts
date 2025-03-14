

import xlsx from 'node-xlsx'; 
import fs from 'fs';
import path from 'path';

/**
 * Main entry point: imports prevalence data from Excel
 * and then removes any duplicate German records.
 */
async function importAndCleanupPrevalences(strapi) {
  // ---------------------------------------------------------
  // 1) (Optional) Remove all existing prevalence records
  // ---------------------------------------------------------
  // If you want to completely wipe the table first, uncomment:
  // await removeAllPrevalences(strapi);
  // console.log('All existing prevalence records removed.\n');

  // ---------------------------------------------------------
  // 2) Import the prevalence data from Excel
  // ---------------------------------------------------------
  await importPrevalences(strapi);

  // ---------------------------------------------------------
  // 3) Cleanup duplicate German records
  // ---------------------------------------------------------
  await cleanupGermanDuplicates(strapi);
}

/**
 * (A) importPrevalences:
 * Reads rows from an Excel file, creates/updates English records,
 * then creates/updates linked German records if data is present.
 */
async function importPrevalences(strapi) {
  const filePath = path.join(__dirname, '../../../data/master-data/prevalence.xlsx');
  const outFilePath = path.join(__dirname, '../../../data/prevalence-import-result.json');

  const importLog = {
    TotalRecords: 0,
    EnglishSaved: 0,
    GermanSaved: 0,
    Failures: []
  };

  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }

  const buffer = fs.readFileSync(filePath);
  const dataFromExcel = xlsx.parse(buffer);
  const prevalenceData = dataFromExcel.find(sheet => sheet.name === 'prevalence');

  if (!prevalenceData) {
    console.error('Prevalences sheet not found in the file');
    return;
  }

  if (prevalenceData.data.length <= 1) {
    console.error('No data found in the Prevalences sheet');
    return;
  }

  // Convert rows (skipping header) into objects
  const dataList = prevalenceData.data.slice(1).map((row, index) => ({
    rowNumber: index + 2, // header is row 1
    dbId: String(row[0]),
    zomoProgram: row[1],
    samplingYear: parseInt(row[2]),
    microorganism_de: row[3],
    microorganism_en: row[4],
    sampleType_de: row[5],
    sampleType_en: row[6],
    superCategorySampleOrigin_de: row[7],
    superCategorySampleOrigin_en: row[8],
    sampleOrigin_de: row[9],
    sampleOrigin_en: row[10],
    samplingStage_de: row[11],
    samplingStage_en: row[12],
    matrixGroup_de: row[13],
    matrixGroup_en: row[14],
    matrix_de: row[15],
    matrix_en: row[16],
    matrixDetail_de: row[17],
    matrixDetail_en: row[18],
    furtherDetails: row[19],
    numberOfSamples: parseInt(row[20]),
    numberOfPositive: parseInt(row[21]),
    percentageOfPositive: parseFloat(row[22]),
    ciMin: row[23] !== '' && row[23] != null ? parseFloat(row[23]) : null,
    ciMax: row[24] !== '' && row[24] != null ? parseFloat(row[24]) : null,
  }));

  importLog.TotalRecords = dataList.length;

  for (const item of dataList) {
    try {
      // ----------------------------------
      // 1. Create/Update the English Record
      // ----------------------------------
      const matrixId_en = await findEntityIdByName(strapi, 'api::matrix.matrix', item.matrix_en, 'en');
      const matrixDetailId_en = await findEntityIdByName(strapi, 'api::matrix-detail.matrix-detail', item.matrixDetail_en, 'en');
      const microorganismId_en = await findEntityIdByName(strapi, 'api::microorganism.microorganism', item.microorganism_en, 'en');
      const sampleTypeId_en = await findEntityIdByName(strapi, 'api::sample-type.sample-type', item.sampleType_en, 'en');
      const samplingStageId_en = await findEntityIdByName(strapi, 'api::sampling-stage.sampling-stage', item.samplingStage_en, 'en');
      const sampleOriginId_en = await findEntityIdByName(strapi, 'api::sample-origin.sample-origin', item.sampleOrigin_en, 'en');
      const matrixGroupId_en = await findEntityIdByName(strapi, 'api::matrix-group.matrix-group', item.matrixGroup_en, 'en');
      const superCategorySampleOriginId_en = await findEntityIdByName(strapi, 'api::super-category-sample-origin.super-category-sample-origin', item.superCategorySampleOrigin_en, 'en');

      const dataEn = {
        dbId: item.dbId,
        zomoProgram: item.zomoProgram,
        samplingYear: item.samplingYear,
        furtherDetails: item.furtherDetails,
        numberOfSamples: item.numberOfSamples,
        numberOfPositive: item.numberOfPositive,
        percentageOfPositive: item.percentageOfPositive,
        ciMin: item.ciMin,
        ciMax: item.ciMax,
        matrix: matrixId_en,
        matrixDetail: matrixDetailId_en,
        microorganism: microorganismId_en,
        sampleType: sampleTypeId_en,
        samplingStage: samplingStageId_en,
        sampleOrigin: sampleOriginId_en,
        matrixGroup: matrixGroupId_en,
        superCategorySampleOrigin: superCategorySampleOriginId_en,
        locale: 'en',
      };

      // Find existing English record (dbId + locale='en')
      const existingEn = await strapi.entityService.findMany('api::prevalence.prevalence', {
        filters: { dbId: item.dbId },
        locale: 'en',
      });

      let defaultEntry; // The final English record
      if (existingEn && existingEn.length > 0) {
        defaultEntry = await strapi.entityService.update('api::prevalence.prevalence', existingEn[0].id, {
          data: dataEn,
          locale: 'en',
        });
      } else {
        defaultEntry = await strapi.entityService.create('api::prevalence.prevalence', {
          data: dataEn,
          locale: 'en',
        });
      }
      importLog.EnglishSaved++;

      // ----------------------------------
      // 2. Create/Update the German Record
      // ----------------------------------
      // Check if there's actual German data
      const hasGermanData =
        item.microorganism_de ||
        item.matrix_de ||
        item.matrixDetail_de ||
        item.sampleType_de ||
        item.samplingStage_de ||
        item.sampleOrigin_de ||
        item.matrixGroup_de ||
        item.superCategorySampleOrigin_de;

      if (hasGermanData) {
        const matrixId_de = await findEntityIdByName(strapi, 'api::matrix.matrix', item.matrix_de, 'de');
        const matrixDetailId_de = await findEntityIdByName(strapi, 'api::matrix-detail.matrix-detail', item.matrixDetail_de, 'de');
        const microorganismId_de = await findEntityIdByName(strapi, 'api::microorganism.microorganism', item.microorganism_de, 'de');
        const sampleTypeId_de = await findEntityIdByName(strapi, 'api::sample-type.sample-type', item.sampleType_de, 'de');
        const samplingStageId_de = await findEntityIdByName(strapi, 'api::sampling-stage.sampling-stage', item.samplingStage_de, 'de');
        const sampleOriginId_de = await findEntityIdByName(strapi, 'api::sample-origin.sample-origin', item.sampleOrigin_de, 'de');
        const matrixGroupId_de = await findEntityIdByName(strapi, 'api::matrix-group.matrix-group', item.matrixGroup_de, 'de');
        const superCategorySampleOriginId_de = await findEntityIdByName(strapi, 'api::super-category-sample-origin.super-category-sample-origin', item.superCategorySampleOrigin_de, 'de');

        const dataDe = {
          dbId: item.dbId,
          zomoProgram: item.zomoProgram,
          samplingYear: item.samplingYear,
          furtherDetails: item.furtherDetails,
          numberOfSamples: item.numberOfSamples,
          numberOfPositive: item.numberOfPositive,
          percentageOfPositive: item.percentageOfPositive,
          ciMin: item.ciMin,
          ciMax: item.ciMax,
          matrix: matrixId_de,
          matrixDetail: matrixDetailId_de,
          microorganism: microorganismId_de,
          sampleType: sampleTypeId_de,
          samplingStage: samplingStageId_de,
          sampleOrigin: sampleOriginId_de,
          matrixGroup: matrixGroupId_de,
          superCategorySampleOrigin: superCategorySampleOriginId_de,
          locale: 'de'
          // Note: We removed the `localizationOf` key from the payload.
        };

        // Look for existing German record (dbId + locale='de')
        const existingDe = await strapi.entityService.findMany('api::prevalence.prevalence', {
          filters: { dbId: item.dbId },
          locale: 'de',
        });

        if (existingDe && existingDe.length > 0) {
          await strapi.entityService.update('api::prevalence.prevalence', existingDe[0].id, {
            data: dataDe,
            locale: 'de',
          });
        } else {
          await strapi.entityService.create('api::prevalence.prevalence', {
            data: dataDe,
            locale: 'de',
          });
        }
        importLog.GermanSaved++;
      }
    } catch (error) {
      console.error(`Error importing prevalence data for dbId ${item.dbId}:`, error);
      importLog.Failures.push({ dbId: item.dbId, error: error.message });
    }
  }

  fs.writeFileSync(outFilePath, JSON.stringify(importLog, null, 2));
}

/**
 * (B) cleanupGermanDuplicates:
 * Finds all German prevalence entries, groups them by dbId,
 * and if there are duplicates, keeps only the lowest ID and deletes the others.
 */
async function cleanupGermanDuplicates(strapi) {
  const pageSize = 100;
  let page = 1;
  const allGermanEntries = [];

  // 1. Fetch all German records in batches
  while (true) {
    const results = await strapi.entityService.findMany('api::prevalence.prevalence', {
      filters: { locale: 'de' },
      sort: { id: 'asc' },
      publicationState: 'preview',
      pagination: { page, pageSize },
    });
    if (!results.length) break;
    allGermanEntries.push(...results);
    page++;
  }

  // 2. Group them by dbId
  const groupedByDbId = {};
  for (const entry of allGermanEntries) {
    const key = entry.dbId || 'NO_DBID';
    if (!groupedByDbId[key]) {
      groupedByDbId[key] = [];
    }
    groupedByDbId[key].push(entry);
  }

  // 3. For each dbId group, if more than one record exists, keep the first (lowest ID) and delete the rest
  let duplicatesRemoved = 0;
  for (const dbId in groupedByDbId) {
    const group = groupedByDbId[dbId];
    if (group.length > 1) {
      group.sort((a, b) => a.id - b.id);
      const toKeep = group[0];
      const toDelete = group.slice(1);
      for (const dup of toDelete) {
        await strapi.entityService.delete('api::prevalence.prevalence', dup.id);
        duplicatesRemoved++;
      }
    }
  }
  console.log(`Cleanup complete. Removed ${duplicatesRemoved} duplicate German record(s).`);
}

/**
 * (C) removeAllPrevalences (Optional):
 * Removes ALL prevalence records (English + German) from the DB.
 */
async function removeAllPrevalences(strapi) {
  const pageSize = 100;
  let page = 1;
  while (true) {
    const entries = await strapi.entityService.findMany('api::prevalence.prevalence', {
      pagination: { page, pageSize },
      publicationState: 'preview',
    });
    if (!entries.length) break;
    for (const entry of entries) {
      await strapi.entityService.delete('api::prevalence.prevalence', entry.id);
    }
    page++;
  }
}

/**
 * (D) findEntityIdByName:
 * Finds an entity by exact `name` in a given `locale`.
 * Returns null if not found.
 */
async function findEntityIdByName(strapi, apiEndpoint, name, locale) {
  if (!name) return null;
  const results = await strapi.entityService.findMany(apiEndpoint, {
    filters: { name },
    locale,
  });
  if (results.length > 0) {
    return results[0].id;
  }
  return null;
}

export {
  importAndCleanupPrevalences, // main function to run
  importPrevalences,           // run just the import if needed
  cleanupGermanDuplicates,     // run cleanup alone if needed
  removeAllPrevalences         // optional to wipe everything first
};


