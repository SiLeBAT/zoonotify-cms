import xlsx from 'node-xlsx';
const fs = require('fs');
const path = require('path');

async function importMatrix(strapi) {
    let filePath = path.join(__dirname, '../../../data/master-data/matrix.xlsx');

    if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const dataFromExcel = xlsx.parse(buffer); // Parse the Excel file
        const matrixData = dataFromExcel.find(sheet => sheet.name === 'matrix');

        if (!matrixData) {
            console.error('Matrix sheet not found in the file');
            return;
        }

        if (matrixData.data.length === 0) {
            console.error('No data found in the Matrix sheet');
            return;
        }

        let dataList = matrixData.data.slice(1).map(row => {
            return {
                name_de: row[0], // German name
                name_en: row[1], // English name
                iri: row[2] || null // IRI, if available
            };
        });

        for (const item of dataList) {
            try {
                // Step 1: Find or create/update the default locale ('en') entry
                let existingEntriesEn = await strapi.documents('api::matrix.matrix').findMany({
                    filters: { name: item.name_en },
                    locale: 'en',
                });

                let defaultEntry;

                if (existingEntriesEn.length > 0) {
                    // Update the existing default locale entry
                    defaultEntry = await strapi.documents('api::matrix.matrix').update({
                        documentId: "__TODO__",

                        data: {
                            name: item.name_en,
                            iri: item.iri,
                            locale: 'en', // Ensure locale is set inside data
                        }
                    });
                } else {
                    // Create a new default locale entry
                    defaultEntry = await strapi.documents('api::matrix.matrix').create({
                        data: {
                            name: item.name_en,
                            iri: item.iri,
                            locale: 'en', // Set locale inside data
                        },
                    });
                }

                // Step 2: Find or create/update the German ('de') locale entry
                // Fetch the default entry with its localizations
                const defaultEntryWithLocalizations = await strapi.documents('api::matrix.matrix').findOne({
                    documentId: "__TODO__",
                    populate: ['localizations']
                });

                // Check if a German localization exists
                let deEntry = defaultEntryWithLocalizations.localizations.find(loc => loc.locale === 'de');

                if (deEntry) {
                    // Update the existing German locale entry
                    await strapi.documents('api::matrix.matrix').update({
                        documentId: "__TODO__",

                        data: {
                            name: item.name_de,
                            locale: 'de', // Ensure locale is set inside data
                        }
                    });
                } else {
                    // Create a new German locale entry linked to the default entry
                    await strapi.documents('api::matrix.matrix').create({
                        data: {
                            name: item.name_de,
                            locale: 'de', // Set locale inside data
                            // Link to the default entry using 'localizationOf'
                            localizationOf: defaultEntry.id,
                        },
                    });
                }
            } catch (error) {
                console.error('Error importing matrix:', error);
            }
        }
    } else {
        console.error('File not found:', filePath);
    }
}

export { importMatrix };
