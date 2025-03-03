import xlsx from 'node-xlsx';

let antibiotics;
export interface ResistanceRecord {
    table_id: string;
    description: string;
    title: string;
    cut_offs: CutOff[];
}

export interface CutOff {
    year: number;
    antibiotic: number[];
    substanzklasse: string;
    bacteria: string;
    min: number;
    max: number;
    cutOff: string;
}

function readRecord(data: any[][]) {
    console.log("Raw data from Excel sheet:", data);
    let baseRec = {};
    let cols: string[] = [];
    let dataList: any[] = [];

    data[0].forEach(columnName => {
        if (columnName) {
            if (!isNaN(columnName)) {
                baseRec[columnName + "_cut-off"] = "";
                baseRec[columnName + "_min"] = "";
                baseRec[columnName + "_max"] = "";
                cols.push(columnName + "_cut-off");
                cols.push(columnName + "_min");
                cols.push(columnName + "_max");
            } else {
                baseRec[columnName] = "";
                cols.push(columnName);
            }
        }
    });

    console.log("Parsed column headers:", cols);

    data.forEach((recLine, index) => {
        let years: string[] = [];
        if (index > 1 && recLine.length > 0) {
            let newRec = Object.create(baseRec);

            recLine.forEach((columnData, colIndex) => {
                let colName = cols[colIndex];
                var initialPart = colName.split('_')[0];
                if (!isNaN(initialPart as any) && columnData) {
                    if (years.indexOf(initialPart) === -1) years.push(initialPart);
                }
                newRec[colName] = columnData;
            });
            newRec["years"] = years;
            dataList.push(newRec);
        }
    });

    console.log("Parsed rows:", dataList);
    return dataList;
}

function prepareRecord(res, bacteria, tableId) {
    console.log("Processing res array:", res);

    let descriptionObj = res.pop();
    let titleObj = res.pop();

    if (!descriptionObj || !descriptionObj.Substanzklasse) {
        console.error(`Description object missing for table_id ${tableId}:`, descriptionObj);
        return null;
    }

    if (!titleObj || !titleObj.Substanzklasse) {
        console.error(`Title object missing for table_id ${tableId}:`, titleObj);
        return null;
    }

    let newEntry: ResistanceRecord = {
        table_id: tableId,
        description: descriptionObj.Substanzklasse,
        title: titleObj.Substanzklasse,
        cut_offs: []
    };

    let problematicAntibiotics = []; // Track problematic antibiotics

    res.forEach((x) => {
        if (!x || !x.Wirkstoff) {
            console.error("Invalid data object:", x);
            return;
        }

        let item = antibiotics.find((item) => item["name"] === x.Wirkstoff);
        let antibioticId = item ? item.id : null;

        if (!item) {
            console.error(`Unmatched antibiotic name: ${x.Wirkstoff}`);
            problematicAntibiotics.push(x.Wirkstoff);
        }

        x.years.forEach((year) => {
            let cutOffVal = x[year + "_cut-off"];
            let min = x[year + "_min"];
            let max = x[year + "_max"];

            if (isNaN(min) || isNaN(max)) {
                console.error(`Invalid numeric values for year ${year}:`, { min, max });
                problematicAntibiotics.push({ Wirkstoff: x.Wirkstoff, year, min, max });
                return;
            }

            let cutOff: CutOff = {
                year: year,
                antibiotic: [antibioticId],
                substanzklasse: x.Substanzklasse,
                bacteria: bacteria,
                min: min,
                max: max,
                cutOff: cutOffVal ? cutOffVal.toString().replace('*', '') : "",
            };

            if (!antibioticId) {
                console.error(`Invalid antibiotic ID for Wirkstoff: ${x.Wirkstoff}, year: ${year}`);
                problematicAntibiotics.push({ Wirkstoff: x.Wirkstoff, year, cutOff });
                return;
            }

            newEntry.cut_offs.push(cutOff);
        });
    });

    if (!newEntry.cut_offs.length) {
        console.error("Invalid entry generated for table_id:", tableId, newEntry);
        return null;
    }

    if (problematicAntibiotics.length > 0) {
        console.error("Problematic antibiotics identified:", problematicAntibiotics);
    }

    return newEntry;
}

