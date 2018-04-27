# seshat
Collection of scripts to calculate personal life stats (this repo is unlikely to be useful to someone else).

Basic approach is connecting to influxDB and calculating aggregate stats based on more atomic datapoints.

Using this as an oppportunity to get more exposure to Typescript.

**Seshat?**
[Seshat](https://en.wikipedia.org/wiki/Seshat) was the ancient Egyptian goddess of wisdom, knowledge and writing;
also known as a scribe and record keeper.

## dist/duration.js

Simple script that calculates how long a given measurement was in a given state. Optionally writes duration info back to timeseries.

```bash
export INFLUX_USER="$(vault-get 'influxdb_homeassistant_user')"
export INFLUX_PASSWORD="$(vault-get 'influxdb_homeassistant_password')"
export INFLUX_HOST="<INFLUX DB HOST>"



# Determine how much TV I've watched in last day (last day = default time-frame)
node dist/duration.js -k --measurement device_tracker.samsungtv --state home --username "$INFLUX_USER" --password "$INFLUX_PASSWORD" --host "$INFLUX_HOST" --database homeassistant

# Determine how much TV I've watched in last week (using --start-time)
node dist/duration.js -k --measurement device_tracker.samsungtv --state home --username "$INFLUX_USER" --password "$INFLUX_PASSWORD" --host "$INFLUX_HOST" --database homeassistant  --start-time $(date -v "-1w" +%s)

# Note on the date command:
# mac: date -v "-1w" +%s
# linux: date --date "1 week ago" +%s

# Write results back to DB using --write-duration
node dist/duration.js -k --measurement device_tracker.samsungtv --state home --username "$INFLUX_USER" --password "$INFLUX_PASSWORD" --host "$INFLUX_HOST" --database homeassistant  --start-time $(date -v "-1w" +%s)  --write-duration
```
