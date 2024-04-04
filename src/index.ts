import xlsx from 'node-xlsx';

let antibiotics;
export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {
    if (strapi.plugin('documentation')) {
      const override = {
        info: { version: '2.1.0' },
        paths: {
          "/evaluations": {
            "get": {
              "responses": {
                "200": {
                  "description": "OK",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/EvaluationListResponse"
                      }
                    }
                  }
                },
                "400": {
                  "description": "Bad Request",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "401": {
                  "description": "Unauthorized",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "403": {
                  "description": "Forbidden",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "404": {
                  "description": "Not Found",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "500": {
                  "description": "Internal Server Error",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                }
              },
              "tags": [
                "Evaluation"
              ],
              "parameters": [
                {
                  "name": "sort",
                  "in": "query",
                  "description": "Sort by attributes ascending (asc) or descending (desc)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "string"
                  }
                },
                {
                  "name": "pagination[withCount]",
                  "in": "query",
                  "description": "Return page/pageSize (default: true)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "boolean"
                  }
                },
                {
                  "name": "pagination[page]",
                  "in": "query",
                  "description": "Page number (default: 0)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "integer"
                  }
                },
                {
                  "name": "pagination[pageSize]",
                  "in": "query",
                  "description": "Page size (default: 25)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "integer"
                  }
                },
                {
                  "name": "pagination[start]",
                  "in": "query",
                  "description": "Offset value (default: 0)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "integer"
                  }
                },
                {
                  "name": "pagination[limit]",
                  "in": "query",
                  "description": "Number of entities to return (default: 25)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "integer"
                  }
                },
                {
                  "name": "fields",
                  "in": "query",
                  "description": "Fields to return (ex: title,author)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "string"
                  }
                },
                {
                  "name": "populate",
                  "in": "query",
                  "description": "Relations to return",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "string"
                  }
                },
                {
                  "name": "filters",
                  "in": "query",
                  "description": "Filters to apply",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "object"
                  },
                  "style": "deepObject"
                },
                {
                  "name": "locale",
                  "in": "query",
                  "description": "Locale to apply",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "string"
                  }
                }
              ],
              "operationId": "get/evaluations"
            }
          },
          "/evaluations/{id}": {
            "get": {
              "responses": {
                "200": {
                  "description": "OK",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/EvaluationResponse"
                      }
                    }
                  }
                },
                "400": {
                  "description": "Bad Request",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "401": {
                  "description": "Unauthorized",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "403": {
                  "description": "Forbidden",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "404": {
                  "description": "Not Found",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "500": {
                  "description": "Internal Server Error",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                }
              },
              "tags": [
                "Evaluation"
              ],
              "parameters": [
                {
                  "name": "id",
                  "in": "path",
                  "description": "",
                  "deprecated": false,
                  "required": true,
                  "schema": {
                    "type": "number"
                  }
                }
              ],
              "operationId": "get/evaluations/{id}"
            }
          },
          "/evaluations/{id}/localizations": {
          },
          "/welcome": {
            "get": {
              "responses": {
                "200": {
                  "description": "OK",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/WelcomeResponse"
                      }
                    }
                  }
                },
                "400": {
                  "description": "Bad Request",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "401": {
                  "description": "Unauthorized",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "403": {
                  "description": "Forbidden",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "404": {
                  "description": "Not Found",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                },
                "500": {
                  "description": "Internal Server Error",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/Error"
                      }
                    }
                  }
                }
              },
              "tags": [
                "Welcome"
              ],
              "parameters": [
                {
                  "name": "sort",
                  "in": "query",
                  "description": "Sort by attributes ascending (asc) or descending (desc)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "string"
                  }
                },
                {
                  "name": "pagination[withCount]",
                  "in": "query",
                  "description": "Return page/pageSize (default: true)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "boolean"
                  }
                },
                {
                  "name": "pagination[page]",
                  "in": "query",
                  "description": "Page number (default: 0)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "integer"
                  }
                },
                {
                  "name": "pagination[pageSize]",
                  "in": "query",
                  "description": "Page size (default: 25)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "integer"
                  }
                },
                {
                  "name": "pagination[start]",
                  "in": "query",
                  "description": "Offset value (default: 0)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "integer"
                  }
                },
                {
                  "name": "pagination[limit]",
                  "in": "query",
                  "description": "Number of entities to return (default: 25)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "integer"
                  }
                },
                {
                  "name": "fields",
                  "in": "query",
                  "description": "Fields to return (ex: title,author)",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "string"
                  }
                },
                {
                  "name": "populate",
                  "in": "query",
                  "description": "Relations to return",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "string"
                  }
                },
                {
                  "name": "filters",
                  "in": "query",
                  "description": "Filters to apply",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "object"
                  },
                  "style": "deepObject"
                },
                {
                  "name": "locale",
                  "in": "query",
                  "description": "Locale to apply",
                  "deprecated": false,
                  "required": false,
                  "schema": {
                    "type": "string"
                  }
                }
              ],
              "operationId": "get/welcome"
            },
          },
          "/welcome/localizations": {
          }
        }
      }

      strapi
        .plugin('documentation')
        .service('override')
        .registerOverride(override, {
          excludeFromGeneration: [
            "antibiotic",
            "isolate",
            "matrix",
            "microorganism",
            "salmonella",
            "animal-species-food-category",
            "animal-species-production-type-food",
            "configuration",
            "controlled-vocabulary",
            "data-protection-declaration",
            "evaluation-information",
            "explanation",
            "externallink",
            "matrix-detail",
            "prevalence",
            "resistance-table",
            "sample-type",
            "sampling-context",
            "sampling-stage",]
        });
    }

  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    // Import data for LD
    await importResistanceData(strapi);

    // Import data for yearly cutt-off
    await importCutOffData(strapi);

    // Import data for prevalence
    await importPrevalenceData(strapi);

    // Add this line to call your new import function
    await importControlledVocabularyTranslations(strapi);

  }

};