async function saveResistanceRecord(records: any[]) {
    const response = [];

    for (const record of records) {
        if (!record) {
            console.error("Skipping invalid record:", record);
            continue;
        }

        try {
            const enEntries = await strapi.documents('api::resistance-table.resistance-table').findMany({
                fields: ['id', 'table_id', 'locale'],
                filters: { table_id: record.table_id, locale: 'en' }
            });

            console.log(`Existing entries for table_id ${record.table_id} in 'en':`, enEntries);

            let deEntries = await strapi.documents('api::resistance-table.resistance-table').findMany({
                fields: ['id', 'table_id', 'locale'],
                filters: { table_id: record.table_id, locale: 'de' }
            });

            if (enEntries.length > 0) {
                const enEntry = await strapi.documents('api::resistance-table.resistance-table').update({
                    documentId: "__TODO__",
                    data: { ...record, locale: 'en' }
                });
                response.push({ statusCode: 201, enEntry });

                if (deEntries.length === 0) {
                    const deEntry = await strapi.documents('api::resistance-table.resistance-table').create({
                        data: { ...record, locale: 'de', localizations: [enEntry.id] },
                    });
                    response.push({ statusCode: 201, deEntry });
                }
            } else {
                const enContent = await strapi.documents('api::resistance-table.resistance-table').create({
                    data: { ...record, locale: 'en' },
                });
                response.push({ statusCode: 201, enContent });

                const deContent = await strapi.documents('api::resistance-table.resistance-table').create({
                    data: { ...record, locale: 'de', localizations: [enContent.id] },
                });
                response.push({ statusCode: 201, deContent });
            }
        } catch (error) {
            console.error("Error saving record:", record, error);
            response.push({ statusCode: 500, error });
        }
    }

    return response;
}

async function importCutOffData(strapi) {
    const fs = require('fs');
    let path = require('path');
    let cutoffDataPath = path.join(__dirname, '../../../data/master-data/cutoff-data.xlsx');
    let cutoffDataResultPath = path.join(__dirname, '../../../data/master-data/cutoff-import-result.json');

    if (fs.existsSync(cutoffDataPath) && !fs.existsSync(cutoffDataResultPath)) {
        var begin = Date.now();

        const buffer = fs.readFileSync(cutoffDataPath);
        const dataFromExcel = xlsx.parse(buffer);
        console.log("Excel sheets parsed:", dataFromExcel.map(sheet => sheet.name));
        let dataList = [];

        antibiotics = await strapi.documents('api::antibiotic.antibiotic').findMany({
            fields: ['id', 'name']
        });

        dataFromExcel.forEach(sheet => {
            console.log("Processing sheet:", sheet.name);

            let res = readRecord(sheet.data);
            if (sheet.name == "EC") {
                dataList.push(prepareRecord(res, "Escherichia coli", "1"));
            }
            if (sheet.name == "SA") {
                dataList.push(prepareRecord(res, "Salmonella spp", "2"));
            }
            if (sheet.name == "CAj") {
                dataList.push(prepareRecord(res, "Campylobacter jejuni", "3a"));
            }
            if (sheet.name == "CAc") {
                dataList.push(prepareRecord(res, "Campylobacter coli", "3b"));
            }
            if (sheet.name == "MRSA") {
                dataList.push(prepareRecord(res, "methicillin-resistant Staphylococcus aureus", "4"));
            }
            if (sheet.name == "calis") {
                dataList.push(prepareRecord(res, "Enterococcus faecalis", "5a"));
            }
            if (sheet.name == "cium") {
                dataList.push(prepareRecord(res, "Enterococcus faecium", "5b"));
            }
        });

        saveResistanceRecord(dataList)
            .then(results => {
                let dataLog = {
                    "Total Records": dataList.length,
                    "Time Taken": "0",
                    "Successfully Saved": 0,
                    Failures: []
                };

                if (results) {
                    let failures = results.filter((result) => result.statusCode === 500);
                    let success = results.filter((result) => result.statusCode === 201);

                    dataLog["Successfully Saved"] = success.length;
                    dataLog.Failures = failures;
                    dataLog["Time Taken"] = (Date.now() - begin) / 1000 + "secs";
                }

                var stream = fs.createWriteStream(cutoffDataResultPath);
                stream.once('open', function (fd) {
                    stream.write(JSON.stringify(dataLog));
                    stream.end();
                });
            })
            .catch(e => {
                console.error("Error saving records:", e);
            });
    }
}

export {
    importCutOffData
};
