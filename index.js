let Service, Characteristic;
const packageJson = require("./package.json");
const request = require("request");

const crypto = require("crypto");
const moment = require("moment");

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-solis5g-battery", "Solis5gBattery", Solis5G);
};

function Solis5G(log, config) {
  this.log = log;

  batteryValue = 100;

  // Don't load the plugin if these aren't accessible for any reason
  if (!log || !config) {
    return;
  }

  if (!config.solis_keyid || !config.solis_secret || !config.solis_stationId) {
    this.log.error("Missing Auth data for Solis (solis_keyid , solis_secret or solis_stationId)");
    return;
  }

  this.SOLIS_AUTH = {
    keyId: config.solis_keyid,
    secret: config.solis_secret,
    url: config.solis_url || "https://www.soliscloud.com:13333",
  };

  this.name = config.name;
  this.pollInterval = config.pollInterval || 300;
  this.solisStationId = config.solis_stationId;
  this.powerPW = config.powerPW;

  this.lowBatteryTreshold = config.lowBatteryTreshold;
  this.batteryLow = config.batteryLow;
  this.batteryHigh = config.batteryHigh;

  this.manufacturer = config.manufacturer || packageJson.author;
  this.serial = config.serial || "000-000-000-001";
  this.model = config.model || packageJson.name;
  this.firmware = config.firmware || packageJson.version;

  this.service = new Service.Fan(this.name);
  this.batteryService = new Service.BatteryService("Battery");

  if (this.batteryHigh) this.eventHighBattery = new Service.ContactSensor("HighBatteryEvent", "HighBattery");
  if (this.batteryLow) this.eventLowBattery = new Service.ContactSensor("LowBatteryEvent", "LowBattery");

  this.powerService = new Service.LightSensor("Power");

  this.log("Initialized");
}

Solis5G.prototype = {
  identify: function (callback) {
    this.log("Identify requested!");
    callback();
  },

  _httpRequest: function (url, body, method, headers, callback) {
    request(
      {
        url: url,
        body: body,
        method: method,
        headers: headers,
      },
      function (error, response, body) {
        callback(error, response, body);
      }
    );
  },

  _getStatus: function (callback) {
    this.log.debug(">> solis -> getData...");

    const resource = "/v1/api/stationDetailList";
    const body = `{"id":"${this.solisStationId}"}`;
    let md = crypto.createHash("md5").update(body).digest();
    const contentMd5 = Buffer.from(md).toString("base64");

    let date = moment().toDate().toUTCString();
    let payload = `POST\n${contentMd5}\napplication/json\n${date}\n${resource}`;
    let options = {
      secret: this.SOLIS_AUTH.secret,
      message: payload,
    };
    let sign = hmacSha1(options);

    const headers = {
      "Content-Type": "application/json",
      Authorization: `API ${this.SOLIS_AUTH.keyId}:${sign}`,
      Date: date,
      "Content-MD5": contentMd5,
    };

    this._httpRequest(
      this.SOLIS_AUTH.url + resource,
      body,
      "POST",
      headers,
      function (error, response, responseBody) {
        this.log.debug("<< solis <- response");
        if (error) {
          this.log.warn("Error getting status: %s", error.message);
          this.service.getCharacteristic(Characteristic.On).updateValue(new Error("Polling failed"));
          callback(error);
        } else {
          this.log.debug("Device response: %s", responseBody);
          try {
            if (response?.statusCode !== 200) {
              console.log(response.message);
              this.log.warn(`Error HTTP ${response.statusCode}`);
              callback();
              return;
            }
            const json = JSON.parse(responseBody);
            batteryValue = json.data.records[0].batteryPercent;
            const powerValue = json.data.records[0].power;

            this.service.getCharacteristic(Characteristic.On).updateValue(1);
            this.log.debug("Updated state to: %s", 1);

            this.service.getCharacteristic(Characteristic.RotationSpeed).updateValue(batteryValue);
            this.log.debug("Updated batteryPercent to: %s", batteryValue);

            // Update battery service
            this.batteryService.getCharacteristic(Characteristic.BatteryLevel).updateValue(batteryValue);

            if (this.lowBatteryTreshold) {
              this.batteryService.getCharacteristic(Characteristic.StatusLowBattery).updateValue(batteryValue < this.lowBatteryTreshold ? 1 : 0);
              if (batteryValue < this.lowBatteryTreshold) this.log("Low battery warning");
            }

            // Update Sensors events for High/Low Battery events (could be used during automations)
            if (batteryValue > this.batteryHigh && this.batteryHigh) this.eventHighBattery.getCharacteristic(Characteristic.ContactSensorState).updateValue(1);
            else if (batteryValue < this.batteryLow && this.batteryLow) this.eventLowBattery.getCharacteristic(Characteristic.ContactSensorState).updateValue(1);

            sleep(10 * 1000).then(() => {
              if (this.batteryHigh) this.eventHighBattery.getCharacteristic(Characteristic.ContactSensorState).updateValue(0);
              if (this.batteryLow) this.eventLowBattery.getCharacteristic(Characteristic.ContactSensorState).updateValue(0);
            });

            // Update Power device (LightSensor)
            if (this.powerPW) {
              let power = parseFloat(powerValue) * 1000;
              this.log.debug("current Power value (W):" + power);
              if (power === 0) power = 0.0001; // CurrentAmbientLightLevel cannot be 0
              this.powerService.getCharacteristic(Characteristic.CurrentAmbientLightLevel).updateValue(power);
            }

            callback();
          } catch (e) {
            this.log.warn("Error parsing status: %s", e.message);
          }
        }
      }.bind(this)
    );
  },

  getServices: function () {
    this.informationService = new Service.AccessoryInformation();
    this.informationService.setCharacteristic(Characteristic.Manufacturer, this.manufacturer).setCharacteristic(Characteristic.Model, this.model).setCharacteristic(Characteristic.SerialNumber, this.serial).setCharacteristic(Characteristic.FirmwareRevision, this.firmware);

    if (this.SOLIS_AUTH?.keyId && this.SOLIS_AUTH?.secret && this.solisStationId) {
      this._getStatus(function () {});
      setInterval(
        function () {
          this._getStatus(function () {});
        }.bind(this),
        this.pollInterval * 1000
      );
    }

    return [this.informationService, this.powerPW ? this.powerService : null, this.service, this.batteryService, this.batteryHigh ? this.eventHighBattery : null, this.batteryLow ? this.eventLowBattery : null];
  },
};

function hmacSha1(options) {
  return crypto.createHmac("sha1", options.secret).update(options.message).digest("base64");
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
