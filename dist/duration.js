const Influx = require('influx');
const moment = require("moment");
const momentDurationFormatSetup = require("moment-duration-format");
const cli = require('commander');
cli
    .version('0.1.0')
    .option('-m, --measurement <s>', 'Measurement to calculate duration for')
    .option('-s, --state <s>', 'State to calculate duration for')
    .option('-u, --username <s>', 'Username to connect to DB')
    .option('-p, --password <s>', 'Password to connect to DB')
    .option('-d, --database <s>', 'Name of database to connect to')
    .option('-h, --host <s>', 'Host to connect to')
    .option('-P, --port <n>', 'Port to connect to [8086]', 8086)
    .option('--protocol [protocol]', 'Protocol to use to connect to host [https]', 'https')
    .option('-k, --insecure', 'Enable insecure mode for SSL/TLS')
    .option('-w, --write-duration', 'Write duration back to timeseries')
    .option('--start-time <n>', 'Start time (in sec) of the data to retrieve [last 24hrs]', moment().add(-24, 'hours').unix())
    .parse(process.argv);
const requiredArgs = ['measurement', 'state', 'username', 'password', 'database', 'host'];
for (arg of requiredArgs) {
    if (!(arg in cli)) {
        console.error(`--${arg} is required`);
        process.exit(1);
    }
}
const measurement = cli.measurement;
const filteredState = cli.state;
const connectionDetails = {
    username: cli.username,
    password: cli.password,
    database: cli.database,
    host: cli.host,
    port: cli.port,
    protocol: cli.protocol,
    options: {
        rejectUnauthorized: (cli.insecure !== true)
    }
};
const influx = new Influx.InfluxDB(connectionDetails);
// let d = moment().add(-1, 'days').startOf('day'); // last midnight
// 3600000000000 -> nanoseconds per hour
let [domain, entity_id] = measurement.split(".");
const query = `SELECT * FROM "${measurement}" WHERE time >= ${cli.startTime}s`;
console.log(query);
influx.query(query).then(results => {
    let updatedPoints = [];
    for (let i = 0; i < results.length - 1; i++) {
        let item = results[i];
        let nextItem = results[i + 1];
        item.duration = nextItem.time.getNanoTime() - item.time.getNanoTime();
        // If we're writing points back to the DB, then create a copy of the datapoint (which now includes duration)
        // Note that there's no UPDATE operation in InfluxDB. Updating is done by writing to the points with the same timestamp.
        if (cli.writeDuration) {
            let updatedFields = Object.assign({}, item); // fancy ES6 way of copying an object
            // Delete some attributes we don't want
            // These are returned by the query but you can't feed them back into writePoints
            delete updatedFields.time;
            delete updatedFields.domain;
            delete updatedFields.entity_id;
            // Create a datapoint we can write to the DB
            updatedPoints.push({
                measurement: measurement,
                tags: { domain: domain, entity_id: entity_id },
                fields: updatedFields,
                timestamp: item.time.getNanoTime(),
            });
        }
    }
    // write points to DB.
    if (cli.writeDuration) {
        console.log("Writing points back to DB...");
        influx.writePoints(updatedPoints);
    }
    // Output total duration to the console
    let filteredResults = results.filter(item => item.state === filteredState);
    // Let's use a fancy reducer instead of a for loop to sum up the durations - because we can!
    let totalDuration = filteredResults.reduce((item1, item2) => item1 + item2.duration, 0 /* first value = 0 */);
    // totalDuration is in nanosecs which moment.js can't deal with -> divide by 1e6 to get to millisecs
    let humanizedDuration = moment.duration(totalDuration / 1e6, "milliseconds").format("h [hrs], m [min]");
    console.log(`DURATION: ${totalDuration} msec (${humanizedDuration})`);
});
