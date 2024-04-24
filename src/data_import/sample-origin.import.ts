import xlsx from 'node-xlsx';
const fs = require('fs');
const path = require('path');

async function importSampleOrigins(strapi) {
    let filePath = path.join(__dirname, '../../../data//master-data/sampleorigin.xlsx');

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
            // Logging each row to see what data is available
            return {
                name: row[0], // Assuming 'name' is in the first column
                iri: row[1]  // Assuming 'iri' is in the second column
            };
        });


        for (const item of dataList) {
            try {
                // Check if the entry already exists based on 'name'
                let existingEntries = await strapi.entityService.findMany('api::sample-origin.sample-origin', {
                    filters: { name: item.name },
                });

                if (existingEntries.length > 0) {
                    // Update the first found entry (assuming 'name' is unique)
                    await strapi.entityService.update('api::sample-origin.sample-origin', existingEntries[0].id, { data: item });
                } else {
                    // Create new entry
                    await strapi.entityService.create('api::sample-origin.sample-origin', { data: item });
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