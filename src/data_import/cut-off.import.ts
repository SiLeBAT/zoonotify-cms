

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

    data[0].forEach((columnName) => {
        if (columnName) {
            if (!isNaN(Number(columnName))) {
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
        if (index > 0 && recLine.length > 0) {
            let newRec = Object.create(baseRec);

            recLine.forEach((columnData, colIndex) => {
                let colName = cols[colIndex];
                if (colName) {
                    const initialPart: string = colName.split('_')[0];
                    if (!isNaN(Number(initialPart)) && columnData) {
                        if (years.indexOf(initialPart) === -1) years.push(initialPart);
                    }
                    newRec[colName] = columnData;
                }
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

    let description = "Default Description";
    let title = "Default Title";

    let newEntry: ResistanceRecord = {
        table_id: tableId,
        description: description,
        title: title,
        cut_offs: []
    };

    let problematicAntibiotics = [];

    res.forEach((x) => {
        if (!x || !x.Wirkstoff) {
            console.error("Invalid data object:", x);
            return;
        }

        let item = antibiotics.find((item) => item["name"] === x.Wirkstoff);
        let antibioticId = item ? item.id : null;

        if (!item) {
            console.warn(`Unmatched antibiotic name: ${x.Wirkstoff} (proceeding with empty antibiotic ID)`);
            problematicAntibiotics.push(x.Wirkstoff);
        }

        x.years.forEach((year) => {
            let cutOffVal = x[year + "_cut-off"];
            let min = parseFloat(x[year + "_min"]);
            let max = parseFloat(x[year + "_max"]);

            if (isNaN(min) || isNaN(max)) {
                console.error(`Invalid numeric values for year ${year}:`, { min, max });
                problematicAntibiotics.push({ Wirkstoff: x.Wirkstoff, year, min, max });
                return;
            }

            let cutOff: CutOff = {
                year: parseInt(year),
                antibiotic: antibioticId ? [antibioticId] : [],
                substanzklasse: x.Substanzklasse || "",
                bacteria: bacteria,
                min: min,
                max: max,
                cutOff: cutOffVal ? cutOffVal.toString().replace('*', '') : "",
            };

            newEntry.cut_offs.push(cutOff);
        });
    });

    if (!newEntry.cut_offs.length) {
        console.error("Invalid entry generated for table_id:", tableId, newEntry);
        return null;
    }

    if (problematicAntibiotics.length > 0) {
        console.warn("Problematic antibiotics identified:", problematicAntibiotics);
    }

    return newEntry;
}

async function saveResistanceRecord(records: any[]) {
    const response = [];

    for (const record of records) {
        if (!record) {
            console.error("Skipping invalid record:", record);
            response.push({ statusCode: 400, error: "Invalid record (null)", table_id: "unknown" });
            continue;
        }

        try {
            // Fetch existing English entries
            const enEntries = await strapi.documents('api::resistance-table.resistance-table').findMany({
                fields: ['id', 'table_id', 'locale', 'documentId'],
                filters: { table_id: record.table_id, locale: 'en' }
            });
            console.log(`Found ${enEntries.length} English entries for table_id ${record.table_id}:`, enEntries);

            // Fetch existing German entries
            const deEntries = await strapi.documents('api::resistance-table.resistance-table').findMany({
                fields: ['id', 'table_id', 'locale', 'documentId'],
                filters: { table_id: record.table_id, locale: 'de' }
            });
            console.log(`Found ${deEntries.length} German entries for table_id ${record.table_id}:`, deEntries);

            let enEntry;
            // Handle English entry
            if (enEntries.length === 0) {
                const enData = {
                    table_id: record.table_id,
                    description: record.description,
                    title: record.title,
                    cut_offs: record.cut_offs,
                    publishedAt: new Date(),
                    locale: 'en'
                };
                console.log(`Creating English entry with data for table_id ${record.table_id}:`, enData);
                enEntry = await strapi.documents('api::resistance-table.resistance-table').create({
                    data: enData,
                });
                console.log(`Created English entry for table_id ${record.table_id}:`, enEntry);
                response.push({ statusCode: 201, entry: enEntry, locale: 'en', table_id: record.table_id });
            } else {
                enEntry = enEntries[0];
                console.log(`Using existing English entry for table_id ${record.table_id}:`, enEntry);
            }

            // Handle German entry
            if (deEntries.length === 0) {
                const deData = {
                    table_id: record.table_id,
                    description: record.description,
                    title: record.title,
                    cut_offs: record.cut_offs,
                    localizations: [enEntry.documentId],
                    publishedAt: new Date(),
                    locale: 'de'
                };
                console.log(`Creating German entry with data for table_id ${record.table_id}:`, deData);
                const deEntry = await strapi.documents('api::resistance-table.resistance-table').create({
                    data: deData,
                    locale: 'de' // Explicitly pass locale as a top-level parameter
                });
                console.log(`Created German entry for table_id ${record.table_id}:`, deEntry);
                response.push({ statusCode: 201, entry: deEntry, locale: 'de', table_id: record.table_id });
            } else {
                console.log(`German entry already exists for table_id ${record.table_id}, skipping creation:`, deEntries[0]);
            }
        } catch (error) {
            console.error("Error saving record for table_id:", record.table_id, error);
            response.push({ statusCode: 500, error: error.message || "Unknown error", table_id: record.table_id });
        }
    }

    return response;
}

async function importCutOffData(strapi) {
    const fs = require('fs');
    const path = require('path');
    const cutoffDataPath = path.join(__dirname, '../../../data/master-data/cutoff-data.xlsx');
    const cutoffDataResultPath = path.join(__dirname, '../../../data/master-data/cutoff-import-result.json');

    if (fs.existsSync(cutoffDataPath) && !fs.existsSync(cutoffDataResultPath)) {
        const begin = Date.now();

        const buffer = fs.readFileSync(cutoffDataPath);
        const dataFromExcel = xlsx.parse(buffer);
        console.log("Excel sheets parsed:", dataFromExcel.map(sheet => sheet.name));
        let dataList = [];

        antibiotics = await strapi.documents('api::antibiotic.antibiotic').findMany({
            fields: ['id', 'name']
        });
        console.log("Fetched antibiotics from Strapi:", antibiotics);

        dataFromExcel.forEach(sheet => {
            console.log("Processing sheet:", sheet.name);

            let res = readRecord(sheet.data);
            if (sheet.name === "EC") {
                dataList.push(prepareRecord(res, "Escherichia coli", "1"));
            }
            if (sheet.name === "SA") {
                dataList.push(prepareRecord(res, "Salmonella spp", "2"));
            }
            if (sheet.name === "CAj") {
                dataList.push(prepareRecord(res, "Campylobacter jejuni", "3a"));
            }
            if (sheet.name === "CAc") {
                dataList.push(prepareRecord(res, "Campylobacter coli", "3b"));
            }
            if (sheet.name === "MRSA") {
                dataList.push(prepareRecord(res, "methicillin-resistant Staphylococcus aureus", "4"));
            }
            if (sheet.name === "calis") {
                dataList.push(prepareRecord(res, "Enterococcus faecalis", "5a"));
            }
            if (sheet.name === "cium") {
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
                    let failures = results.filter((result) => result.statusCode !== 201);
                    let success = results.filter((result) => result.statusCode === 201);

                    dataLog["Successfully Saved"] = success.length;
                    dataLog.Failures = failures;
                    dataLog["Time Taken"] = (Date.now() - begin) / 1000 + "secs";

                    console.log("Successful saves:", success.map(s => ({
                        table_id: s.table_id,
                        locale: s.locale,
                        documentId: s.entry.documentId
                    })));
                }

                console.log("Import result:", dataLog);

                const stream = fs.createWriteStream(cutoffDataResultPath);
                stream.once('open', () => {
                    stream.write(JSON.stringify(dataLog));
                    stream.end();
                });
            })
            .catch(e => {
                console.error("Error saving records:", e);
            });
    }
}

export { importCutOffData };