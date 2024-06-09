import xlsx from 'node-xlsx';
const fs = require('fs');
const path = require('path');

async function importMatrixGroups(strapi) {
    let filePath = path.join(__dirname, '../../../data//master-data/matrixgroup.xlsx'); 

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
                name: row[0], // Assuming 'name' is in the first column
                iri: row[1]  // Assuming 'iri' is in the second column
            };
        });


        for (const item of dataList) {
            try {
                // Check if the entry already exists based on 'name'
                let existingEntries = await strapi.entityService.findMany('api::matrix-group.matrix-group', {
                    filters: { name: item.name },
                });

                if (existingEntries.length > 0) {
                    // Update the first found entry (assuming 'name' is unique)
                    await strapi.entityService.update('api::matrix-group.matrix-group', existingEntries[0].id, { data: item });
                } else {
                    // Create new entry
                    await strapi.entityService.create('api::matrix-group.matrix-group', { data: item });
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
