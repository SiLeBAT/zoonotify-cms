
import xlsx from 'node-xlsx';
import fs from 'fs';
import path from 'path';

// Define a type for the entity object
interface MicroorganismEntity {
  name: string;
  publishedAt: Date;
  locale: string;
}

/**
 * Import microorganisms from an Excel file.
 * - Creates English records (locale='en') as the base.
 * - Creates German records (locale='de') as localized versions of the English records using the same documentId.
 * - Ensures no duplication across locales on re-run.
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

  const service = strapi.entityService;
  const collection = 'api::microorganism.microorganism';

  for (const item of dataList) {
    console.log(`\nRow ${item.rowNumber}: English="${item.name_en}", German="${item.name_de}"`);
    try {
      // 1. Create or Update the English record (base record, locale='en')
      let englishRecord = await service.findMany(collection, {
        filters: { name: item.name_en, locale: 'en' },
        locale: 'en',
        populate: ['localizations']
      });

      let englishId, englishDocumentId;
      if (englishRecord.length > 0) {
        englishId = englishRecord[0].id;
        englishDocumentId = englishRecord[0].documentId; // Get the documentId
        // Update if the name has changed
        if (englishRecord[0].name !== item.name_en) {
          console.log(`Updating English record: ID=${englishId} => ${item.name_en}`);
          await service.update(collection, englishId, {
            data: {
              name: item.name_en,
              publishedAt: new Date()
            },
            locale: 'en'
          });
          importLog.englishUpdated++;
        }
      } else {
        console.log(`Creating English record: ${item.name_en}`);
        const newEnglish = await service.create(collection, {
          data: {
            name: item.name_en,
            publishedAt: new Date()
          },
          locale: 'en'
        });
        englishId = newEnglish.id;
        englishDocumentId = newEnglish.documentId; // Get the documentId
        importLog.englishCreated++;
      }

      // 2. Create or Update the German record as a localized version of the English record
      if (item.name_de && item.name_de.trim() !== '') {
        // Check if a German localization already exists for this English record
        const englishWithLocalizations = await service.findOne(collection, englishId, {
          populate: ['localizations'],
          locale: 'en'
        });

        const germanLocalization = englishWithLocalizations.localizations?.find(loc => loc.locale === 'de');

        if (germanLocalization) {
          // Update the existing German localization if the name has changed
          if (germanLocalization.name !== item.name_de) {
            console.log(`Updating German record: ID=${germanLocalization.id} => ${item.name_de}`);
            await service.update(collection, germanLocalization.id, {
              data: {
                name: item.name_de,
                publishedAt: new Date()
              },
              locale: 'de'
            });
            importLog.germanUpdated++;
          }
        } else {
          // Use Strapi's db.query to create the German record with the same documentId
          console.log(`Creating German record: ${item.name_de} (linked to English documentId: ${englishDocumentId})`);
          const germanRecord = await strapi.db.query('api::microorganism.microorganism').create({
            data: {
              name: item.name_de,
              publishedAt: new Date(),
              locale: 'de',
              documentId: englishDocumentId // Use the same documentId to link them
            }
          });

          // Log the creation for debugging
          console.log(`Created German record for English documentId ${englishDocumentId}:`, {
            id: germanRecord.id,
            documentId: germanRecord.documentId,
            locale: germanRecord.locale
          });

          // Fetch the English record to confirm linking
          const updatedEnglish = await service.findOne(collection, englishId, {
            populate: ['localizations'],
            locale: 'en'
          });
          console.log(`Linked records for English ID ${englishId} (documentId: ${englishDocumentId}):`, updatedEnglish.localizations);

          // Additional debugging: Fetch the German record to confirm its documentId
          const fetchedGerman = await service.findOne(collection, germanRecord.id, {
            populate: ['localizations'],
            locale: 'de'
          });
          console.log(`German record details for ID ${germanRecord.id}:`, {
            documentId: fetchedGerman.documentId,
            localizations: fetchedGerman.localizations
          });

          importLog.germanCreated++;
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

  // Write the import log to a file
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