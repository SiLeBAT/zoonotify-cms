

import xlsx from 'node-xlsx';
import fs from 'fs';
import path from 'path';

/**
 * Import microorganisms from an Excel file.
 * - Creates/updates English records (locale='en') as the base.
 * - Creates/updates German records (locale='de') linked to English via 'localizations'.
 */
async function importMicroorganisms(strapi) {
  const filePath = path.join(__dirname, '../../../data/master-data/microorganism.xlsx');
  const logFilePath = path.join(__dirname, '../../../data/microorganism-import-log.json');

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
  const parsedExcel = xlsx.parse(buffer);
  const sheet = parsedExcel.find((s) => s.name.toLowerCase() === 'microorganism');

  if (!sheet) {
    console.error('Sheet "microorganism" not found in the file');
    return;
  }
  if (sheet.data.length <= 1) {
    console.error('No data found in the "microorganism" sheet');
    return;
  }

  // Map rows (skipping header) into objects: col 0 = German, col 1 = English
  const dataList = sheet.data.slice(1).map((row, index) => ({
    rowNumber: index + 2,
    name_de: row[0] ? String(row[0]).trim() : null,
    name_en: row[1] ? String(row[1]).trim() : null
  })).filter(row => row.name_en); // Require English name as base

  importLog.totalProcessed = dataList.length;
  console.log(`Found ${dataList.length} microorganisms to process`);

  for (const item of dataList) {
    console.log(`\nRow ${item.rowNumber}: English="${item.name_en}", German="${item.name_de}"`);
    try {
      // 1. Create/Update the English record (base record)
      let englishRecord = await strapi.entityService.findMany('api::microorganism.microorganism', {
        filters: { name: item.name_en },
        locale: 'en',
      });

      let englishId;
      if (englishRecord.length > 0) {
        console.log(`Updating English record: ID=${englishRecord[0].id} => ${item.name_en}`);
        englishRecord = await strapi.entityService.update(
          'api::microorganism.microorganism',
          englishRecord[0].id,
          {
            data: {
              name: item.name_en,
              publishedAt: new Date()
            },
            locale: 'en'
          }
        );
        englishId = englishRecord.id;
        importLog.englishUpdated++;
      } else {
        console.log(`Creating English record: ${item.name_en}`);
        englishRecord = await strapi.entityService.create(
          'api::microorganism.microorganism',
          {
            data: {
              name: item.name_en,
              publishedAt: new Date()
            },
            locale: 'en'
          }
        );
        englishId = englishRecord.id;
        importLog.englishCreated++;
      }

      // 2. Create/Update the German record (if German name exists)
      if (item.name_de) {
        let germanRecord = await strapi.entityService.findMany('api::microorganism.microorganism', {
          filters: { name: item.name_de },
          locale: 'de',
        });

        if (germanRecord.length > 0) {
          console.log(`Updating German record: ID=${germanRecord[0].id} => ${item.name_de}`);
          await strapi.entityService.update(
            'api::microorganism.microorganism',
            germanRecord[0].id,
            {
              data: {
                name: item.name_de,
                localizations: [englishId],
                publishedAt: new Date()
              },
              locale: 'de'
            }
          );
          importLog.germanUpdated++;
        } else {
          console.log(`Creating German record: ${item.name_de} (linked to English ID: ${englishId})`);
          await strapi.entityService.create(
            'api::microorganism.microorganism',
            {
              data: {
                name: item.name_de,
                localizations: [englishId],
                publishedAt: new Date()
              },
              locale: 'de'
            }
          );
          importLog.germanCreated++;
        }

        // Ensure English record links to German
        const updatedEnglish = await strapi.entityService.findOne(
          'api::microorganism.microorganism',
          englishId,
          { populate: ['localizations'] }
        );
        const currentLocalizations = updatedEnglish.localizations
          ? updatedEnglish.localizations.map(loc => loc.id)
          : [];

        const germanRecordCheck = await strapi.entityService.findMany('api::microorganism.microorganism', {
          filters: { name: item.name_de },
          locale: 'de'
        });

        if (germanRecordCheck.length > 0 && !currentLocalizations.includes(germanRecordCheck[0].id)) {
          await strapi.entityService.update(
            'api::microorganism.microorganism',
            englishId,
            {
              data: {
                localizations: [...currentLocalizations, germanRecordCheck[0].id],
                name: item.name_en,
                publishedAt: new Date()
              },
              locale: 'en'
            }
          );
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

export { importMicroorganisms };