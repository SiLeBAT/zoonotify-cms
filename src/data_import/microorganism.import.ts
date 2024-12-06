import xlsx from 'node-xlsx';
const fs = require('fs');
const path = require('path');

async function importMicroorganisms(strapi) {
    const filePath = path.join(__dirname, '../../../data/master-data/microorganism.xlsx');

    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return;
    }

    const buffer = fs.readFileSync(filePath);
    const dataFromExcel = xlsx.parse(buffer); // Parse the Excel file
    const microorganismSheet = dataFromExcel.find(sheet => sheet.name === 'microorganism');

    if (!microorganismSheet) {
        console.error('Microorganisms sheet not found in the file');
        return;
    }

    if (microorganismSheet.data.length <= 1) {
        console.error('No data found in the Microorganisms sheet');
        return;
    }

    // Pre-fetch all existing microorganisms in both English and German
    const existingMicroorganisms = await strapi.entityService.findMany('api::microorganism.microorganism', {
        populate: ['localizations'],
        filters: {},
    });

    const existingEnglishNames = new Set(
        existingMicroorganisms
            .filter(entry => entry.locale === 'en')
            .map(entry => entry.name)
    );

    const existingGermanNames = new Set(
        existingMicroorganisms
            .filter(entry => entry.locale === 'de')
            .map(entry => entry.name)
    );

    const dataList = microorganismSheet.data.slice(1).map(row => ({
        name_de: row[0]?.trim(), // German name (first column)
        name_en: row[1]?.trim(), // English name (second column)
    }));

    for (const item of dataList) {
        try {
            // Skip if the German name already exists
            if (existingGermanNames.has(item.name_de)) {
                console.log(`German entry "${item.name_de}" already exists. Skipping.`);
                continue;
            }

            // Create or find the English entry
            let defaultEntry;

            if (existingEnglishNames.has(item.name_en)) {
                // Fetch the existing English entry
                defaultEntry = existingMicroorganisms.find(
                    entry => entry.name === item.name_en && entry.locale === 'en'
                );
            } else {
                // Create a new English entry
                defaultEntry = await strapi.entityService.create('api::microorganism.microorganism', {
                    data: {
                        name: item.name_en,
                        locale: 'en',
                    },
                });

                // Add the new English name to the set
                existingEnglishNames.add(item.name_en);
            }

            // Create the German entry linked to the English entry
            await strapi.entityService.create('api::microorganism.microorganism', {
                data: {
                    name: item.name_de,
                    locale: 'de',
                    localizationOf: defaultEntry.id,
                },
            });

            // Add the German name to the set to prevent future duplicates
            existingGermanNames.add(item.name_de);

        } catch (error) {
            console.error('Error importing microorganism:', error);
        }
    }
}

export { importMicroorganisms };
