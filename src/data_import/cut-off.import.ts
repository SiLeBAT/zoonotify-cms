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
    return dataList;
}

function prepareRecord(res, bacteria, tableId) {
    let descriptionObj = res.pop();
    let titleObj = res.pop();

    let newEntry: ResistanceRecord = {
        table_id: tableId,
        description: descriptionObj.Substanzklasse,
        title: titleObj.Substanzklasse,
        cut_offs: []
    }

    res.forEach(x => {
        var item = antibiotics.find(item => item["name"] == x.Wirkstoff);
        var antibioticId = null;
        if (item) {
            antibioticId = item.id;
        }


        x.years.forEach(year => {
            var cutOffVal = x[year + "_cut-off"];
            let cutOff: CutOff = {
                year: year,
                antibiotic: [antibioticId],
                substanzklasse: x.Substanzklasse,
                bacteria: bacteria,
                min: x[year + "_min"],
                max: x[year + "_max"],
                cutOff: cutOffVal.toString()
            };
            newEntry.cut_offs.push(cutOff);
        });

    });

    return newEntry;
}

async function saveResistanceRecord(records: any[]) {
    const response = [];

    for (const record of records) {
        try {
            const entries = await strapi.entityService.findMany('api::resistance-table.resistance-table', {
                fields: ['id', 'table_id'],
                filters: { table_id: record.table_id }
            });

            if (entries && entries.length > 0) {
                const entry = await strapi.entityService.update('api::resistance-table.resistance-table', entries[0].id, {
                    data: { ...record.cut_offs },
                });
                response.push({ statusCode: 201, entry });
            } else {
                const contents = await strapi.entityService.create('api::resistance-table.resistance-table', {
                    data: record
                });
                response.push({ statusCode: 201, contents });
            }

        } catch (error) {
            response.push({ statusCode: 500, error });
        }

    }

    return response;
}

async function importCutOffData(strapi) {
    const fs = require('fs');
    let path = require('path');
    let cutoffDataPath = path.join(__dirname, '../../data/cutoff-data.xlsx');
    let cutoffDataResultPath = path.join(__dirname, '../../data/cutoff-import-result.json');

    if (fs.existsSync(cutoffDataPath) && !fs.existsSync(cutoffDataResultPath)) {
        var begin = Date.now();

        const buffer = fs.readFileSync(cutoffDataPath);
        const dataFromExcel = xlsx.parse(buffer);
        console.log(dataFromExcel);
        let dataList = [];

        antibiotics = await strapi.entityService.findMany('api::antibiotic.antibiotic', {
            fields: ['id', 'name']
        });

        dataFromExcel.forEach(sheet => {

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
            if (sheet.name == "E. faecalis") {
                dataList.push(prepareRecord(res, "Enterococcus faecalis", "5a"));
            }
            if (sheet.name == "E. faecium") {
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
                }

                if (results) {
                    let failures = results.filter((result) => {
                        return result.statusCode == 500;
                    });

                    let success = results.filter((result) => {
                        return result.statusCode == 201;
                    });

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
            });

    }
}

export {
    importCutOffData
};
