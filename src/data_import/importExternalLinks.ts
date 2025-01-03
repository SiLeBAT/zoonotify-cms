import xlsx from 'node-xlsx';
import fs from 'fs';
import path from 'path';

async function importExternalLinks(strapi: any): Promise<void> {
    const filePath = path.join(__dirname, '../../../data/master-data/external-links.xlsx');
    const outFilePath = path.join(__dirname, '../../../data/external-links-import-result.json');

    const importLog = {
        TotalRecords: 0,
        SuccessfullySaved: 0,
        Failures: [] as { name_en: string; name_de: string; error: string }[],
    };

    if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const dataFromExcel = xlsx.parse(buffer);
        const linksData = dataFromExcel.find(sheet => sheet.name === 'ExternalLinks');

        if (!linksData) {
            console.error('ExternalLinks sheet not found in the file');
            return;
        }

        if (linksData.data.length <= 1) {
            console.error('No data found in the ExternalLinks sheet');
            return;
        }

        const dataList = linksData.data.slice(1).map(row => ({
            name_en: row[0] as string,
            name_de: row[1] as string,
            link_en: row[2] as string,
            link_de: row[3] as string,
            category: row[4] as string,
            priority: parseInt(row[5], 10),
        }));

        importLog.TotalRecords = dataList.length;

        for (const item of dataList) {
            try {
                // Create or update English entry
                const dataToSaveEn = {
                    name: item.name_en,
                    link: item.link_en,
                    category: item.category,
                    priority: item.priority,
                    locale: 'en',
                };

                let defaultEntry = await strapi.entityService.findMany('api::externallink.externallink', {
                    filters: { name: item.name_en },
                    locale: 'en',
                });

                if (defaultEntry.length > 0) {
                    // Update existing English entry
                    defaultEntry = await strapi.entityService.update('api::externallink.externallink', defaultEntry[0].id, {
                        data: dataToSaveEn,
                    });
                } else {
                    // Create new English entry
                    defaultEntry = await strapi.entityService.create('api::externallink.externallink', {
                        data: dataToSaveEn,
                    });
                }

                // Debug: Log default English entry creation/update
                console.log(`English entry processed: ${item.name_en}`);

                // Ensure German entry is created/updated without duplication
                const dataToSaveDe = {
                    name: item.name_de,
                    link: item.link_de,
                    category: item.category,
                    priority: item.priority,
                    locale: 'de',
                    localizationOf: defaultEntry.id,
                };

                let existingEntriesDe = await strapi.entityService.findMany('api::externallink.externallink', {
                    filters: { name: item.name_de },
                    locale: 'de',
                });

                if (existingEntriesDe.length > 0) {
                    // Update existing German entry
                    await strapi.entityService.update('api::externallink.externallink', existingEntriesDe[0].id, {
                        data: dataToSaveDe,
                    });
                } else {
                    // Create new German entry linked to the English one
                    await strapi.entityService.create('api::externallink.externallink', {
                        data: dataToSaveDe,
                    });
                }

                // Debug: Log German entry creation/update
                console.log(`German entry processed: ${item.name_de}`);

                importLog.SuccessfullySaved++;
            } catch (error) {
                console.error('Error importing external link data:', error);
                importLog.Failures.push({ name_en: item.name_en, name_de: item.name_de, error: (error as Error).message });
            }
        }

        fs.writeFileSync(outFilePath, JSON.stringify(importLog, null, 2));
    } else {
        console.error('File not found:', filePath);
    }
}

export { importExternalLinks };
