
import xlsx from 'node-xlsx';
import fs from 'fs';
import path from 'path';

/**
 * Import sample origins from an Excel file.
 * - Creates/updates English records (locale='en') as the base.
 * - Creates/updates German records (locale='de') linked to English via 'localizations'.
 * - Ensures no duplication across locales on re-run.
 */
async function importSampleOrigins(strapi) {
  const filePath = path.join(__dirname, '../../../data/master-data/sampleorigin.xlsx');
  const logFilePath = path.join(__dirname, '../../../data/sampleorigin-import-log.json');

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
  console.log('Clearing existing sample-origin records...');
  const allRecords = await strapi.entityService.findMany('api::sample-origin.sample-origin', {
    locale: ['en', 'de']
  });
  for (const record of allRecords) {
    await strapi.entityService.delete('api::sample-origin.sample-origin', record.id);
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
  const sheet = dataFromExcel.find((s) => s.name.toLowerCase() === 'sampleorigin');

  if (!sheet) {
    console.error('Sheet "sampleorigin" not found in the file');
    return;
  }
  if (sheet.data.length <= 1) {
    console.error('No data found in the "sampleorigin" sheet');
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
    if (!row.name_en) {
      
      return false;
    }
    return true;
  });

  importLog.totalProcessed = dataList.length;
  

  for (const item of dataList) {
  
    try {
      // 1. Create/Update the English record (base record)
      let englishRecords = await strapi.entityService.findMany('api::sample-origin.sample-origin', {
        filters: { name: item.name_en, locale: 'en' }, // Explicitly filter by locale
        locale: 'en'
      });

      

      let englishId;
      if (englishRecords.length > 0) {
        englishId = englishRecords[0].id;
        // Only update if the name has changed
        if (englishRecords[0].name !== item.name_en) {
          
          await strapi.entityService.update('api::sample-origin.sample-origin', englishId, {
            data: {
              name: item.name_en,
              publishedAt: new Date()
            },
            locale: 'en'
          });
          importLog.englishUpdated++;
        } else {
          
        }
      } else {
        
        const newEnglish = await strapi.entityService.create('api::sample-origin.sample-origin', {
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
        
        let germanRecords = await strapi.entityService.findMany('api::sample-origin.sample-origin', {
          filters: { name: item.name_de, locale: 'de' }, // Explicitly filter by locale
          locale: 'de'
        });

        

        if (germanRecords.length > 0) {
          const germanId = germanRecords[0].id;
          // Only update if the name or localization has changed
          const needsUpdate = germanRecords[0].name !== item.name_de || 
            !germanRecords[0].localizations || 
            !germanRecords[0].localizations.some(loc => loc.id === englishId);
          if (needsUpdate) {
            
            await strapi.entityService.update('api::sample-origin.sample-origin', germanId, {
              data: {
                name: item.name_de,
                localizations: [englishId],
                publishedAt: new Date()
              },
              locale: 'de'
            });
            importLog.germanUpdated++;
          } else {
            
          }
        } else {
          
          const newGerman = await strapi.entityService.create('api::sample-origin.sample-origin', {
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
          'api::sample-origin.sample-origin',
          englishId,
          { populate: ['localizations'] }
        );

        const currentLocalizations = englishWithLocalizations && englishWithLocalizations.localizations
          ? englishWithLocalizations.localizations.map(loc => loc.id)
          : [];

        const germanRecordCheck = await strapi.entityService.findMany('api::sample-origin.sample-origin', {
          filters: { name: item.name_de, locale: 'de' },
          locale: 'de'
        });

        if (germanRecordCheck.length > 0 && !currentLocalizations.includes(germanRecordCheck[0].id)) {
          
          await strapi.entityService.update('api::sample-origin.sample-origin', englishId, {
            data: {
              localizations: [...currentLocalizations, germanRecordCheck[0].id],
              name: item.name_en,
              publishedAt: new Date()
            },
            locale: 'en'
          });
        } else {
          
        }
      } else {
        
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

export { importSampleOrigins };