async function importResistanceData(strapi) {
  const fs = require('fs');
  let path = require('path');
  let filePath = path.join(__dirname, '../../data/resistance-data.xlsx');
  let outFilePath = path.join(__dirname, '../../data/resistance-data-import-result.json');

  if (fs.existsSync(filePath) && !fs.existsSync(outFilePath)) {
    var begin = Date.now();

    let ctx = {
      request: {
        files: {
          file: {
            path: filePath
          }
        }
      }
    };

    const data = await strapi
      .service("api::isolate.isolate")
      .import(ctx);

    fs.unlink(filePath, function (err) {

    });

    let dataLog = {
      "Total Records": data.length,
      "Time Taken": "0",
      "Successfully Saved": 0,
      Failures: []
    }

    if (data) {
      let failures = data.filter((result) => {
        return result.statusCode == 500;
      });

      let success = data.filter((result) => {
        return result.statusCode == 200;
      });

      dataLog["Successfully Saved"] = success.length;
      dataLog.Failures = failures;
      dataLog["Time Taken"] = (Date.now() - begin) / 1000 + "secs";
    }

    var stream = fs.createWriteStream(outFilePath);
    stream.once('open', function (fd) {
      stream.write(JSON.stringify(dataLog));
      stream.end();
    });

  }
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

async function importPrevalenceData(strapi) {
  const fs = require('fs');
  let path = require('path');
  let prevalenceDataPath = path.join(__dirname, '../../data/prevalence-data.xlsx');
  let prevalenceDataResultPath = path.join(__dirname, '../../data/prevalence-import-result.json');

  if (fs.existsSync(prevalenceDataPath) && !fs.existsSync(prevalenceDataResultPath)) {
    var begin = Date.now();

    const data = await strapi
      .service("api::prevalence.prevalence")
      .import(prevalenceDataPath);

    fs.unlink(prevalenceDataPath, function (err) {

    });

    let dataLog = {
      "Total Records": data.length,
      "Time Taken": "0",
      "Successfully Saved": 0,
      Failures: []
    }

    if (data) {
      let failures = data.filter((result) => {
        return result.statusCode == 500;
      });

      let success = data.filter((result) => {
        return result.statusCode == 200;
      });

      dataLog["Successfully Saved"] = success.length;
      dataLog.Failures = failures;
      dataLog["Time Taken"] = (Date.now() - begin) / 1000 + "secs";
    }

    var stream = fs.createWriteStream(prevalenceDataResultPath);
    stream.once('open', function (fd) {
      stream.write(JSON.stringify(dataLog));
      stream.end();
    });

  }
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
async function importControlledVocabularyTranslations(strapi) {
  const fs = require('fs');
  const path = require('path');

  let filePath = path.join(__dirname, '../../data//master-data/ZooNotify_DB_translation .xlsx');

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