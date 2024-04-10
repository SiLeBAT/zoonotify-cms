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

export { importPrevalenceData };
