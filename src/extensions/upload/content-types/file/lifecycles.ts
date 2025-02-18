
import { Strapi } from '@strapi/strapi';
import xlsx from 'node-xlsx';
import fs from 'fs';
import path from 'path';

interface FileEntity {
  id: number;
  name: string;
  url: string;
  createdAt: string;
  mime: string;
  folderPath?: string;
  folder?: {
    id: number;
    name: string;
    pathId?: string;
  };
}

interface Evaluation {
  id: number;
  locale: string;
  diagram?: FileEntity;
  csv_data?: FileEntity;
}

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

      // Handle Prevalence folder
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

      // Handle evaluation-en and evaluation-de folders
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
    } catch (error) {
      console.error('[ERROR] afterCreate lifecycle failed:', error?.message || error);
    }
  },
};

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
      const matrixId_en = await findEntityIdByName('api::matrix.matrix', item.matrix_en, 'en', strapi);
      const matrixId_de = await findEntityIdByName('api::matrix.matrix', item.matrix_de, 'de', strapi);

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

async function findEntityIdByName(apiEndpoint: string, name: string, locale: string, strapi: Strapi) {
  if (!name) return null;

  const entities = await strapi.entityService.findMany(apiEndpoint as any, {
    filters: { name },
    locale,
  });

  return entities.length > 0 ? entities[0].id : null;
}

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