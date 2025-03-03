import xlsx from 'node-xlsx';
const fs = require('fs');
const path = require('path');

async function importSampleOrigins(strapi) {
    let filePath = path.join(__dirname, '../../../data/master-data/sampleorigin.xlsx');

    if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const dataFromExcel = xlsx.parse(buffer); // Parse the Excel file
        const sampleOriginData = dataFromExcel.find(sheet => sheet.name === 'sampleorigin');

        if (!sampleOriginData) {
            console.error('SampleOrigins sheet not found in the file');
            return;
        }

        if (sampleOriginData.data.length === 0) {
            console.error('No data found in the SampleOrigins sheet');
            return;
        }

        let dataList = sampleOriginData.data.slice(1).map(row => {
            return {
                name_de: row[0], // German name (assuming it's in the first column)
                name_en: row[1], // English name (assuming it's in the second column)
                // No 'iri' field since it's not important
            };
        });

        for (const item of dataList) {
            try {
                // Step 1: Find or create/update the default locale ('en') entry
                let existingEntriesEn = await strapi.documents('api::sample-origin.sample-origin').findMany({
                    filters: { name: item.name_en },
                    locale: 'en',
                });

                let defaultEntry;

                if (existingEntriesEn.length > 0) {
                    // Update the existing default locale entry
                    defaultEntry = await strapi.documents('api::sample-origin.sample-origin').update({
                        documentId: "__TODO__",

                        data: {
                            name: item.name_en,
                            locale: 'en', // Ensure locale is set inside data
                        }
                    });
                } else {
                    // Create a new default locale entry
                    defaultEntry = await strapi.documents('api::sample-origin.sample-origin').create({
                        data: {
                            name: item.name_en,
                            locale: 'en', // Set locale inside data
                        },
                    });
                }

                // Step 2: Find or create/update the German ('de') locale entry
                // Fetch the default entry with its localizations
                const defaultEntryWithLocalizations = await strapi.documents('api::sample-origin.sample-origin').findOne({
                    documentId: "__TODO__",
                    populate: ['localizations']
                });

                // Check if a German localization exists
                let deEntry = defaultEntryWithLocalizations.localizations.find(loc => loc.locale === 'de');

                if (deEntry) {
                    // Update the existing German locale entry
                    await strapi.documents('api::sample-origin.sample-origin').update({
                        documentId: "__TODO__",

                        data: {
                            name: item.name_de,
                            locale: 'de', // Ensure locale is set inside data
                        }
                    });
                } else {
                    // Create a new German locale entry linked to the default entry
                    await strapi.documents('api::sample-origin.sample-origin').create({
                        data: {
                            name: item.name_de,
                            locale: 'de', // Set locale inside data
                            localizationOf: defaultEntry.id, // Link to the default entry
                        },
                    });
                }
            } catch (error) {
                console.error('Error importing sample origin:', error);
            }
        }
    } else {
        console.error('File not found:', filePath);
    }
}

export { importSampleOrigins };
