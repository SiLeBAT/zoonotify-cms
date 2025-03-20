
import xlsx from 'node-xlsx';
import fs from 'fs';
import path from 'path';

/**
 * Import sample types from an Excel file.
 * - Creates/updates English records (locale='en') as the base.
 * - Creates/updates German records (locale='de') linked to English via 'localizations'.
 * - Ensures no duplication across locales on re-run.
 */
async function importSampleTypes(strapi) {
  const filePath = path.join(__dirname, '../../../data/master-data/sampletype.xlsx');
  const logFilePath = path.join(__dirname, '../../../data/sampletype-import-log.json');

  const importLog = {
    totalProcessed: 0,
    englishCreated: 0,
    englishUpdated: 0,
    germanCreated: 0,
    germanUpdated: 0,
    errors: []
  };

  // Optional: Clear existing records before import (uncomment for testing)
  /*
  console.log('Clearing existing sample-type records...');
  const allRecords = await strapi.entityService.findMany('api::sample-type.sample-type', {
    locale: ['en', 'de']
  });
  for (const record of allRecords) {
    await strapi.entityService.delete('api::sample-type.sample-type', record.id);
  }
  console.log('Existing records cleared.');
  */

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }

  // Parse the Excel file
  const buffer = fs.readFileSync(filePath);
  const dataFromExcel = xlsx.parse(buffer);
  const sheet = dataFromExcel.find((s) => s.name.toLowerCase() === 'sampletype');

  if (!sheet) {
    console.error('Sheet "sampletype" not found in the file');
    return;
  }
  if (sheet.data.length <= 1) {
    console.error('No data found in the "sampletype" sheet');
    return;
  }

  // Map rows (skipping header) into objects: col 0 = German, col 1 = English
  const dataList = sheet.data.slice(1).map((row, index) => {
    const name_de = row[0] ? String(row[0]).trim() : null;
    const name_en = row[1] ? String(row[1]).trim() : null;
    return {
      rowNumber: index + 2,
      name_de,
      name_en
    };
  }).filter(row => {
    return row.name_en ? true : false;
  });

  importLog.totalProcessed = dataList.length;
  
  for (const item of dataList) {
    try {
      // 1. Create/Update the English record (base record)
      let englishRecords = await strapi.entityService.findMany('api::sample-type.sample-type', {
        filters: { name: item.name_en, locale: 'en' },
        locale: 'en'
      });

      let englishId;
      if (englishRecords.length > 0) {
        englishId = englishRecords[0].id;
        // Only update if the name has changed
        if (englishRecords[0].name !== item.name_en) {
          await strapi.entityService.update('api::sample-type.sample-type', englishId, {
            data: {
              name: item.name_en,
              publishedAt: new Date()
            },
            locale: 'en'
          });
          importLog.englishUpdated++;
        }
      } else {
        const newEnglish = await strapi.entityService.create('api::sample-type.sample-type', {
          data: {
            name: item.name_en,
            publishedAt: new Date()
          },
          locale: 'en'
        });
        englishId = newEnglish.id;
        importLog.englishCreated++;
      }

      // 2. Create/Update the German record (if German name exists and is not empty)
      if (item.name_de && item.name_de.trim() !== '') {
        let germanRecords = await strapi.entityService.findMany('api::sample-type.sample-type', {
          filters: { name: item.name_de, locale: 'de' },
          locale: 'de'
        });

        if (germanRecords.length > 0) {
          const germanId = germanRecords[0].id;
          // Only update if the name or localization has changed
          const needsUpdate = germanRecords[0].name !== item.name_de || 
            !germanRecords[0].localizations || 
            !germanRecords[0].localizations.some(loc => loc.id === englishId);
          if (needsUpdate) {
            await strapi.entityService.update('api::sample-type.sample-type', germanId, {
              data: {
                name: item.name_de,
                localizations: [englishId],
                publishedAt: new Date()
              },
              locale: 'de'
            });
            importLog.germanUpdated++;
          }
        } else {
          await strapi.entityService.create('api::sample-type.sample-type', {
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
          'api::sample-type.sample-type',
          englishId,
          { populate: ['localizations'] }
        );

        const currentLocalizations = englishWithLocalizations && englishWithLocalizations.localizations
          ? englishWithLocalizations.localizations.map(loc => loc.id)
          : [];

        const germanRecordCheck = await strapi.entityService.findMany('api::sample-type.sample-type', {
          filters: { name: item.name_de, locale: 'de' },
          locale: 'de'
        });

        if (germanRecordCheck.length > 0 && !currentLocalizations.includes(germanRecordCheck[0].id)) {
          await strapi.entityService.update('api::sample-type.sample-type', englishId, {
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

export { importSampleTypes };
