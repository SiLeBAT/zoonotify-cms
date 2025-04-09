
import type { Strapi as StrapiType } from '@strapi/types/dist/core';
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

interface PrevalenceInput {
  dbId: string;
  zomoProgram?: string;
  samplingYear?: number;
  furtherDetails?: string;
  numberOfSamples?: number;
  numberOfPositive?: number;
  percentageOfPositive?: number;
  ciMin?: number | null;
  ciMax?: number | null;
  matrix?: string | number;
  matrixDetail?: string | number;
  microorganism?: string | number;
  sampleType?: string | number;
  samplingStage?: string | number;
  sampleOrigin?: string | number;
  matrixGroup?: string | number;
  superCategorySampleOrigin?: string | number;
  locale?: string;
  publishedAt?: Date | string;
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
 */
async function findOrCreateMatrix(
  apiEndpoint: string,
  matrixName: string,
  locale: string,
  strapi: StrapiType
): Promise<string | number | null> {
  if (!matrixName) return null;

  const existingMatrices = await strapi.documents(apiEndpoint as any).findMany({
    filters: { name: matrixName },
    locale,
  });

  if (existingMatrices.length > 0) {
    return existingMatrices[0].id;
  } else {
    const newMatrix = await strapi.documents(apiEndpoint as any).create({
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
  strapi: StrapiType
): Promise<string | number | null> {
  if (!name) return null;

  const entities = await strapi.documents(apiEndpoint as any).findMany({
    filters: { name },
    locale,
  });

  return entities.length > 0 ? entities[0].id : null;
}

/**
 * Save or update a prevalence entry.
 */
async function saveOrUpdatePrevalenceEntry(data: any, strapi: StrapiType) {
  const existingEntries = await strapi.documents('api::prevalence.prevalence').findMany({
    filters: { dbId: data.dbId },
    locale: data.locale,
  });

  if (existingEntries.length > 0) {
    await strapi.documents('api::prevalence.prevalence').update({
      // Convert evaluation.id to string if needed (placeholder below).
      documentId: "__TODO__",
      data,
    });
    console.log(`[DEBUG] Updated existing prevalence entry with dbId: ${data.dbId}`);
  } else {
    await strapi.documents('api::prevalence.prevalence').create({ data });
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
    const strapi: StrapiType = (global as any).strapi;

    try {
      // Retrieve the uploaded file using the entity service (Strapi v5)
      const file: FileEntity = (await strapi.entityService.findOne('plugin::upload.file', result.id, {
        populate: { folder: true },
      })) as unknown as FileEntity;

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
          } catch (importError: any) {
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

          // Update diagram if file is an image and names match or if no diagram exists yet
          if (file.mime.startsWith('image/') && (!evaluation.diagram || evaluation.diagram.name === file.name)) {
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

              const updatedDiagram = (await strapi.entityService.findOne('plugin::upload.file', evaluation.diagram.id, {
                populate: { folder: true },
              })) as unknown as FileEntity;
              console.log(
                `[DEBUG] Old diagram now in folder "${updatedDiagram.folder?.name}" (ID=${updatedDiagram.folder?.id}).`
              );
            }

            await (strapi.entityService.update as any)(
              'api::evaluation.evaluation',
              evaluation.id,
              { data: { diagram: file.id }, locale }
            );
            console.log(`[DEBUG] Updated diagram for evaluation ID=${evaluation.id} -> new file ID=${file.id}.`);
          }

          // Update CSV data if file is CSV/Excel and names match or if no CSV exists yet
          if (
            (file.mime === 'text/csv' ||
              file.mime === 'application/vnd.ms-excel' ||
              file.mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') &&
            (!evaluation.csv_data || evaluation.csv_data.name === file.name)
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

              const updatedCSV = (await strapi.entityService.findOne('plugin::upload.file', evaluation.csv_data.id, {
                populate: { folder: true },
              })) as unknown as FileEntity;
              console.log(
                `[DEBUG] Old CSV now in folder "${updatedCSV.folder?.name}" (ID=${updatedCSV.folder?.id}).`
              );
            }

            await (strapi.entityService.update as any)(
              'api::evaluation.evaluation',
              evaluation.id,
              { data: { csv_data: file.id }, locale }
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
          } catch (cutoffError: any) {
            console.error('[ERROR] Failed to import cutoff data:', cutoffError.message || cutoffError);
          }
        } else {
          console.log('[DEBUG] File is not a valid Excel file. Skipping cutoff import...');
        }
        return;
      }
    } catch (error: any) {
      console.error('[ERROR] afterCreate lifecycle failed:', error?.message || error);
    }
  },
};

/**
 * ------------------------------
 * Prevalence import functions
 * ------------------------------
 */
async function importPrevalenceData(filePath: string, strapi: StrapiType) {
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
  // Convert rows (skipping header) into objects
  const dataList = prevalenceData.data.slice(1).map((row, index) => ({
    rowNumber: index + 2,
    dbId: String(row[0]),
    zomoProgram: row[1],
    samplingYear: row[2] ? parseInt(row[2]) : undefined,
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
    numberOfSamples: row[20] ? parseInt(row[20]) : undefined,
    numberOfPositive: row[21] ? parseInt(row[21]) : undefined,
    percentageOfPositive: row[22] ? parseFloat(row[22]) : undefined,
    ciMin: row[23] !== '' && row[23] != null ? parseFloat(row[23]) : null,
    ciMax: row[24] !== '' && row[24] != null ? parseFloat(row[24]) : null,
  }));
  console.log(`[DEBUG] ${dataList.length} records found in the Excel file.`);
  for (const item of dataList) {
    try {
      // 1. Create/Update the English Record
      const matrixId_en = await findOrCreateMatrix('api::matrix.matrix', item.matrix_en, 'en', strapi);
      const matrixDetailId_en = await findEntityIdByName('api::matrix-detail.matrix-detail', item.matrixDetail_en, 'en', strapi);
      const microorganismId_en = await findEntityIdByName('api::microorganism.microorganism', item.microorganism_en, 'en', strapi);
      const sampleTypeId_en = await findEntityIdByName('api::sample-type.sample-type', item.sampleType_en, 'en', strapi);
      const samplingStageId_en = await findEntityIdByName('api::sampling-stage.sampling-stage', item.samplingStage_en, 'en', strapi);
      const sampleOriginId_en = await findEntityIdByName('api::sample-origin.sample-origin', item.sampleOrigin_en, 'en', strapi);
      const matrixGroupId_en = await findEntityIdByName('api::matrix-group.matrix-group', item.matrixGroup_en, 'en', strapi);
      const superCategorySampleOriginId_en = await findEntityIdByName('api::super-category-sample-origin.super-category-sample-origin', item.superCategorySampleOrigin_en, 'en', strapi);
      const dataEn: PrevalenceInput = {
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
        publishedAt: new Date(),
        locale: 'en',
      };
      const existingEn = await strapi.entityService.findMany('api::prevalence.prevalence', {
        filters: { dbId: item.dbId },
        locale: 'en',
      });
      if (existingEn && existingEn.length > 0) {
        await strapi.entityService.update('api::prevalence.prevalence', existingEn[0].id, {
          data: dataEn as any,
          locale: 'en',
        });
        console.log(`[DEBUG] Updated English prevalence entry with dbId: ${item.dbId}`);
      } else {
        await strapi.entityService.create('api::prevalence.prevalence', {
          data: dataEn as any,
          locale: 'en',
        });
        console.log(`[DEBUG] Created new English prevalence entry with dbId: ${item.dbId}`);
      }
      // 2. Create/Update the German Record (if German data exists)
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
        const matrixId_de = await findOrCreateMatrix('api::matrix.matrix', item.matrix_de, 'de', strapi);
        const matrixDetailId_de = await findEntityIdByName('api::matrix-detail.matrix-detail', item.matrixDetail_de, 'de', strapi);
        const microorganismId_de = await findEntityIdByName('api::microorganism.microorganism', item.microorganism_de, 'de', strapi);
        const sampleTypeId_de = await findEntityIdByName('api::sample-type.sample-type', item.sampleType_de, 'de', strapi);
        const samplingStageId_de = await findEntityIdByName('api::sampling-stage.sampling-stage', item.samplingStage_de, 'de', strapi);
        const sampleOriginId_de = await findEntityIdByName('api::sample-origin.sample-origin', item.sampleOrigin_de, 'de', strapi);
        const matrixGroupId_de = await findEntityIdByName('api::matrix-group.matrix-group', item.matrixGroup_de, 'de', strapi);
        const superCategorySampleOriginId_de = await findEntityIdByName('api::super-category-sample-origin.super-category-sample-origin', item.superCategorySampleOrigin_de, 'de', strapi);
        const dataDe: PrevalenceInput = {
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
          publishedAt: new Date(),
          locale: 'de',
        };
        const existingDe = await strapi.entityService.findMany('api::prevalence.prevalence', {
          filters: { dbId: item.dbId },
          locale: 'de',
        });
        if (existingDe && existingDe.length > 0) {
          await strapi.entityService.update('api::prevalence.prevalence', existingDe[0].id, {
            data: dataDe as any,
            locale: 'de',
          });
          console.log(`[DEBUG] Updated German prevalence entry with dbId: ${item.dbId}`);
        } else {
          await strapi.entityService.create('api::prevalence.prevalence', {
            data: dataDe as any,
            locale: 'de',
          });
          console.log(`[DEBUG] Created new German prevalence entry with dbId: ${item.dbId}`);
        }
      }
    } catch (error: any) {
      console.error(`[ERROR] Failed to save data for entry with dbId: ${item.dbId}`, error.message);
    }
  }
}

/**
 * ------------------------------
 * Cutoff (Resistance) import functions
 * (Integrated with the "good code" provided)
 * ------------------------------
 */

/**
 * Reads the Excel sheet data and returns an array of records.
 */
function readRecord(data: any[][]) {
  console.log("Raw data from Excel sheet:", data);
  let baseRec: any = {};
  let cols: string[] = [];
  let dataList: any[] = [];

  data[0].forEach((columnName) => {
    if (columnName) {
      if (!isNaN(Number(columnName))) {
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
    if (index > 0 && recLine.length > 0) {
      let newRec = Object.create(baseRec);

      recLine.forEach((columnData, colIndex) => {
        let colName = cols[colIndex];
        if (colName) {
          const initialPart: string = colName.split('_')[0];
          if (!isNaN(Number(initialPart)) && columnData) {
            if (years.indexOf(initialPart) === -1) years.push(initialPart);
          }
          newRec[colName] = columnData;
        }
      });
      newRec["years"] = years;
      dataList.push(newRec);
    }
  });

  console.log("Parsed rows:", dataList);
  return dataList;
}

/**
 * Prepares a ResistanceRecord from the parsed record data.
 */
function prepareRecord(res: any[], bacteria: string, tableId: string): ResistanceRecord | null {
  console.log("Processing res array:", res);

  let description = "Default Description";
  let title = "Default Title";

  let newEntry: ResistanceRecord = {
    table_id: tableId,
    description: description,
    title: title,
    cut_offs: []
  };

  let problematicAntibiotics: any[] = [];

  res.forEach((x) => {
    if (!x || !x.Wirkstoff) {
      console.error("Invalid data object:", x);
      return;
    }

    let item = antibiotics.find((item: any) => item["name"] === x.Wirkstoff);
    let antibioticId = item ? item.id : null;

    if (!item) {
      console.warn(`Unmatched antibiotic name: ${x.Wirkstoff} (proceeding with empty antibiotic ID)`);
      problematicAntibiotics.push(x.Wirkstoff);
    }

    x.years.forEach((year: string) => {
      let cutOffVal = x[year + "_cut-off"];
      let min = parseFloat(x[year + "_min"]);
      let max = parseFloat(x[year + "_max"]);

      if (isNaN(min) || isNaN(max)) {
        console.error(`Invalid numeric values for year ${year}:`, { min, max });
        problematicAntibiotics.push({ Wirkstoff: x.Wirkstoff, year, min, max });
        return;
      }

      let cutOff: CutOff = {
        year: parseInt(year),
        antibiotic: antibioticId ? [antibioticId] : [],
        substanzklasse: x.Substanzklasse || "",
        bacteria: bacteria,
        min: min,
        max: max,
        cutOff: cutOffVal ? cutOffVal.toString().replace('*', '') : "",
      };

      newEntry.cut_offs.push(cutOff);
    });
  });

  if (!newEntry.cut_offs.length) {
    console.error("Invalid entry generated for table_id:", tableId, newEntry);
    return null;
  }

  if (problematicAntibiotics.length > 0) {
    console.warn("Problematic antibiotics identified:", problematicAntibiotics);
  }

  return newEntry;
}

/**
 * Saves the ResistanceRecord entries into Strapi.
 */
async function saveResistanceRecord(records: any[], strapi: StrapiType): Promise<any[]> {
  const response: any[] = [];

  for (const record of records) {
    if (!record) {
      console.error("Skipping invalid record:", record);
      response.push({ statusCode: 400, error: "Invalid record (null)", table_id: "unknown" });
      continue;
    }

    try {
      // Fetch existing English entries
      const enEntries = await strapi.documents('api::resistance-table.resistance-table').findMany({
        fields: ['id', 'table_id', 'locale', 'documentId'],
        filters: { table_id: record.table_id, locale: 'en' }
      });
      console.log(`Found ${enEntries.length} English entries for table_id ${record.table_id}:`, enEntries);

      // Fetch existing German entries
      const deEntries = await strapi.documents('api::resistance-table.resistance-table').findMany({
        fields: ['id', 'table_id', 'locale', 'documentId'],
        filters: { table_id: record.table_id, locale: 'de' }
      });
      console.log(`Found ${deEntries.length} German entries for table_id ${record.table_id}:`, deEntries);

      let enEntry;
      // Handle English entry
      if (enEntries.length === 0) {
        const enData = {
          table_id: record.table_id,
          description: record.description,
          title: record.title,
          cut_offs: record.cut_offs,
          publishedAt: new Date(),
          locale: 'en'
        };
        console.log(`Creating English entry with data for table_id ${record.table_id}:`, enData);
        enEntry = await strapi.documents('api::resistance-table.resistance-table').create({
          data: enData,
        });
        console.log(`Created English entry for table_id ${record.table_id}:`, enEntry);
        response.push({ statusCode: 201, entry: enEntry, locale: 'en', table_id: record.table_id });
      } else {
        enEntry = enEntries[0];
        console.log(`Using existing English entry for table_id ${record.table_id}:`, enEntry);
      }

      // Handle German entry
      if (deEntries.length === 0) {
        const deData = {
          table_id: record.table_id,
          description: record.description,
          title: record.title,
          cut_offs: record.cut_offs,
          localizations: [enEntry.documentId],
          publishedAt: new Date(),
          locale: 'de'
        };
        console.log(`Creating German entry with data for table_id ${record.table_id}:`, deData);
        const deEntry = await strapi.documents('api::resistance-table.resistance-table').create({
          data: deData,
          locale: 'de'
        });
        console.log(`Created German entry for table_id ${record.table_id}:`, deEntry);
        response.push({ statusCode: 201, entry: deEntry, locale: 'de', table_id: record.table_id });
      } else {
        console.log(`German entry already exists for table_id ${record.table_id}, skipping creation:`, deEntries[0]);
      }
    } catch (error: any) {
      console.error("Error saving record for table_id:", record.table_id, error);
      response.push({ statusCode: 500, error: error.message || "Unknown error", table_id: record.table_id });
    }
  }

  return response;
}

/**
 * Imports the cutoff data from the uploaded file.
 */
async function importCutOffDataFromFile(filePath: string, strapi: StrapiType) {
  if (!fs.existsSync(filePath)) {
    throw new Error('Cutoff file not found at path: ' + filePath);
  }

  const buffer = fs.readFileSync(filePath);
  const dataFromExcel = xlsx.parse(buffer);
  console.log("Excel sheets parsed:", dataFromExcel.map(sheet => sheet.name));
  let dataList: any[] = [];

  // Fetch antibiotics from the database
  antibiotics = await strapi.documents('api::antibiotic.antibiotic').findMany({
    fields: ['id', 'name']
  });
  console.log("Fetched antibiotics:", antibiotics);

  dataFromExcel.forEach(sheet => {
    console.log("Processing sheet:", sheet.name);
    let res = readRecord(sheet.data);

    if (sheet.name === "EC" || sheet.name === "1") {
      const record = prepareRecord(res, "Escherichia coli", "1");
      if (record) dataList.push(record);
    }
    if (sheet.name === "SA" || sheet.name === "2") {
      const record = prepareRecord(res, "Salmonella spp", "2");
      if (record) dataList.push(record);
    }
    if (sheet.name === "CAj" || sheet.name === "3a") {
      const record = prepareRecord(res, "Campylobacter jejuni", "3a");
      if (record) dataList.push(record);
    }
    if (sheet.name === "CAc" || sheet.name === "3b") {
      const record = prepareRecord(res, "Campylobacter coli", "3b");
      if (record) dataList.push(record);
    }
    if (sheet.name === "MRSA" || sheet.name === "4") {
      const record = prepareRecord(res, "methicillin-resistant Staphylococcus aureus", "4");
      if (record) dataList.push(record);
    }
    if (sheet.name === "calis" || sheet.name === "5a") {
      const record = prepareRecord(res, "Enterococcus faecalis", "5a");
      if (record) dataList.push(record);
    }
    if (sheet.name === "cium" || sheet.name === "5b") {
      const record = prepareRecord(res, "Enterococcus faecium", "5b");
      if (record) dataList.push(record);
    }
  });

  await saveResistanceRecord(dataList, strapi)
    .then(results => {
      let dataLog: any = {
        "Total Records": dataList.length,
        "Time Taken": "N/A",
        "Successfully Saved": 0,
        Failures: []
      };

      if (results) {
        let failures = results.filter((result: any) => result.statusCode === 500);
        let success = results.filter((result: any) => result.statusCode === 201);

        dataLog["Successfully Saved"] = success.length;
        dataLog.Failures = failures;
      }

      console.log("Cutoff import result:", dataLog);
    })
    .catch(e => {
      console.error("Error saving cutoff records:", e);
    });
}
