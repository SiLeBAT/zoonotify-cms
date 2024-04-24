import xlsx from 'node-xlsx';

async function importControlledVocabularyTranslations(strapi) {
    const fs = require('fs');
    const path = require('path');

    let filePath = path.join(__dirname, '../../../data//master-data/ZooNotify_DB_translation.xlsx');

    if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const dataFromExcel = xlsx.parse(buffer); // Parse the Excel file
        const translationData = dataFromExcel.find(sheet => sheet.name === 'translation'); // Find the 'translation' sheet


        let dataList = translationData.data.slice(1).map(row => { // Skip header row
            return {
                de: row[1], // German translation
                en: row[2]  // English translation
            };
        });

        for (const item of dataList) {
            try {
                // Check if the entry already exists
                let existingEntries = await strapi.entityService.findMany('api::controlled-vocabulary.controlled-vocabulary', {
                    filters: { $or: [{ de: item.de }, { en: item.en }] },
                });

                if (existingEntries.length > 0) {
                    // Update the first found entry (assuming 'de' or 'en' fields are unique)
                    await strapi.entityService.update('api::controlled-vocabulary.controlled-vocabulary', existingEntries[0].id, { data: item });
                } else {
                    // Create new entry
                    await strapi.entityService.create('api::controlled-vocabulary.controlled-vocabulary', { data: item });
                }
            } catch (error) {
                console.error('Error importing Controlled Vocabulary translation:', error);
            }
        }
    } else {
        console.error('File not found:', filePath);
    }
}

export { importControlledVocabularyTranslations };
