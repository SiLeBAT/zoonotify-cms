
import { Strapi } from '@strapi/strapi';
import xlsx from 'node-xlsx';
import fs from 'fs';
import path from 'path';

/**
 * Interfaces for file and evaluation records (Prevalence/Evaluation)
 */
interface FileEntity {
  id: number | string;
  name: string;
  url: string;
  createdAt: string;
  mime: string;
  folderPath?: string;
  folder?: {
    id: number | string;
    name: string;
    pathId?: string;
  };
}

interface Evaluation {
  id: number | string;
  locale: string;
  diagram?: FileEntity;
  csv_data?: FileEntity;
}

/**
 * Interfaces for Resistance / Cutoff data
 */
export interface ResistanceRecord {
  table_id: string;
  description: string;
  title: string;
  cut_offs: CutOff[];
}

export interface CutOff {
  year: number;
  antibiotic: Array<number | string>;
  substanzklasse: string;
  bacteria: string;
  min: number;
  max: number;
  cutOff: string;
}

/**
 * Global variable used for cutoff processing.
 */
let antibiotics: any; // This will be populated from the database later

/**
 * Helper function to find or create a matrix entry by name.
 *
 * @param apiEndpoint - The API endpoint for matrices (e.g. 'api::matrix.matrix')
 * @param matrixName - The name of the matrix (from the Excel row)
 * @param locale - The locale (e.g. 'en' or 'de')
 * @param strapi - The Strapi instance
 * @returns The ID (string or number) of the found or newly created matrix entry.
 */
async function findOrCreateMatrix(
  apiEndpoint: string,
  matrixName: string,
  locale: string,
  strapi: Strapi
): Promise<string | number | null> {
  if (!matrixName) return null;

  // Cast apiEndpoint as any to match expected ContentType
  const existingMatrices = await strapi.entityService.findMany(apiEndpoint as any, {
    filters: { name: matrixName },
    locale,
  });

  if (existingMatrices.length > 0) {
    return existingMatrices[0].id;
  } else {
    const newMatrix = await strapi.entityService.create(apiEndpoint as any, {
      data: { name: matrixName },
    });
    console.log(
      `[DEBUG] Created new matrix with name "${matrixName}" (ID=${newMatrix.id}) for locale "${locale}"`
    );
    return newMatrix.id;
  }
}

/**
 * Helper function to find an entity by name.
 */
async function findEntityIdByName(
  apiEndpoint: string,
  name: string,
  locale: string,
  strapi: Strapi
): Promise<string | number | null> {
  if (!name) return null;

  const entities = await strapi.entityService.findMany(apiEndpoint as any, {
    filters: { name },
    locale,
  });

  return entities.length > 0 ? entities[0].id : null;
}

/**
 * Save or update a prevalence entry.
 */
async function saveOrUpdatePrevalenceEntry(data: any, strapi: Strapi) {
  const existingEntries = await strapi.entityService.findMany('api::prevalence.prevalence', {
    filters: { dbId: data.dbId },
    locale: data.locale,
  });

  if (existingEntries.length > 0) {
    await strapi.entityService.update('api::prevalence.prevalence', existingEntries[0].id, { data });
    console.log(`[DEBUG] Updated existing prevalence entry with dbId: ${data.dbId}`);
  } else {
    await strapi.entityService.create('api::prevalence.prevalence', { data });
    console.log(`[DEBUG] Created new prevalence entry with dbId: ${data.dbId}`);
  }
}

/**
 * Lifecycle hook for the Upload plugin.
 */
