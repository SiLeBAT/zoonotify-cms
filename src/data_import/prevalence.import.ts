
import xlsx from 'node-xlsx';
import fs from 'fs';
import path from 'path';

/**
 * Main import function for prevalence data.
 * Creates/updates an English (default) record and,
 * if there's German data, creates/updates a German record linked to it.
 */
async function importPrevalences(strapi: any) {
  const filePath = path.join(__dirname, '../../../data/master-data/prevalence.xlsx');
  const outFilePath = path.join(__dirname, '../../../data/prevalence-import-result.json');

  const importLog = {
    TotalRecords: 0,
    EnglishSaved: 0,
    GermanSaved: 0,
    Failures: [] as Array<{ dbId: string; error: string }>
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
  console.log(`Total rows to process: ${dataList.length}`);

  for (const item of dataList) {
    console.log(`\nProcessing row ${item.rowNumber}, dbId: ${item.dbId}`);
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
      };

      // Find existing English record (dbId + locale='en')
      const existingEn = await strapi.entityService.findMany('api::prevalence.prevalence', {
        filters: { dbId: item.dbId },
        locale: 'en',
      });

      let defaultEntry; // The final English record
      if (existingEn && existingEn.length > 0) {
        console.log(`Updating existing English record ID: ${existingEn[0].id} for dbId: ${item.dbId}`);
        defaultEntry = await strapi.entityService.update('api::prevalence.prevalence', existingEn[0].id, {
          data: dataEn,
          locale: 'en', // specify the locale
        });
      } else {
        console.log(`Creating new English record for dbId: ${item.dbId}`);
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
        item.matrix_de ||
        item.matrixDetail_de ||
        item.microorganism_de ||
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
          // Link the German record to the English record
          localizationOf: defaultEntry.id,
        };

        // Find existing German record (dbId + locale='de')
        const existingDe = await strapi.entityService.findMany('api::prevalence.prevalence', {
          filters: { dbId: item.dbId },
          locale: 'de',
        });

        if (existingDe && existingDe.length > 0) {
          console.log(`Updating existing German record ID: ${existingDe[0].id} for dbId: ${item.dbId}`);
          await strapi.entityService.update('api::prevalence.prevalence', existingDe[0].id, {
            data: dataDe,
            locale: 'de',
          });
        } else {
          console.log(`Creating new German record for dbId: ${item.dbId}`);
          await strapi.entityService.create('api::prevalence.prevalence', {
            data: dataDe,
            locale: 'de',
          });
        }

        importLog.GermanSaved++;
      }
    } catch (error: any) {
      console.error(`Error importing prevalence data for dbId ${item.dbId}:`, error);
      importLog.Failures.push({ dbId: item.dbId, error: error.message });
    }
  }

  fs.writeFileSync(outFilePath, JSON.stringify(importLog, null, 2));
  console.log('Import completed. Log written to', outFilePath);
}

/**
 * Helper function to find an entity ID by exact name + locale
 * in your master data (e.g. matrix, microorganism).
 */
async function findEntityIdByName(
  strapi: any,
  apiEndpoint: string,
  name: string | undefined,
  locale: string
) {
  if (!name) return null;
  // We do a findMany with filters: { name }, then pick the one with matching locale
  const results = await strapi.entityService.findMany(apiEndpoint, {
    filters: { name },
    locale, // Strapi v5 can filter by locale here
  });
  if (results.length > 0) {
    // Return the first match
    return results[0].id;
  }
  console.log(`No entity found for "${name}" (${locale}) in ${apiEndpoint}`);
  return null;
}

export { importPrevalences };
