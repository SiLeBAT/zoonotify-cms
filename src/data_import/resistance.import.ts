
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

export {
    importResistanceData
};