export default {
  async afterCreate(event) {
    console.log('[DEBUG] afterCreate lifecycle triggered.');

    const { result } = event;
    const strapi: Strapi = (global as any).strapi;

    try {
      const file: FileEntity = await strapi.entityService.findOne(
        'plugin::upload.file',
        result.id,
        { populate: { folder: true } }
      ) as FileEntity;

      if (!file || !file.folder || !file.folder.name) {
        console.log('[DEBUG] File or folder information is missing. Aborting...');
        return;
      }

      const folderName = file.folder.name;
      console.log(`[DEBUG] File uploaded in folder "${folderName}" with name "${file.name}".`);

      // --------------------------
      // Handle Prevalence folder
      // --------------------------
      if (folderName === 'Prevalence') {
        console.log('[DEBUG] File is in the Prevalence folder. Starting import process...');

        if (
          file.mime === 'application/vnd.ms-excel' ||
          file.mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ) {
          const filePath = path.join(strapi.dirs.app.root, 'public', file.url);
          console.log(`[DEBUG] Importing data from file path: ${filePath}`);

          try {
            await importPrevalenceData(filePath, strapi);
            console.log('[DEBUG] Prevalence import completed successfully.');
          } catch (importError) {
            console.error('[ERROR] Failed to import Prevalence data:', importError.message || importError);
          }
        } else {
          console.log('[DEBUG] File is not a valid Excel file. Skipping import...');
        }
        return;
      }

      // --------------------------------------
      // Handle evaluation-en and evaluation-de
      // --------------------------------------
      if (folderName === 'evaluation-en' || folderName === 'evaluation-de') {
        const locale = folderName === 'evaluation-en' ? 'en' : 'de';
        console.log(`[DEBUG] Evaluations for locale="${locale}" will be processed...`);

        const evaluations = await strapi.db.query('api::evaluation.evaluation').findMany({
          where: { locale },
          populate: { diagram: true, csv_data: true },
        });
        console.log(`[DEBUG] Found ${evaluations.length} evaluations for locale="${locale}".`);

        let archiveFolder = await strapi.db.query('plugin::upload.folder').findOne({
          where: { name: 'Archive' },
        });
        if (!archiveFolder) {
          console.log('[DEBUG] Archive folder not found. Creating one...');
          archiveFolder = await strapi.db.query('plugin::upload.folder').create({
            data: { name: 'Archive', parent: null },
          });
        }

        for (const evaluation of evaluations) {
          console.log(`[DEBUG] Checking evaluation (ID=${evaluation.id}).`);

          if (file.mime.startsWith('image/') && evaluation.diagram?.name === file.name) {
            console.log(`[DEBUG] Found matching diagram for evaluation ID=${evaluation.id}.`);

            if (evaluation.diagram?.id) {
              console.log(`[DEBUG] Moving old diagram (ID=${evaluation.diagram.id}) -> Archive folder...`);
              await (strapi.entityService.update as any)(
                'plugin::upload.file',
                evaluation.diagram.id,
                {
                  data: {
                    folder: archiveFolder.id,
                    folderPath: `/${archiveFolder.id}`,
                  },
                }
              );

              const updatedDiagram = await strapi.entityService.findOne(
                'plugin::upload.file',
                evaluation.diagram.id,
                { populate: { folder: true } }
              ) as FileEntity;
              console.log(`[DEBUG] Old diagram now in folder "${updatedDiagram.folder?.name}" (ID=${updatedDiagram.folder?.id}).`);
            }

            await (strapi.entityService.update as any)(
              'api::evaluation.evaluation',
              evaluation.id,
              { data: { diagram: file.id } }
            );
            console.log(`[DEBUG] Updated diagram for evaluation ID=${evaluation.id} -> new file ID=${file.id}.`);
          }

          if (
            (file.mime === 'text/csv' ||
              file.mime === 'application/vnd.ms-excel' ||
              file.mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') &&
            evaluation.csv_data?.name === file.name
          ) {
            console.log(`[DEBUG] Found matching csv_data for evaluation ID=${evaluation.id}.`);

            if (evaluation.csv_data?.id) {
              console.log(`[DEBUG] Moving old CSV (ID=${evaluation.csv_data.id}) -> Archive folder...`);
              await (strapi.entityService.update as any)(
                'plugin::upload.file',
                evaluation.csv_data.id,
                {
                  data: {
                    folder: archiveFolder.id,
                    folderPath: `/${archiveFolder.id}`,
                  },
                }
              );

              const updatedCSV = await strapi.entityService.findOne(
                'plugin::upload.file',
                evaluation.csv_data.id,
                { populate: { folder: true } }
              ) as FileEntity;
              console.log(`[DEBUG] Old CSV now in folder "${updatedCSV.folder?.name}" (ID=${updatedCSV.folder?.id}).`);
            }

            await (strapi.entityService.update as any)(
              'api::evaluation.evaluation',
              evaluation.id,
              { data: { csv_data: file.id } }
            );
            console.log(`[DEBUG] Updated csv_data for evaluation ID=${evaluation.id} -> new file ID=${file.id}.`);
          }
        }
      }

      // ----------------------------------
      // Handle Cutt_Off folder (Cutoff)
      // ----------------------------------
      if (folderName === 'Cutt_Off') {
        console.log('[DEBUG] File is in the Cutt_Off folder. Starting cutoff import process...');

        if (
          file.mime === 'application/vnd.ms-excel' ||
          file.mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ) {
          const filePath = path.join(strapi.dirs.app.root, 'public', file.url);
          console.log(`[DEBUG] Importing cutoff data from file path: ${filePath}`);

          try {
            await importCutOffDataFromFile(filePath, strapi);
            console.log('[DEBUG] Cutoff import completed successfully.');
          } catch (cutoffError) {
            console.error('[ERROR] Failed to import cutoff data:', cutoffError.message || cutoffError);
          }
        } else {
          console.log('[DEBUG] File is not a valid Excel file. Skipping cutoff import...');
        }
        return;
      }
    } catch (error) {
      console.error('[ERROR] afterCreate lifecycle failed:', error?.message || error);
    }
  },
};

/**
 * ------------------------------
 * Prevalence import functions
 * ------------------------------
 */
async function importPrevalenceData(filePath: string, strapi: Strapi) {
  if (!fs.existsSync(filePath)) {
    throw new Error('File not found at path: ' + filePath);
  }

  const buffer = fs.readFileSync(filePath);
  const dataFromExcel = xlsx.parse(buffer);
  const prevalenceData = dataFromExcel.find(sheet => sheet.name === 'prevalence');

  if (!prevalenceData) {
    throw new Error('Prevalence sheet not found in the file.');
  }

  if (prevalenceData.data.length <= 1) {
    throw new Error('No data found in the Prevalence sheet.');
  }

  const dataList = prevalenceData.data.slice(1).map(row => ({
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
    furtherDetails: row[19],
    numberOfSamples: parseInt(row[20]),
    numberOfPositive: parseInt(row[21]),
    percentageOfPositive: parseFloat(row[22]),
    ciMin: row[23] !== '' && row[23] != null ? parseFloat(row[23]) : null,
    ciMax: row[24] !== '' && row[24] != null ? parseFloat(row[24]) : null,
  }));

  console.log(`[DEBUG] ${dataList.length} records found in the Excel file.`);

  for (const item of dataList) {
    try {
      // Use findOrCreateMatrix for matrices so that a new matrix is created if it doesn't exist
      const matrixId_en = await findOrCreateMatrix('api::matrix.matrix', item.matrix_en, 'en', strapi);
      const matrixId_de = await findOrCreateMatrix('api::matrix.matrix', item.matrix_de, 'de', strapi);

      const microorganismId_en = await findEntityIdByName('api::microorganism.microorganism', item.microorganism_en, 'en', strapi);
      const microorganismId_de = await findEntityIdByName('api::microorganism.microorganism', item.microorganism_de, 'de', strapi);

      const sampleOriginId_en = await findEntityIdByName('api::sample-origin.sample-origin', item.sampleOrigin_en, 'en', strapi);
      const sampleOriginId_de = await findEntityIdByName('api::sample-origin.sample-origin', item.sampleOrigin_de, 'de', strapi);

      const matrixGroupId_en = await findEntityIdByName('api::matrix-group.matrix-group', item.matrixGroup_en, 'en', strapi);
      const matrixGroupId_de = await findEntityIdByName('api::matrix-group.matrix-group', item.matrixGroup_de, 'de', strapi);

      const samplingStageId_en = await findEntityIdByName('api::sampling-stage.sampling-stage', item.samplingStage_en, 'en', strapi);
      const samplingStageId_de = await findEntityIdByName('api::sampling-stage.sampling-stage', item.samplingStage_de, 'de', strapi);

      const superCategorySampleOriginId_en = await findEntityIdByName(
        'api::super-category-sample-origin.super-category-sample-origin',
        item.superCategorySampleOrigin_en,
        'en',
        strapi
      );
      const superCategorySampleOriginId_de = await findEntityIdByName(
        'api::super-category-sample-origin.super-category-sample-origin',
        item.superCategorySampleOrigin_de,
        'de',
        strapi
      );

      const dataToSave_en = {
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
        microorganism: microorganismId_en,
        sampleOrigin: sampleOriginId_en,
        matrixGroup: matrixGroupId_en,
        samplingStage: samplingStageId_en,
        superCategorySampleOrigin: superCategorySampleOriginId_en,
        locale: 'en',
      };

      const dataToSave_de = {
        ...dataToSave_en,
        matrix: matrixId_de,
        microorganism: microorganismId_de,
        sampleOrigin: sampleOriginId_de,
        matrixGroup: matrixGroupId_de,
        samplingStage: samplingStageId_de,
        superCategorySampleOrigin: superCategorySampleOriginId_de,
        locale: 'de',
      };

      await saveOrUpdatePrevalenceEntry(dataToSave_en, strapi);
      await saveOrUpdatePrevalenceEntry(dataToSave_de, strapi);
    } catch (error) {
      console.error('[ERROR] Failed to save data for entry with dbId:', item.dbId, error.message);
    }
  }
}

/**
 * ------------------------------
 * Cutoff (Resistance) import functions
 * ------------------------------
 */
function readRecord(data: any[][]) {
  console.log("Raw data from Excel sheet:", data);
  let baseRec: any = {};
  let cols: string[] = [];
  let dataList: any[] = [];

  data[0].forEach(columnName => {
    if (columnName) {
      if (!isNaN(columnName)) {
        baseRec[columnName + "_cut-off"] = "";
        baseRec[columnName + "_min"] = "";
        baseRec[columnName + "_max"] = "";
        cols.push(columnName + "_cut-off");
        cols.push(columnName + "_min");
        cols.push(columnName + "_max");
      } else {
        baseRec[columnName] = "";
        cols.push(columnName);
      }
    }
  });

  console.log("Parsed column headers:", cols);

  data.forEach((recLine, index) => {
    let years: string[] = [];
    if (index > 1 && recLine.length > 0) {
      let newRec = Object.create(baseRec);

      recLine.forEach((columnData, colIndex) => {
        let colName = cols[colIndex];
        const initialPart = colName.split('_')[0];
        if (!isNaN(Number(initialPart)) && columnData) {
          if (years.indexOf(initialPart) === -1) years.push(initialPart);
        }
        newRec[colName] = columnData;
      });
      newRec["years"] = years;
      dataList.push(newRec);
    }
  });

  console.log("Parsed rows:", dataList);
  return dataList;
}

function prepareRecord(res: any[], bacteria: string, tableId: string): ResistanceRecord | null {
  console.log("Processing res array:", res);

  let descriptionObj = res.pop();
  let titleObj = res.pop();

  if (!descriptionObj || !descriptionObj.Substanzklasse) {
    console.error(`Description object missing for table_id ${tableId}:`, descriptionObj);
    return null;
  }

  if (!titleObj || !titleObj.Substanzklasse) {
    console.error(`Title object missing for table_id ${tableId}:`, titleObj);
    return null;
  }

  let newEntry: ResistanceRecord = {
    table_id: tableId,
    description: descriptionObj.Substanzklasse,
    title: titleObj.Substanzklasse,
    cut_offs: []
  };

  let problematicAntibiotics: any[] = []; // Track problematic antibiotics

  res.forEach((x) => {
    if (!x || !x.Wirkstoff) {
      console.error("Invalid data object:", x);
      return;
    }

    let item = antibiotics.find((item: any) => item["name"] === x.Wirkstoff);
    let antibioticId = item ? item.id : null;

    if (!item) {
      console.error(`Unmatched antibiotic name: ${x.Wirkstoff}`);
      problematicAntibiotics.push(x.Wirkstoff);
    }

    x.years.forEach((year: string) => {
      let cutOffVal = x[year + "_cut-off"];
      let min = x[year + "_min"];
      let max = x[year + "_max"];

      if (isNaN(Number(min)) || isNaN(Number(max))) {
        console.error(`Invalid numeric values for year ${year}:`, { min, max });
        problematicAntibiotics.push({ Wirkstoff: x.Wirkstoff, year, min, max });
        return;
      }

      let cutOff: CutOff = {
        year: Number(year),
        antibiotic: [antibioticId],
        substanzklasse: x.Substanzklasse,
        bacteria: bacteria,
        min: Number(min),
        max: Number(max),
        cutOff: cutOffVal ? cutOffVal.toString().replace('*', '') : "",
      };

      if (!antibioticId) {
        console.error(`Invalid antibiotic ID for Wirkstoff: ${x.Wirkstoff}, year: ${year}`);
        problematicAntibiotics.push({ Wirkstoff: x.Wirkstoff, year, cutOff });
        return;
      }

      newEntry.cut_offs.push(cutOff);
    });
  });

  if (!newEntry.cut_offs.length) {
    console.error("Invalid entry generated for table_id:", tableId, newEntry);
    return null;
  }

  if (problematicAntibiotics.length > 0) {
    console.error("Problematic antibiotics identified:", problematicAntibiotics);
  }

  return newEntry;
}

async function saveResistanceRecord(records: any[], strapi: Strapi): Promise<any[]> {
  const response: any[] = [];

  for (const record of records) {
    if (!record) {
      console.error("Skipping invalid record:", record);
      continue;
    }

    try {
      const enEntries = await strapi.entityService.findMany('api::resistance-table.resistance-table', {
        fields: ['id', 'table_id', 'locale'],
        filters: { table_id: record.table_id, locale: 'en' }
      });

      console.log(`Existing entries for table_id ${record.table_id} in 'en':`, enEntries);

      let deEntries = await strapi.entityService.findMany('api::resistance-table.resistance-table', {
        fields: ['id', 'table_id', 'locale'],
        filters: { table_id: record.table_id, locale: 'de' }
      });

      if (enEntries.length > 0) {
        const enEntry = await strapi.entityService.update('api::resistance-table.resistance-table', enEntries[0].id, {
          data: { ...record, locale: 'en' },
        });
        response.push({ statusCode: 201, enEntry });

        if (deEntries.length === 0) {
          const deEntry = await strapi.entityService.create('api::resistance-table.resistance-table', {
            data: { ...record, locale: 'de', localizations: [enEntry.id] },
          });
          response.push({ statusCode: 201, deEntry });
        }
      } else {
        const enContent = await strapi.entityService.create('api::resistance-table.resistance-table', {
          data: { ...record, locale: 'en' },
        });
        response.push({ statusCode: 201, enContent });

        const deContent = await strapi.entityService.create('api::resistance-table.resistance-table', {
          data: { ...record, locale: 'de', localizations: [enContent.id] },
        });
        response.push({ statusCode: 201, deContent });
      }
    } catch (error) {
      console.error("Error saving record:", record, error);
      response.push({ statusCode: 500, error });
    }
  }

  return response;
}

/**
 * New function to import cutoff data from the uploaded file.
 */
async function importCutOffDataFromFile(filePath: string, strapi: Strapi) {
  if (!fs.existsSync(filePath)) {
    throw new Error('Cutoff file not found at path: ' + filePath);
  }

  const buffer = fs.readFileSync(filePath);
  const dataFromExcel = xlsx.parse(buffer);
  console.log("Excel sheets parsed:", dataFromExcel.map(sheet => sheet.name));
  let dataList: any[] = [];

  // Fetch antibiotics from the database
  antibiotics = await strapi.entityService.findMany('api::antibiotic.antibiotic', {
    fields: ['id', 'name']
  });

  dataFromExcel.forEach(sheet => {
    console.log("Processing sheet:", sheet.name);
    let res = readRecord(sheet.data);

    // Accept either the legacy or numeric sheet names
    if (sheet.name === "EC" || sheet.name === "1") {
      dataList.push(prepareRecord(res, "Escherichia coli", "1"));
    }
    if (sheet.name === "SA" || sheet.name === "2") {
      dataList.push(prepareRecord(res, "Salmonella spp", "2"));
    }
    if (sheet.name === "CAj" || sheet.name === "3a") {
      dataList.push(prepareRecord(res, "Campylobacter jejuni", "3a"));
    }
    if (sheet.name === "CAc" || sheet.name === "3b") {
      dataList.push(prepareRecord(res, "Campylobacter coli", "3b"));
    }
    if (sheet.name === "MRSA" || sheet.name === "4") {
      dataList.push(prepareRecord(res, "methicillin-resistant Staphylococcus aureus", "4"));
    }
    if (sheet.name === "calis" || sheet.name === "5a") {
      dataList.push(prepareRecord(res, "Enterococcus faecalis", "5a"));
    }
    if (sheet.name === "cium" || sheet.name === "5b") {
      dataList.push(prepareRecord(res, "Enterococcus faecium", "5b"));
    }
  });

  await saveResistanceRecord(dataList, strapi)
    .then(results => {
      let dataLog: any = {
        "Total Records": dataList.length,
        "Time Taken": "0", // You can compute and update this value if desired
        "Successfully Saved": 0,
        Failures: []
      };

      if (results) {
        let failures = results.filter((result: any) => result.statusCode === 500);
        let success = results.filter((result: any) => result.statusCode === 201);

        dataLog["Successfully Saved"] = success.length;
        dataLog.Failures = failures;
        dataLog["Time Taken"] = "N/A"; // Calculate time if needed
      }

      console.log("Cutoff import result:", dataLog);
    })
    .catch(e => {
      console.error("Error saving cutoff records:", e);
    });
}
