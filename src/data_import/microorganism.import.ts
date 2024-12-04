import xlsx from 'node-xlsx';
const fs = require('fs');
const path = require('path');

async function importMicroorganisms(strapi) {
    let filePath = path.join(__dirname, '../../../data/master-data/microorganism.xlsx');

    if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const dataFromExcel = xlsx.parse(buffer); // Parse the Excel file
        const microorganismData = dataFromExcel.find(sheet => sheet.name === 'microorganism');

        if (!microorganismData) {
            console.error('Microorganisms sheet not found in the file');
            return;
        }

        if (microorganismData.data.length <= 1) {
            console.error('No data found in the Microorganisms sheet');
            return;
        }

        let dataList = microorganismData.data.slice(1).map(row => {
            return {
                name_de: row[0], // German name (assuming it's in the first column)
                name_en: row[1], // English name (assuming it's in the second column)
            };
        });

        for (const item of dataList) {
            try {
                // Step 1: Find or create/update the default locale ('en') entry
                let existingEntriesEn = await strapi.entityService.findMany('api::microorganism.microorganism', {
                    filters: { name: item.name_en, locale: 'en' },
                });

                let defaultEntry;

                if (existingEntriesEn.length > 0) {
                    // Update the existing default locale entry
                    defaultEntry = await strapi.entityService.update('api::microorganism.microorganism', existingEntriesEn[0].id, {
                        data: {
                            name: item.name_en,
                            // Do not set 'locale' during update
                        },
                    });
                } else {
                    // Create a new default locale entry
                    defaultEntry = await strapi.entityService.create('api::microorganism.microorganism', {
                        data: {
                            name: item.name_en,
                            locale: 'en', // Set locale when creating new entry
                        },
                    });
                }

                // Step 2: Ensure the German ('de') localization exists
                // Fetch the default entry with its localizations
                const defaultEntryWithLocalizations = await strapi.entityService.findOne('api::microorganism.microorganism', defaultEntry.id, {
                    populate: ['localizations'],
                });

                // Check if a German localization exists
                let deEntry = defaultEntryWithLocalizations.localizations.find(loc => loc.locale === 'de');

                if (deEntry) {
                    // Update the existing German locale entry
                    await strapi.entityService.update('api::microorganism.microorganism', deEntry.id, {
                        data: {
                            name: item.name_de,
                            // Do not set 'locale' during update
                        },
                    });
                } else {
                    // Create a new German locale entry linked to the default entry
                    await strapi.entityService.create('api::microorganism.microorganism', {
                        data: {
                            name: item.name_de,
                            locale: 'de', // Set locale when creating new entry
                            // Link to the default entry
                            localizationOf: defaultEntry.id,
                        },
                    });
                }
            } catch (error) {
                console.error('Error importing microorganism:', error);
            }
        }
    } else {
        console.error('File not found:', filePath);
    }
}

export { importMicroorganisms };
