import xlsx from 'node-xlsx';
const fs = require('fs');
const path = require('path');

async function importMatrix(strapi) {
    let filePath = path.join(__dirname, '../../../data//master-data/matrix.xlsx');

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
            // Logging each row to see what data is available
            return {
                name: row[0], // Assuming 'name' is in the first column
                iri: row[1]  // Assuming 'iri' is in the second column
            };
        });


        for (const item of dataList) {
            try {
                // Check if the entry already exists based on 'name'
                let existingEntries = await strapi.entityService.findMany('api::matrix.matrix', {
                    filters: { name: item.name },
                });

                if (existingEntries.length > 0) {
                    // Update the first found entry (assuming 'name' is unique)
                    await strapi.entityService.update('api::matrix.matrix', existingEntries[0].id, { data: item });
                } else {
                    // Create new entry
                    await strapi.entityService.create('api::matrix.matrix', { data: item });
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
