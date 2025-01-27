import { Strapi } from '@strapi/strapi';

interface FileEntity {
  id: number;
  name: string;
  createdAt: string;
  mime: string; // e.g. 'image/png', 'application/vnd.ms-excel'
  folderPath?: string; // We'll update this manually
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
      // 1) Fetch the new file details (including folder info)
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

      // 2) Only proceed if it's in evaluation-en or evaluation-de
      if (folderName !== 'evaluation-en' && folderName !== 'evaluation-de') {
        console.log('[DEBUG] Not in evaluation-en/evaluation-de. Skipping...');
        return;
      }

      // 3) Determine locale from the folder name
      const locale = folderName === 'evaluation-en' ? 'en' : 'de';
      console.log(`[DEBUG] Evaluations for locale="${locale}" will be processed...`);

      // 4) Fetch all evaluations for this locale
      const evaluations = await strapi.db.query('api::evaluation.evaluation').findMany({
        where: { locale },
        populate: { diagram: true, csv_data: true },
      });
      console.log(`[DEBUG] Found ${evaluations.length} evaluations for locale="${locale}".`);

      // 5) Ensure we have or create the "Archive" folder in the Media Library
      let archiveFolder = await strapi.db.query('plugin::upload.folder').findOne({
        where: { name: 'Archive' },
      });
      if (!archiveFolder) {
        console.log('[DEBUG] Archive folder not found. Creating one...');
        archiveFolder = await strapi.db.query('plugin::upload.folder').create({
          data: { name: 'Archive', parent: null },
        });
      }

      // 6) Check each evaluation to see if we should replace an old diagram/CSV
      for (const evaluation of evaluations) {
        console.log(`[DEBUG] Checking evaluation (ID=${evaluation.id}).`);

        // A) If new file is an image & matches the old diagram name
        if (file.mime.startsWith('image/') && evaluation.diagram?.name === file.name) {
          console.log(`[DEBUG] Found matching diagram for evaluation ID=${evaluation.id}.`);

          // Move old diagram to Archive if it exists
          if (evaluation.diagram?.id) {
            console.log(`[DEBUG] Moving old diagram (ID=${evaluation.diagram.id}) -> Archive folder...`);
            // 1) Update folder & folderPath
            await (strapi.entityService.update as any)(
              'plugin::upload.file',
              evaluation.diagram.id,
              {
                data: {
                  folder: archiveFolder.id,
                  // Force folderPath to "/archiveFolderId" (or any valid path structure)
                  folderPath: `/${archiveFolder.id}`,
                },
              }
            );

            // 2) Re-fetch to confirm
            const updatedDiagram = await strapi.entityService.findOne(
              'plugin::upload.file',
              evaluation.diagram.id,
              { populate: { folder: true } }
            ) as FileEntity;
            console.log(`[DEBUG] Old diagram now in folder "${updatedDiagram.folder?.name}" (ID=${updatedDiagram.folder?.id}).`);
          }

          // Update evaluation's diagram to the newly uploaded file
          await (strapi.entityService.update as any)(
            'api::evaluation.evaluation',
            evaluation.id,
            { data: { diagram: file.id } }
          );
          console.log(`[DEBUG] Updated diagram for evaluation ID=${evaluation.id} -> new file ID=${file.id}.`);
        }

        // B) If new file is CSV/Excel & matches old csv_data name
        if (
          (file.mime === 'text/csv' ||
           file.mime === 'application/vnd.ms-excel' ||
           file.mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') &&
          evaluation.csv_data?.name === file.name
        ) {
          console.log(`[DEBUG] Found matching csv_data for evaluation ID=${evaluation.id}.`);

          // Move old CSV to Archive if it exists
          if (evaluation.csv_data?.id) {
            console.log(`[DEBUG] Moving old CSV (ID=${evaluation.csv_data.id}) -> Archive folder...`);
            // 1) Update folder & folderPath
            await (strapi.entityService.update as any)(
              'plugin::upload.file',
              evaluation.csv_data.id,
              {
                data: {
                  folder: archiveFolder.id,
                  // Force folderPath
                  folderPath: `/${archiveFolder.id}`,
                },
              }
            );

            // 2) Re-fetch to confirm
            const updatedCSV = await strapi.entityService.findOne(
              'plugin::upload.file',
              evaluation.csv_data.id,
              { populate: { folder: true } }
            ) as FileEntity;
            console.log(`[DEBUG] Old CSV now in folder "${updatedCSV.folder?.name}" (ID=${updatedCSV.folder?.id}).`);
          }

          // Update evaluation's csv_data reference to new file
          await (strapi.entityService.update as any)(
            'api::evaluation.evaluation',
            evaluation.id,
            { data: { csv_data: file.id } }
          );
          console.log(`[DEBUG] Updated csv_data for evaluation ID=${evaluation.id} -> new file ID=${file.id}.`);
        }
      }
    } catch (error) {
      console.error('[ERROR] afterCreate lifecycle failed:', error?.message || error);
    }
  },
};
