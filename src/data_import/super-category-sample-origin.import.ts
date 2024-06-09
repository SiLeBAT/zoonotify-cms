import xlsx from 'node-xlsx';
const fs = require('fs');
const path = require('path');

async function importSuperCategorySampleOrigins(strapi) {
    let filePath = path.join(__dirname, '../../../data//master-data/supercategorysampleorigin.xlsx');

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
            // Logging each row to see what data is available
            return {
                name: row[0], // Assuming 'name' is in the first column
                iri: row[1]  // Assuming 'iri' is in the second column
            };
        });


        for (const item of dataList) {
            try {
                // Check if the entry already exists based on 'name'
                let existingEntries = await strapi.entityService.findMany('api::super-category-sample-origin.super-category-sample-origin', {
                    filters: { name: item.name },
                });

                if (existingEntries.length > 0) {
                    // Update the first found entry (assuming 'name' is unique)
                    await strapi.entityService.update('api::super-category-sample-origin.super-category-sample-origin', existingEntries[0].id, { data: item });
                } else {
                    // Create new entry
                    await strapi.entityService.create('api::super-category-sample-origin.super-category-sample-origin', { data: item });
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
