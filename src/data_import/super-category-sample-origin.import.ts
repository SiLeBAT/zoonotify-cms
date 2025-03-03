import xlsx from 'node-xlsx';
const fs = require('fs');
const path = require('path');

async function importSuperCategorySampleOrigins(strapi) {
    let filePath = path.join(__dirname, '../../../data/master-data/supercategorysampleorigin.xlsx');

    if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const dataFromExcel = xlsx.parse(buffer); // Parse the Excel file
        const superCategorySampleOriginData = dataFromExcel.find(sheet => sheet.name === 'supercategorysampleorigin');

        if (!superCategorySampleOriginData) {
            console.error('SuperCategorySampleOrigins sheet not found in the file');
            return;
        }

        if (superCategorySampleOriginData.data.length === 0) {
            console.error('No data found in the SuperCategorySampleOrigins sheet');
            return;
        }

        let dataList = superCategorySampleOriginData.data.slice(1).map(row => {
            return {
                name_de: row[0], // German name (assuming it's in the first column)
                name_en: row[1], // English name (assuming it's in the second column)
                // 'iri' field can be included if needed
                // iri: row[2] || null
            };
        });

        for (const item of dataList) {
            try {
                // Step 1: Find or create/update the default locale ('en') entry
                let existingEntriesEn = await strapi.documents('api::super-category-sample-origin.super-category-sample-origin').findMany({
                    filters: { name: item.name_en },
                    locale: 'en',
                });

                let defaultEntry;

                if (existingEntriesEn.length > 0) {
                    // Update the existing default locale entry
                    defaultEntry = await strapi.documents('api::super-category-sample-origin.super-category-sample-origin').update({
                        documentId: "__TODO__",

                        data: {
                            name: item.name_en,
                            // Do not set 'locale' in data during update
                        }
                    });
                } else {
                    // Create a new default locale entry
                    defaultEntry = await strapi.documents('api::super-category-sample-origin.super-category-sample-origin').create({
                        data: {
                            name: item.name_en,
                            locale: 'en', // Set locale when creating a new entry
                            // Include 'iri' if needed
                            // iri: item.iri,
                        },
                    });
                }

                // Step 2: Find or create/update the German ('de') locale entry
                // Fetch the default entry with its localizations
                const defaultEntryWithLocalizations = await strapi.documents('api::super-category-sample-origin.super-category-sample-origin').findOne({
                    documentId: "__TODO__",
                    populate: ['localizations']
                });

                // Check if a German localization exists
                let deEntry = defaultEntryWithLocalizations.localizations.find(loc => loc.locale === 'de');

                if (deEntry) {
                    // Update the existing German locale entry
                    await strapi.documents('api::super-category-sample-origin.super-category-sample-origin').update({
                        documentId: "__TODO__",

                        data: {
                            name: item.name_de,
                            // Do not set 'locale' in data during update
                        }
                    });
                } else {
                    // Create a new German locale entry linked to the default entry
                    await strapi.documents('api::super-category-sample-origin.super-category-sample-origin').create({
                        data: {
                            name: item.name_de,
                            locale: 'de', // Set locale when creating a new entry
                            localizationOf: defaultEntry.id, // Link to the default entry
                        },
                    });
                }
            } catch (error) {
                console.error('Error importing super category sample origin:', error);
            }
        }
    } else {
        console.error('File not found:', filePath);
    }
}

export { importSuperCategorySampleOrigins };
