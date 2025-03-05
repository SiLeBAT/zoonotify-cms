
import xlsx from 'node-xlsx';
import fs from 'fs';
import path from 'path';

/**
 * Import sampling stages from an Excel file.
 * - Creates/updates English records (locale='en') as the base.
 * - Creates/updates German records (locale='de') linked to English via 'localizations'.
 */
async function importSamplingStages(strapi) {
  const filePath = path.join(__dirname, '../../../data/master-data/samplingstage.xlsx');
  const logFilePath = path.join(__dirname, '../../../data/samplingstage-import-log.json');

  const importLog = {
    totalProcessed: 0,
    englishCreated: 0,
    englishUpdated: 0,
    germanCreated: 0,
    germanUpdated: 0,
    errors: []
  };

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }

  // Parse the Excel file
  const buffer = fs.readFileSync(filePath);
  const dataFromExcel = xlsx.parse(buffer);
  const sheet = dataFromExcel.find((s) => s.name.toLowerCase() === 'samplingstage');

  if (!sheet) {
    console.error('Sheet "samplingstage" not found in the file');
    return;
  }
  if (sheet.data.length <= 1) {
    console.error('No data found in the "samplingstage" sheet');
    return;
  }

  // Map rows (skipping header) into objects: col 0 = German, col 1 = English
  const dataList = sheet.data.slice(1).map((row, index) => ({
    rowNumber: index + 2,
    name_de: row[0] ? String(row[0]).trim() : null,
    name_en: row[1] ? String(row[1]).trim() : null
  })).filter(row => row.name_en); // Require English name as base

  importLog.totalProcessed = dataList.length;
  console.log(`Found ${dataList.length} sampling stages to process`);

  for (const item of dataList) {
    console.log(`\nRow ${item.rowNumber}: English="${item.name_en}", German="${item.name_de}"`);
    try {
      // 1. Create/Update the English record (base record)
      let englishRecords = await strapi.entityService.findMany('api::sampling-stage.sampling-stage', {
        filters: { name: item.name_en },
        locale: 'en'
      });

      let englishId;
      if (englishRecords.length > 0) {
        englishId = englishRecords[0].id;
        console.log(`Updating English record: ID=${englishId} => ${item.name_en}`);
        await strapi.entityService.update('api::sampling-stage.sampling-stage', englishId, {
          data: {
            name: item.name_en,
            publishedAt: new Date()
          },
          locale: 'en'
        });
        importLog.englishUpdated++;
      } else {
        console.log(`Creating English record: ${item.name_en}`);
        const newEnglish = await strapi.entityService.create('api::sampling-stage.sampling-stage', {
          data: {
            name: item.name_en,
            publishedAt: new Date()
          },
          locale: 'en'
        });
        englishId = newEnglish.id;
        importLog.englishCreated++;
      }

      // 2. Create/Update the German record (if German name exists)
      if (item.name_de) {
        let germanRecords = await strapi.entityService.findMany('api::sampling-stage.sampling-stage', {
          filters: { name: item.name_de },
          locale: 'de'
        });

        if (germanRecords.length > 0) {
          const germanId = germanRecords[0].id;
          console.log(`Updating German record: ID=${germanId} => ${item.name_de}`);
          await strapi.entityService.update('api::sampling-stage.sampling-stage', germanId, {
            data: {
              name: item.name_de,
              localizations: [englishId],
              publishedAt: new Date()
            },
            locale: 'de'
          });
          importLog.germanUpdated++;
        } else {
          console.log(`Creating German record: ${item.name_de} (linked to English ID: ${englishId})`);
          await strapi.entityService.create('api::sampling-stage.sampling-stage', {
            data: {
              name: item.name_de,
              localizations: [englishId],
              publishedAt: new Date()
            },
            locale: 'de'
          });
          importLog.germanCreated++;
        }

        // Ensure English record links to German
        const englishWithLocalizations = await strapi.entityService.findOne(
          'api::sampling-stage.sampling-stage',
          englishId,
          { populate: ['localizations'] }
        );

        const currentLocalizations = englishWithLocalizations && englishWithLocalizations.localizations
          ? englishWithLocalizations.localizations.map(loc => loc.id)
          : [];

        const germanRecordCheck = await strapi.entityService.findMany('api::sampling-stage.sampling-stage', {
          filters: { name: item.name_de },
          locale: 'de'
        });

        if (germanRecordCheck.length > 0 && !currentLocalizations.includes(germanRecordCheck[0].id)) {
          await strapi.entityService.update('api::sampling-stage.sampling-stage', englishId, {
            data: {
              localizations: [...currentLocalizations, germanRecordCheck[0].id],
              name: item.name_en,
              publishedAt: new Date()
            },
            locale: 'en'
          });
        }
      }
    } catch (error) {
      console.error(`Error importing row ${item.rowNumber}:`, error.message);
      importLog.errors.push({
        row: item.rowNumber,
        english: item.name_en,
        german: item.name_de,
        error: error.message
      });
    }
  }

  fs.writeFileSync(logFilePath, JSON.stringify(importLog, null, 2));
  console.log(`\nImport completed:
    Total Processed: ${importLog.totalProcessed}
    English Created: ${importLog.englishCreated}
    English Updated: ${importLog.englishUpdated}
    German Created: ${importLog.germanCreated}
    German Updated: ${importLog.germanUpdated}
    Errors: ${importLog.errors.length}`);
}

export { importSamplingStages };