import fs from 'fs';
import path from 'path';
import { Strapi } from '@strapi/strapi';

interface FileEntity {
  id: number;
  name: string;
  createdAt: string;
  mime: string; // File type (e.g., 'image/png', 'application/vnd.ms-excel')
  folder?: {
    id: number;
    name: string;
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
      // Fetch the file details to ensure folder is populated
      const file: FileEntity = await strapi.entityService.findOne('plugin::upload.file', result.id, {
        populate: { folder: true },
      }) as FileEntity;

      if (!file || !file.folder || !file.folder.name) {
        console.log('[DEBUG] File or folder information is missing.');
        return;
      }

      const folderName = file.folder.name;
      console.log(`[DEBUG] File uploaded in folder "${folderName}" with name "${file.name}".`);

      // Only proceed for the target folders
      if (folderName !== 'evaluation-en' && folderName !== 'evaluation-de') {
        console.log('[DEBUG] File not in a target folder. Skipping...');
        return;
      }

      // Determine locale from the folder name
      const locale = folderName === 'evaluation-en' ? 'en' : 'de';
      console.log(`[DEBUG] Processing locale "${locale}".`);

      // Debug: Query the evaluations using REST-like syntax
      const evaluations = await strapi.db.query('api::evaluation.evaluation').findMany({
        where: { locale },
        populate: { diagram: true, csv_data: true },
      });

      console.log(`[DEBUG] Evaluations fetched for locale "${locale}":`, evaluations);

      if (evaluations.length === 0) {
        console.log(`[DEBUG] No evaluations found for locale "${locale}". Please check your database or query.`);
        return;
      }

      for (const evaluation of evaluations) {
        console.log(`[DEBUG] Checking evaluation ID=${evaluation.id}.`);

        // Update diagram if the names match
        if (file.mime.startsWith('image/') && evaluation.diagram?.name === file.name) {
          console.log(`[DEBUG] Found matching diagram for evaluation ID=${evaluation.id}. Updating diagram...`);
          await strapi.entityService.update('api::evaluation.evaluation', evaluation.id, {
            data: { diagram: file.id } as any,
          });
          console.log(`[DEBUG] Updated diagram for evaluation ID=${evaluation.id} with file ID=${file.id}.`);
        }

        // Update csv_data if the names match and the file is a CSV/Excel file
        if (
          (file.mime === 'text/csv' || file.mime === 'application/vnd.ms-excel' || file.mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') &&
          evaluation.csv_data?.name === file.name
        ) {
          console.log(`[DEBUG] Found matching csv_data for evaluation ID=${evaluation.id}. Updating csv_data...`);
          await strapi.entityService.update('api::evaluation.evaluation', evaluation.id, {
            data: { csv_data: file.id } as any,
          });
          console.log(`[DEBUG] Updated csv_data for evaluation ID=${evaluation.id} with file ID=${file.id}.`);
        }
      }
    } catch (error) {
      console.error('[ERROR] Failed in afterCreate lifecycle:', error.message);
    }
  },
};