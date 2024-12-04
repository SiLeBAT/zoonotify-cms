import xlsx from 'node-xlsx';
const fs = require('fs');
const path = require('path');

async function importMatrixGroups(strapi) {
    let filePath = path.join(__dirname, '../../../data/master-data/matrixgroup.xlsx'); 

    if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const dataFromExcel = xlsx.parse(buffer); // Parse the Excel file
        const matrixGroupData = dataFromExcel.find(sheet => sheet.name === 'matrixgroup'); 

        if (!matrixGroupData) {
            console.error('MatrixGroups sheet not found in the file');
            return;
        }

        if (matrixGroupData.data.length === 0) {
            console.error('No data found in the MatrixGroups sheet');
            return;
        }

        let dataList = matrixGroupData.data.slice(1).map(row => {
            return {
                name_de: row[0], // German name
                name_en: row[1], // English name
                // No 'iri' field since it's not provided
            };
        });

        for (const item of dataList) {
            try {
                // Step 1: Find or create/update the default locale ('en') entry
                let existingEntriesEn = await strapi.entityService.findMany('api::matrix-group.matrix-group', {
                    filters: { name: item.name_en },
                    locale: 'en',
                });

                let defaultEntry;

                if (existingEntriesEn.length > 0) {
                    // Update the existing default locale entry
                    defaultEntry = await strapi.entityService.update('api::matrix-group.matrix-group', existingEntriesEn[0].id, {
                        data: {
                            name: item.name_en,
                            locale: 'en', // Ensure locale is set inside data
                        },
                    });
                } else {
                    // Create a new default locale entry
                    defaultEntry = await strapi.entityService.create('api::matrix-group.matrix-group', {
                        data: {
                            name: item.name_en,
                            locale: 'en', // Set locale inside data
                        },
                    });
                }

                // Step 2: Find or create/update the German ('de') locale entry
                // Fetch the default entry with its localizations
                const defaultEntryWithLocalizations = await strapi.entityService.findOne('api::matrix-group.matrix-group', defaultEntry.id, {
                    populate: ['localizations'],
                });

                // Check if a German localization exists
                let deEntry = defaultEntryWithLocalizations.localizations.find(loc => loc.locale === 'de');

                if (deEntry) {
                    // Update the existing German locale entry
                    await strapi.entityService.update('api::matrix-group.matrix-group', deEntry.id, {
                        data: {
                            name: item.name_de,
                            locale: 'de', // Ensure locale is set inside data
                        },
                    });
                } else {
                    // Create a new German locale entry linked to the default entry
                    await strapi.entityService.create('api::matrix-group.matrix-group', {
                        data: {
                            name: item.name_de,
                            locale: 'de', // Set locale inside data
                            // Link to the default entry using 'localizationOf'
                            localizationOf: defaultEntry.id,
                        },
                    });
                }
            } catch (error) {
                console.error('Error importing matrix group:', error);
            }
        }
    } else {
        console.error('File not found:', filePath);
    }
}

export { importMatrixGroups };
