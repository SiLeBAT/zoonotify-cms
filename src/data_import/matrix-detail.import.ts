import xlsx from 'node-xlsx';
const fs = require('fs');
const path = require('path');

async function importMatrixDetails(strapi) {
    let filePath = path.join(__dirname, '../../../data//master-data/matrixdetail.xlsx');

    if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const dataFromExcel = xlsx.parse(buffer); // Parse the Excel file
        const matrixDetailData = dataFromExcel.find(sheet => sheet.name === 'matrixdetail');

        if (!matrixDetailData) {
            console.error('MatrixDetails sheet not found in the file');
            return;
        }

        if (matrixDetailData.data.length === 0) {
            console.error('No data found in the MatrixDetails sheet');
            return;
        }

        let dataList = matrixDetailData.data.slice(1).map(row => {
            // Logging each row to see what data is available
            return {
                name: row[0], // Assuming 'name' is in the first column
                iri: row[1]  // Assuming 'iri' is in the second column
            };
        });


        for (const item of dataList) {
            try {
                // Check if the entry already exists based on 'name'
                let existingEntries = await strapi.documents('api::matrix-detail.matrix-detail').findMany({
                    filters: { name: item.name },
                });

                if (existingEntries.length > 0) {
                    // Update the first found entry (assuming 'name' is unique)
                    await strapi.documents('api::matrix-detail.matrix-detail').update({
                        documentId: "__TODO__",
                        data: item
                    });
                } else {
                    // Create new entry
                    await strapi.documents('api::matrix-detail.matrix-detail').create({ data: item });
                }
            } catch (error) {
                console.error('Error importing matrix detail:', error);
            }
        }
    } else {
        console.error('File not found:', filePath);
    }
}

export { importMatrixDetails };
